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
