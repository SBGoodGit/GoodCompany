# Session log

## Session 1 — 17 November 2026

**Built (parts 1–4 of assignment §6):**

1. **Data model and migrations, row-level security** — complete §3 model in `supabase/migrations/` (identity, contacts, jobs, workspace, contracts, escrow, disputes, Community Bank, notifications, settings). RLS on every table, deny-all for anon/authenticated; server role `gc_app`; append-only enforced by privileges and triggers; §12 configuration values seeded.
2. **Accounts** — email sign-up with verification (Supabase Auth, local Mailpit), `identity_level()` interface, profiles with expertise and portfolio, public profile with Rookie Stage rule, step-up re-authentication with single-use grants, admin role, Mediator account creation and default/per-workspace Mediator assignment.
3. **Marketplace** — post job, search (expertise filter default on; budget never returned to contractors and not filterable), job detail for client and contractor, job status management, contacts with groups, auto-linking and private collaboration preference.
4. **Negotiation Workspace** — five-stage stepper, chat, technical intake (library + custom questions), terms editor with version history (warranty 0/15/30/90, fixed 10% holdback, phases with kind, materials budget %, execution period, Mediator, mandatory clauses), quote builder with live breakdown, contract preview with SHA-256 snapshot, signing by both parties with step-up, contract creation (`awaiting_funding`) with milestones, atomic award, sibling workspaces closed (`closed_other_selected`) with notice, multi-candidate soft warning, withdraw/reject, audit trail.

**Tests:** 30 Vitest tests (money and rounding incl. the §7.1 split, terms validation, budget hiding, canonical hashing, append-only and RLS at database level) and 2 Playwright flows (sign-up requires email verification; job → workspace → terms → quote → both sign → contract awaiting funding, with a rival candidate closed out). All pass.

**Unfinished / notes for the next session:**

- The assignment's first step `git restore showcase/index.html && git pull` was blocked during the build; it was run afterwards on Sander's instruction, and `mvp1` was rebased onto the updated `main` (f4a7339). All tests passed after the rebase.
- Contract detail shows the frozen contract, milestones and audit trail; it has no funding or escrow view yet.
- Notifications are stored and listed on the dashboard; the notification centre, full admin settings UI and system jobs (workspace inactivity, contact reconciliation, etc.) belong to session 3.

**Session 2 starts with:** part 5 — `EscrowLedger` interface and `SimulatedLedger` (tables `escrow_accounts`, `escrow_actions`, `ledger_entries`, `simulated_balances` already exist), action preparation and signing via `attestations` + `consumeStepUp` (`server/utils/auth.ts`), then the `fund` action from the contract page (`pages/contracts/[id].vue`). Simulated balances need an admin/seed function to create them (§2.2).

## Session 2 — 17 November 2026

**Built (parts 5–8 of assignment §6):**

5. **`EscrowLedger` interface and `SimulatedLedger`** — pure rules in `server/ledger/core.ts`, persistence in `server/ledger/simulated.ts`. Action preparation with hash, summary and required signers; signing with step-up attestations; all-or-nothing application; expiry after 72 h; ledger entries; simulated balances (seed + admin), collect-wallet items.
6. **Path 1** — fund, advance claim, supplier payments (contractor alone, verified supplier, client notified without amount), `materials_ordered` status, completion requests with evidence, information request/response, approval (milestone and final), final payout with unspent materials as labour income, fee to the collect-wallet in one go, client surplus settlement, holdback tranches (0/15/30/90), Change Orders (positive with deposit, negative to client surplus, rejection with reason, withdrawal, expiry, conversation), mutual settlement with the P1/P7 fee rule, Mediator replacement.
7. **Repair agreements and nested contracts** — release-all-but-held, repair request with its own window and deadline; linked contracts that can be signed only after (part-)payment of the first.
8. **Path 2 and Mediator console** — objection (full, in part, warranty), settlement (split or withdrawal), Mediator activation by either party, triggers (b) and (c) as idempotent system checks (admin-run for now), escalate; Mediator console with case list and deadlines, case file, silence finding, proposal, extension, 48-hour advice notice and non-binding advice; admin: simulated balances, contract Mediator assignment, trigger run.

UI: contract page with escrow overview (labelled simulated), signing dialog with the ledger's summary, milestone tracker, response screen (approve / object / object in part / ask for information) with countdown, tranche claims, supplier payments, Change Order flow with conversation, case page for the parties, Mediator console.

**Tests:** 62 Vitest (32 ledger tests including the §7.1 example as an exact assertion: contractor 7,200.00, suppliers 2,600.00, fee 200.00) and 8 Playwright tests: Path 1 through the UI with the §7.1 numbers, Path 2 (objection → Mediator → advice after notice → settlement), trigger (b), Change Orders, repair + nested contract, mutual settlement, plus the session 1 flows. All pass.

**Unfinished / notes for session 3:**

- Trigger checks, Change Order expiry, action expiry and the other §10 jobs are not scheduled yet: `runTriggerChecks()` exists and runs from the admin page; expiry is enforced when someone tries to sign. Session 3 (part 12) schedules them.
- The final `approve` does not yet set `FinalEvaluation`, generate invoices or open reviews (part 9).
- Fee batches to the Community Bank (part 10) read `fee_collection_items` where `fee_batch_id is null`.
- The dashboard shows notifications as a plain list; deadlines of open requests and cases are on the contract and case pages, not yet on the dashboard (part 11).

**Session 3 starts with:** part 9 — FinalEvaluation, invoices and fee statement on final approval (hook into `finalize` results in `server/utils/escrow.ts → signAction`, action type `approve`/`settle`), reviews and reputation; then parts 10–12.

## Session 3 — 17 November 2026

**Built (parts 9–12 of assignment §6):**

9. **Final evaluation, invoices, reviews, reputation** — completion hook on every path that completes a contract; FinalEvaluation; invoice pair at 100% plus a separate fee statement, sequential stable references; discrepancy notes; reviews with mandatory motivation ≤ 3; contractor score with reliability factor and Rookie Stage; warranty metrics on profiles.
10. **Community Bank** — fee aggregation into batches split over the reserves (organisation 1%), public batch list; loan applications with derived interest, sampled invitations, voting and resolution with reserve checks, SubEscrow released to the supplier with invoices, early/partial repayment, manual default, Community Health Score, admin reserve seed.
11. **Notifications, dashboard, admin** — notification page and badge; dashboard with deadlines and Community Bank snapshot; admin editing of all §12 values (holdback fixed), jobs, loans, reserves, balances, Mediators.
12. **System jobs** — 5-minute scheduler with per-job intervals for all §10 jobs plus escrow action expiry; idempotent, logged in `job_runs`.

**Tests:** 75 Vitest + 12 Playwright, all passing (details in `BUILD_REPORT.md` §4). Production build succeeds.

**Unfinished:** nothing from parts 1–12 of the assignment. What the spec leaves out or open is listed in `BUILD_REPORT.md` §2.

**Next:** Sander reviews `BUILD_REPORT.md` and decides on push/merge of branch `mvp1`.

## Corrections — 17 November 2026

On Build Spec v3.008 / Decision Log v1.012 (D27), copied into `docs/spec/`. Choices in `BUILD_NOTES.md` 82–85.

1. **Holdback always 10%** — `min(…)` removed from the ledger; final phase ≥ 10% in terms validation, editor and Change Orders; holdback rounded down to the cent.
2. **Contractor can open a dispute** — `object` signed by the objecting party; the contractor disputes the whole amount of one of their open requests; contract page option.
3. **Administrative check before a loan vote (OD5)** — statuses `admin_check` and `returned`, migration `20261120000001_corrections.sql`, admin check route and admin page section; voting and invitations start on approval.

**Tests:** 82 Vitest (new: final phase ≥ 10%, holdback rounding, full holdback at a 10% final phase, Change Order guard, contractor objection) + 13 Playwright (new: OD5 return/approve through the admin page; the loan cycle test now passes the check). The §7.1 example still passes exactly. All pass.

**Next:** Sander reviews; push/merge of `mvp1` only on his instruction.

## Round 2 — 18 November 2026

Built to `GoodCompany_ClaudeCode_Opdracht_MVP1_Ronde2.md` (D28). Choices in `BUILD_NOTES.md` 86–97.

- **A.** Only the contractor proposes terms; the client accepts (with the commitment warning), rejects, or asks for a revision with a comment; client constraints per workspace.
- **B.** Two-way intake; mandatory budget range from the client, visible in that workspace only.
- **C.** Itemised quote: scope of work, sections and lines; phase amounts, materials budget and fee line derived (`shared/estimate.ts`); final phase ≥ 10%; detail level per quote; completion requests show their phase's lines. Ledger unchanged.
- **E.** Candidate limits (3 past the introduction, 2 swaps, no swap after the quote stage) replace the multi-candidate warning; settings in the admin layer.
- **F.** Pause new applicants, conversation overview and switching, private client notes.
- Migration `20261121000001_round2.sql`.

**Tests:** 87 Vitest + 13 Playwright, all passing; the §7.1 example also passes built through an itemised estimate. `npm run build` succeeds.

**Note:** the decision log in `specs/` is still v1.012 and does not yet contain D28; the copy in `docs/spec/` is therefore unchanged. The proposal on disk is v0.203, not v0.204.

**Next:** Sander reviews; push/merge of `mvp1` only on his instruction.

