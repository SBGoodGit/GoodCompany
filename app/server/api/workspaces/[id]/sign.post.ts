// Sign the contract preview (§5.3). Requires step-up authentication. Each signature is an
// attestation on the SHA-256 hash of the frozen snapshot. Once both parties have signed the same
// hash: Contract (awaiting_funding) + milestones are created, Job.selected_contractor_id is set
// atomically (race guard §9.3), and all other open workspaces on the job close with
// outcome closed_other_selected; their candidates hear the job was awarded, without the terms.
// No EscrowAccount is created here; that is done by the `fund` ledger action (session 2).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const b = await readBody<{ snapshot_hash?: string; override_multi_candidate?: boolean }>(event)
  const sql = db()
  const [peek] = await sql`select job_id from negotiation_workspaces where id = ${id}`
  if (!peek) bad('Workspace not found', 404)

  return sql.begin(async (tx) => {
    // Lock order: job, then workspace (avoids deadlocks between candidates signing at once).
    const [job] = await tx`select * from jobs where id = ${peek.job_id} for update`
    const { ws, party } = await loadWorkspace(tx, id, user.id, { lock: true })
    requireStage(ws, 'contract_preview')
    const nested = !!ws.parent_contract_id
    if (nested) {
      // §4.5: a nested contract can be signed only after the payout or a part-payment of the first contract.
      const [parent] = await tx`select status from contracts where id = ${ws.parent_contract_id}`
      // Part-payment of the final delivery: an objection in part, or a repair agreement on the final request.
      const [partPaid] = await tx`
        select 1 from dispute_cases d join completion_requests r on r.id = d.completion_request_id
         where d.contract_id = ${ws.parent_contract_id} and r.is_final and r.repair_agreement_id is null
           and (d.scope = 'request_partial' or exists (select 1 from repair_agreements a where a.dispute_case_id = d.id))`
      if (!['completed', 'closed', 'ended_unfinished'].includes(parent.status) && !partPaid) {
        bad('The linked contract can be signed once the first contract has been paid out, at least in part (§4.5)', 409)
      }
    } else {
      if (job.selected_contractor_id) bad('This job has already been awarded', 409)
      if (job.status === 'closed') bad('This job is closed')
    }

    const preview = await buildContractPreview(tx, ws)
    if (!preview) bad('The contract preview is not complete')
    if (b.snapshot_hash !== preview.hash) bad('The contract changed since you opened it. Reload and review it again.', 409)

    if (party === 'client' && !nested) {
      const settings = await getSettings(tx)
      const rule = settings.multi_candidate_threshold
      if (job.indicative_budget !== null && job.indicative_budget >= rule.amount) {
        const [{ count }] = await tx`select count(*)::int as count from negotiation_workspaces where job_id = ${job.id} and reached_beyond_introduction`
        if (count < rule.candidates) {
          if (!b.override_multi_candidate) {
            throw createError({
              statusCode: 409,
              statusMessage: `GoodCompany's fairness standard asks for at least ${rule.candidates} candidates on jobs of this size; you have ${count}.`,
              data: { multi_candidate: { count, required: rule.candidates } },
            })
          }
          await audit(tx, { event_type: 'multi_candidate_override', actor_id: user.id, workspace_id: ws.id, payload: { count, required: rule.candidates } })
        }
      }
    }

    const grantId = await consumeStepUp(event, tx, user.id)
    const inserted = await tx`
      insert into attestations (user_id, subject_type, subject_id, payload_hash, step_up_grant_id)
      values (${user.id}, 'contract_signature', ${ws.id}, ${preview.hash}, ${grantId})
      on conflict do nothing returning id`
    if (!inserted.length) bad('You have already signed this contract')
    await audit(tx, { event_type: 'contract_signed_by_party', actor_id: user.id, workspace_id: ws.id, payload: { party, snapshot_hash: preview.hash } })

    const other = otherParty(ws, party)
    const [otherSig] = await tx`select id from attestations where user_id = ${other} and subject_type = 'contract_signature'
                                  and subject_id = ${ws.id} and payload_hash = ${preview.hash}`
    if (!otherSig) {
      await touch(tx, ws.id)
      await notify(tx, { user_id: other, type: 'contract_signature', title: 'The other party signed the contract', body: 'Review and sign to conclude it.', link: `/workspaces/${ws.id}` })
      return { status: 'awaiting_other_party' }
    }

    // Both signed: award atomically (not for a nested contract: the job was already awarded).
    if (!nested) {
      const awarded = await tx`update jobs set selected_contractor_id = ${ws.contractor_id}
                                where id = ${job.id} and selected_contractor_id is null returning id`
      if (!awarded.length) bad('This job has already been awarded', 409)
    }
    const s = preview.snapshot
    const [contract] = await tx`
      insert into contracts (workspace_id, job_id, client_id, contractor_id, parent_contract_id, terms_version_id, quote_id, snapshot,
                             snapshot_hash, mediator_id, currency, status)
      values (${ws.id}, ${job.id}, ${ws.client_id}, ${ws.contractor_id}, ${ws.parent_contract_id}, ${preview.terms.id}, ${preview.quote.id},
              ${tx.json(s as never)}, ${preview.hash}, ${s.mediator.id}, ${s.quote.currency}, 'awaiting_funding')
      returning *`
    for (const m of s.milestones) {
      await tx`insert into milestones (contract_id, sequence, kind, description, amount, evidence_required)
               values (${contract.id}, ${m.sequence}, ${m.kind}, ${m.description}, ${m.amount}, ${m.evidence_required})`
    }
    await tx`update negotiation_workspaces set stage = 'closed', outcome = 'accepted', closed_at = now(), last_activity_at = now() where id = ${ws.id}`
    const siblings = nested ? [] : await tx`
      update negotiation_workspaces set stage = 'closed', outcome = 'closed_other_selected', closed_at = now()
       where job_id = ${job.id} and id <> ${ws.id} and outcome = 'pending' and parent_contract_id is null
      returning id, contractor_id`
    for (const sib of siblings) {
      await audit(tx, { event_type: 'workspace_closed_other_selected', actor_id: null, workspace_id: sib.id, payload: {} })
      await notify(tx, { user_id: sib.contractor_id, type: 'job_awarded_elsewhere', title: `"${job.title}" has been awarded to another contractor`, body: 'This workspace is now closed. Thank you for your time.', link: `/workspaces/${sib.id}` })
    }
    await audit(tx, { event_type: 'contract_created', actor_id: user.id, contract_id: contract.id, workspace_id: ws.id,
                      payload: { snapshot_hash: preview.hash, status: 'awaiting_funding', closed_sibling_workspaces: siblings.length } })
    for (const uid of [ws.client_id, ws.contractor_id]) {
      await notify(tx, { user_id: uid, type: 'contract_signed', title: `Contract signed: ${job.title}`, body: 'The contract awaits funding by the client.', link: `/contracts/${contract.id}` })
    }
    return { status: 'contract_created', contract_id: contract.id }
  })
})
