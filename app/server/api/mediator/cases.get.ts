// Mediator console: assigned, activated cases with due dates (§8.6).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['mediator'] })
  return db()`
    select d.id, d.status, d.trigger, d.scope, d.disputed_amount, d.mediator_activated_at, d.mediator_due_at, d.advice_notice_at,
           c.id as contract_id, c.currency, c.snapshot->'job'->>'title' as title
      from dispute_cases d join contracts c on c.id = d.contract_id
     where c.mediator_id = ${user.id} and d.mediator_activated_at is not null
     order by (d.status in ('settled','withdrawn')), d.mediator_due_at nulls last`
})
