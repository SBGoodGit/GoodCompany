# Build notes — implementation choices

Where Build Spec v3.007 leaves a detail open, the simplest option that satisfies the spec was taken and recorded here (assignment §8). Each entry: what, where, why.

## Session 1

### Architecture and data access

1. **Nuxt in SPA mode; all data through the Nuxt server API.** `nuxt.config.ts` (`ssr: false`). The browser uses Supabase only for sign-up, sign-in and email verification. Every data request goes to `/api/*` with the user's access token, and the server authorises each request in code (`server/utils/auth.ts → requireUser`). Why: one place for authorisation rules (budget hiding, party checks, roles), and server-rendered auth adds complexity MVP1 doesn't need.
2. **Row-level security: enabled and forced on every table, with no policies for `anon` / `authenticated`, and all table privileges revoked from those roles.** Migration 2. Why: the anon key is public in the browser, so without RLS anyone could read every table through PostgREST. Because the browser never reads tables directly, deny-all is the simplest correct policy set. Tested in `tests/db/security.test.ts`.
3. **Server runs as a restricted role `gc_app`.** `server/utils/db.ts` connects with `-c role=gc_app`. `gc_app` has `BYPASSRLS` (it is the authorising API) but no `UPDATE/DELETE/TRUNCATE` on append-only tables. Uses `postgres` (postgres.js) instead of supabase-js so that multi-step actions (signing, awarding) run in one SQL transaction.
4. **Append-only enforced twice:** privileges revoked from `gc_app`, `service_role`, `anon` and `authenticated`, plus a `BEFORE UPDATE/DELETE/TRUNCATE` trigger that stops even a superuser. Applies to `audit_log_entries`, `ledger_entries`, `attestations`, `ledger_transactions`, `votes`.
5. **Enumerations are `text` + `CHECK` constraints**, not Postgres enum types. Later sessions can change them with a simple migration.
6. **The full §3 data model is in migration 1**, including escrow, dispute and Community Bank tables that sessions 2 and 3 will use. Those tables are a starting point; sessions 2–3 may adjust them with new migrations.
7. **Encryption at rest (P17)** is treated as a property of the database's storage. Hosted Supabase encrypts disks at rest; the local Docker database does not. No application-level column encryption was added: the spec itself says MVP1 encryption protects against a lost disk, not against GoodCompany.
8. **Local Supabase uses ports 55320–55329** (`supabase/config.toml`, project id `goodcompany-mvp1`), because another local Supabase project on this machine uses the default 543xx ports.

### Accounts and identity

9. **Identity = verified email** (`enable_confirmations = true`). `public.identity_level(uid)` is the single identity function (§7.6); it reads `auth.users.email_confirmed_at`. The server rejects any request from an unverified account.
10. **Self-selected roles** at sign-up are limited to `client`, `contractor`, `both`, enforced in the `handle_new_auth_user` trigger. Users can switch between those three in their profile. `mediator` and `admin` are assigned only by an admin (or the seed script).
11. **Step-up authentication** (§2.3, §10): `POST /api/auth/step-up` re-checks the password against Supabase Auth and returns a single-use grant valid for `step_up_validity_minutes` (5, new setting). Every signature consumes one grant (`consumeStepUp`). The grant id is stored on the signature record (`attestations.step_up_grant_id`), so there is never a party signature without that party's step-up. Used for contract signing now; session 2 uses the same mechanism for escrow actions.
12. **Signatures are rows in `attestations`** (user, subject, payload hash, step-up grant). Contract signatures attest the SHA-256 of the frozen snapshot; both parties must sign the same hash.
13. **Seed accounts** (`npm run seed`): admin, a default Mediator, a demo client and a demo contractor, all with verified email. Passwords are generated into `.env` and never committed.

### Marketplace

14. **Budget is not a search filter.** v2 `GET /jobs` had `budget_min/max`; filtering by budget would let a contractor infer the budget, which §3.3 forbids. The budget is used only for the multi-candidate rule. `shared/jobs.ts → jobForViewer` strips it for anyone but the job's client.
15. **Expertise filter matches job category against profile `expertise_tags`.** Expertise tags are category keys. The filter is on by default (§7.9); with no expertise set, it has no effect.
16. **Job categories** are a seeded `categories` table (10 general categories).
17. **"No existing open Workspace for this job"** (v2 §4.1) is read as one workspace per contractor per job (unique constraint), so several candidates can negotiate in parallel.
18. **Awarded jobs:** job status stays manual (v2 §3.1). An awarded job (`selected_contractor_id` set) disappears from search and accepts no responses. Signing is refused on a `closed` job.
19. **Contacts:** linked automatically on creation when email or phone matches an active account. Invitations by email are not sent yet (no outbound email except auth emails in MVP1 so far). The nightly reconciliation job is part of session 3 (system jobs).
20. **Collaboration preference** is stored and shown only to the owner. It does not yet influence matching (the spec says it *may*).

### Negotiation Workspace

21. **Stage moves:** introduction → technical_intake and technical_intake → terms by either party (button); leaving technical intake requires all required intake questions answered. terms → quote happens when a terms version is accepted; quote → contract_preview when the client accepts a quote. No moving back across stages.
22. **Intake library (OD10 open):** a minimal placeholder set in `shared/intake.ts` — three generic questions plus one per category. The client answers; the contractor can add custom questions (the "free custom field").
23. **Terms versions:** either party may propose; a new proposal supersedes the previous open one; only the other party can accept. There is no separate "reject terms" action; a counter-proposal is the answer.
24. **Percentages are validated in basis points** (max 2 decimals): phases + materials budget + platform fee must equal exactly 100%. The fee percentage is copied onto each terms version (`fee_percentage`) so the rule is checkable later even if the setting changes.
25. **Phase rules:** exactly one `final`, last; every phase > 0%; work and final phases need an evidence description (it makes a completion request formal, §3.5); advances don't. Advances may sit anywhere before the final phase.
26. **Rounding (§7.1, §7.7):** one largest-remainder split over [fee, materials budget, phases…], ties to the earlier part. With round amounts this gives exactly 2% fee; with odd cent amounts the fee may differ by one cent from a separate 2% calculation, but the parts always sum to the total.
27. **Mediator assignment (P15):** an admin sets a default Mediator (`default_mediator_id` setting) and may assign a specific Mediator per workspace. New terms versions take the workspace's Mediator, else the default. Without any Mediator, terms cannot be proposed (clear error).
28. **Quote:** one open quote at a time; a new quote withdraws the previous one (`withdrawn` status added). The client may reject a quote; the contractor can then submit another. `materials_amount` must not exceed the total.
29. **Mandatory clauses 1–5** (Addendum §8) are translated to English, adapted to v3 (Mediator gives non-binding advice; 0-day warranty wording per O26), and stored on every terms version.
30. **Contract snapshot** (`server/utils/workspace.ts → buildContractPreview`): job, parties, Mediator, full terms, quote, milestones with amounts, holdback amount and the holdback notice. Canonical JSON (sorted keys) → SHA-256. The client sends the hash it saw; the server refuses to sign if it differs.
31. **Multi-candidate threshold (OD7 open): soft warning with logged override.** On jobs whose indicative budget is ≥ €5,000, the client sees a warning when fewer than 5 candidates got beyond introduction and can sign anyway; the override is an audit-log entry. A candidate counts once their workspace has left the introduction stage (`reached_beyond_introduction`). Jobs without a budget are not subject to the rule.
32. **Signing and awarding:** lock order is job → workspace, so two candidates signing at once cannot deadlock; the award is a conditional `UPDATE … WHERE selected_contractor_id IS NULL` (race guard §9.3). Milestones are created at signing from the snapshot; the EscrowAccount is not (it is created by `fund`, session 2).
33. **Rejecting the contract:** the client can reject at preview (outcome `rejected`); the contractor withdraws instead. Either party can withdraw at any stage before signing.
34. **Notifications** are written as rows now (job responses, stage changes, proposals, signatures, award to others). The dashboard shows them; the full notification centre is session 3.

### Tests

35. **DB tests write test rows** into append-only tables (they cannot be cleaned up by design). Harmless in a local database; `supabase db reset` clears them.
36. **E2E tests create their own verified users** through the Supabase admin API (unique emails per run), and read the sign-up verification email from the local Mailpit inbox.

## Session 2

### Ledger boundary

37. **`EscrowLedger` interface with one implementation, `SimulatedLedger`** (`server/ledger/`). The rules are a pure function `applyAction(state, action, signers, ctx)` in `core.ts` (no database, clock or randomness — those come in through `ctx`), so every rule is unit-tested in isolation. `simulated.ts` loads the contract's ledger state under a row lock (`SELECT … FOR UPDATE` on the contract), applies the core and writes everything in the caller's transaction. A rejection throws before anything is written.
38. **What the ledger owns.** Besides `escrow_accounts` it writes milestones, completion requests, dispute amounts/status, repair agreements, Change Order status, supplier payments, simulated balances, collect-wallet items, contract status and `ledger_entries`. These are "contract data held by the ledger" (Protocol v1); the GoodTrade service (`server/utils/escrow.ts`) only prepares actions, collects signatures and writes notifications/audit entries. Mediator-console fields on a case (proposal, advice, extensions) are off-ledger.
39. **Simulated money is conserved.** Funding moves the client's simulated balance into escrow; payouts, refunds and supplier payments move it to the recipients' simulated balances; fees move to `fee_collection_items` (the collect-wallet). Simulated balances are created only by the seed script or `POST /api/admin/simulated-balances` (ledger entry `simulated_credit`).
40. **Action lifecycle** (`escrow_actions`): prepared with a SHA-256 hash over {id, contract, type, params, created_at}, a summary and the required signers; signed through attestations (one per signer, each with a consumed step-up grant); submitted when the set of signers equals the required set exactly; `applied`, or `rejected` with the ledger's reason (a savepoint keeps the signature record while discarding any partial effect), or `expired` after `action_signature_ttl_hours`. Amounts in params are requests; the ledger recomputes everything.
41. **Single-signer actions** (fund, claim, request, approve, object, activate) are prepared and signed in one UI step: the step-up dialog shows the ledger's summary of what will happen.

### Path 1

42. **Fee and rounding.** `fee_reserved` at funding = the quote's fee from the largest-remainder split. After a Change Order it becomes `round(contract value × fee rate)`; Change Orders must make milestones + materials budget + new fee equal the new contract value exactly, so the escrow always empties to the cent.
43. **Final payout** = final phase + unspent materials budget (P21) − holdback. The **holdback withheld is `min(10% × contract value, final phase + unspent materials)`**: the spec does not say what happens when the final payout is smaller than 10%, and the contractor never tops up the escrow (§4.6). With a 0-day warranty nothing is withheld at final approval and the contract closes in the same action (§4.1, §7.2: "release 100%" — O26's "until both parties agree the final payment" is read as the moment the client approves the final delivery the contractor requested).
44. **The final completion request is possible only after every other milestone is paid** (the final delivery is the whole project). An unclaimed advance must be claimed first.
45. **Client surplus is returned at final approval** together with its reserved fee: a negative Change Order lowers both the milestones and the fee, so the client's surplus equals the full amount removed (e.g. −1,000 = −980 work −20 fee).
46. **Mutual settlement**: the contractor's share is entered; the ledger computes the fee (none if nothing was ever paid out, P1/OD11; otherwise 2% of everything paid out including this share, P7, capped at the frozen fee) and gives the rest to the client. It also closes every open case, request and tranche. Status `ended_unfinished`.
47. **Supplier payments** cannot go to the client or the contractor (self-supply is paid at the final payout, O17).
48. **Change Orders** carry an optional new materials budget (`change_orders.new_materials_budget`, never below what suppliers were already paid). The proposer's step-up signature is taken when the proposal is sent; acceptance is the other party's signature on the same action. Rejection (reason required) and withdrawal mark the pending action rejected.

### Path 2

49. **Who objects.** Only the client signs `object` in MVP1: against an open completion request (full or in part) or, during warranty, without a request (freezing unclaimed tranches). The contractor's grievances — a silent or non-paying client — are covered by triggers (b) and (c) and by activating the Mediator on an open case. A free-standing objection during execution is not offered, because settling it would cut across the milestone amounts.
50. **Object in part** releases the undisputed part of the request in the same action; for the final delivery that means the final payout runs (fee transferred, warranty starts) with the disputed amount kept frozen.
51. **`settle`** (both parties) has two modes: a split of the disputed amount, or withdrawing the objection (Path 1 reopens: the request is open again; for a part-objection the conceded amount goes to the contractor; for a warranty case the tranches unfreeze). A split of a fully disputed final delivery runs the final payout with the agreed shares.
52. **Warranty objection** freezes unclaimed tranches from the last one back, splitting one tranche if needed so exactly the disputed amount is frozen. The settlement pays both shares at once and marks those tranches `reassigned`.
53. **System triggers** are two ledger operations without signatures, `system_open_dispute` and `system_activate_mediator`; they move no money (L4). `runTriggerChecks()` (`server/utils/triggers.ts`) applies them; it is idempotent and catches every passed deadline on a late run. In session 2 it runs from the admin page ("Run trigger checks now"); scheduling is a session 3 system job. Silence inside an open dispute is measured from the last party message (`dispute_cases.last_party_activity_at`).
54. **Mediator access**: the case file is visible to the contract's Mediator only after activation (D18). The Mediator's actions (finding, proposal, extension, notice, advice) are off-ledger; advice is refused before the 48-hour notice has run and, in a silence case, before the silence finding. The Mediator cannot prepare or sign any escrow action (not a party).
55. **Admin assignment of a contract's Mediator** (`POST /api/admin/contracts/{id}/mediator`) goes through the ledger and is refused while a Mediator is active on a case; after that, only `replace_mediator` by both parties.

### Repair and nested contracts

56. **Repair agreement** (both sign): releases the disputed amount minus the held amount now (for the final delivery this runs the final payout), keeps the held amount as `repair_held`, and closes the case. A completion request for the repair starts a new 14-day window and 30-day deadline for the held amount only; approving it releases the held amount.
57. **Nested contract**: either party starts it from a contract that has a final completion request or is completed; it opens a workspace on the same job at the terms stage, linked by `parent_contract_id`, with the parent's Mediator. Signing is allowed once the parent is completed/closed/ended, or its final delivery was part-paid (objection in part or a repair agreement on the final request) (§4.5). It does not re-award the job or close other workspaces.

### Visibility

58. **Client view of the escrow** omits `paid_to_suppliers`, `materials_released` and the plain balance; it shows the balance excluding the materials budget, and the ledger list without supplier-payment and materials-release entries. Known limit, recorded: after the final payout the client can still derive total supplier spend (final payout − final phase + holdback = unspent materials). That follows from P21 and the spec's statement that MVP1 confidentiality is access control only.

### Tests

59. **Time-dependent steps in E2E tests** (tranches after 15/30 days, the 48-hour advice notice, 14 days of silence) are reached by moving the relevant timestamps back in the test database; the ledger and console always compare with the real clock.
