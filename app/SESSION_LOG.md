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
