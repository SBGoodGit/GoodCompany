# GoodCompany MVP1 — Build report

Built to Build Spec v3.007 and Decision Log v1.011, corrected to v3.008 / v1.012 (D27) (`../docs/spec/`), in three Claude Code sessions on branch `mvp1` (17 November 2026). Round 2 (D28) added on 18 November 2026. Not pushed or merged.

Stack: Nuxt 3 + TypeScript (SPA, server API), Supabase run locally (Postgres, email auth), Vitest, Playwright. All balances are simulated; there is no blockchain, wallet, stablecoin, bridge or payment provider anywhere.

## 1. What was built, per part (assignment §6)

| # | Part | Built |
|---|---|---|
| 1 | Data model, migrations, row-level security | Full §3 model in `supabase/migrations/` (4 migrations). RLS enabled and forced on every table, deny-all for the public `anon`/`authenticated` roles; the server runs as restricted role `gc_app`. `AuditLogEntry`, `LedgerEntry`, attestations, Community Bank transactions and votes are append-only at permission level (privileges revoked) and by trigger (also stops superusers). §12 values seeded in `app_settings` |
| 2 | Accounts, verification, profiles, step-up, admin | Email sign-up with mandatory verification; `identity_level(user)` as the single identity interface; self-selected roles limited to client/contractor/both; profiles with expertise, portfolio, public view with Rookie Stage and warranty metrics; step-up re-authentication (single-use, 5-minute grant) before every signature; admin role; Mediator accounts created by an admin |
| 3 | Marketplace | Post job, search with "only my expertise" on by default, job status management; the indicative budget is never returned to a contractor (and is not a search filter); contacts with groups, automatic linking, private collaboration preference |
| 4 | Negotiation Workspace | Five-stage stepper, chat, two-way technical intake (library + own questions from both sides) with the mandatory budget range, client constraints, terms proposed by the contractor with version history (warranty 0/15/30/90, fixed 10% holdback, phase structure, execution period, Mediator, five mandatory clauses) and accept / reject / revision-with-comment by the client, itemised quote (scope of work, sections, lines, derived phase amounts, materials budget and fee line, chosen detail level), contract preview with SHA-256 snapshot, signing by both with step-up, atomic award, sibling workspaces closed (`closed_other_selected`), candidate limits with swaps, pause new applicants, conversation overview, private client notes (round 2) |
| 5 | `EscrowLedger` + `SimulatedLedger`, action preparation and signing | Rules as one pure function (`server/ledger/core.ts`), persistence under a row lock in one transaction (`simulated.ts`); actions prepared with hash, summary and required signers, signed through attestations, applied completely or not at all, expired after 72 h. Nothing outside the ledger changes a balance |
| 6 | Path 1 | Fund; advance claim; supplier payments (contractor alone, verified supplier, client notified without amount, never shown to the client); `materials_ordered` status; completion requests with evidence; information request/response; approval; final payout with unspent materials as labour income; fee frozen at deposit and transferred in one go at completion; client surplus settled; holdback tranches claimable from their dates; Change Orders (positive with deposit in the same action, negative to client surplus, rejection with reason, withdrawal, expiry, own conversation); mutual settlement with the cancellation fee rules; Mediator replacement by both parties |
| 7 | Repair agreements, nested contracts | Repair agreement releases all but the held amount; repair request with its own 14-day window and 30-day deadline; linked contract for extra work after a completion request or during warranty, signable only after (part-)payment of the first |
| 8 | Path 2 and Mediator console | Objection (full, in part, during warranty with tranche freezing); only `settle` by both parties releases a disputed amount (split or withdrawal); Mediator activation by either party alone; triggers (b) silence and (c) payment deadline open a case and activate the Mediator automatically, with `escalate` offered to the waiting party, and never pay out; Mediator console with cases, due dates, case file (visible only after activation), silence finding, proposal, extension, 48-hour advice notice, non-binding advice. The Mediator has no signing role anywhere; there is no execution path for court rulings |
| 9 | Final evaluation, invoices, reviews, reputation | FinalEvaluation from the final request and its approval; invoice pair at 100% of the contract amount with stable external reference; separate platform fee statement; discrepancy notes; reviews (one per party, motivation required ≤ 3, private motivation); contractor score with reliability factor and Rookie Stage; client reviews stored, client score not computed (O25 deferred) |
| 10 | Community Bank | Four reserves + organisation reserve; collect-wallet and fee batches (≥ 5 fees, configurable) split 1% organisation / 60-20-10-10, without contract references, public batch list; loan applications with derived interest, sampled voting by invitation, ≥ 60% threshold, reserve checks, SubEscrow to the supplier with invoices, early/partial repayment without penalty, manual default; Community Health Score |
| 11 | Notifications, dashboard, admin, Mediators, simulated balances | In-app notifications with badge and page; dashboard with deadlines, negotiations, contracts, Community Bank snapshot; admin page for all §12 values (holdback fixed), Mediator accounts and assignment, simulated user balances, reserve seed, loans, system jobs; "SIMULATED" labels wherever a balance appears |
| 12 | System jobs | Scheduler (5-minute tick, per-job intervals) for: response window/silence and payment deadline checks, Mediator due dates, Change Order expiry, escrow action expiry, workspace inactivity (notice day 18, expiry day 21), fee aggregation, vote resolution, contact reconciliation, health score. All idempotent and logged in `job_runs` |

## 2. Not built, and why

| Item | Why |
|---|---|
| Anything in spec §1.3 (blockchain, wallets, real money, bank coupling, DigiD/Identus, binding decisions, court-ruling execution, Dispute Center self-service, automated missed-payment detection, Dutch UI, …) | Out of scope by the spec |
| Client reputation score and the 80/20 split | Deferred by the product owner (O25); reviews received as client are stored |
| Execution of a court ruling through the escrow | Functional principle decided (O1), construction open (T3); MVP1 has no execution path, as the assignment requires |
| File upload for completion evidence | Evidence is a text description (hashed and recorded); the `evidence_files` column exists for later. Storage was not needed for any rule and adds setup |
| Encryption at rest of the local database | A property of the hosted database's storage (P17); the local Docker database is not encrypted. No application-level column encryption |
| Outbound email (contact invitations, notification emails) | MVP1 has no mail setup beyond Supabase's verification email; notifications are in-app |
| Collaboration preference influencing matching | The spec says it *may*; not needed |
| `stats_avg_response_time` | No rule in the spec; left empty |
| Supplier payment `delivery_status` changes | Stored as `pending`; no flow in the spec sets it |
| Funding timeout, workspace reactivation | Open product decisions OD2, OD4; nothing assumed |
| Hosted deployment | Not requested; runs locally |

## 3. Choices made where the spec was open

All 97 choices, with location and reasoning, are in `BUILD_NOTES.md`. The ones that most affect behaviour:

- **Architecture** (1–8): SPA + server API; RLS deny-all for the public roles with all authorisation in the server; restricted `gc_app` role; local Supabase on ports 553xx.
- **Identity and signatures** (9–13): verified email only; step-up = password re-entry giving a single-use 5-minute grant; every signature is an attestation tied to that grant.
- **Marketplace** (14–20): budget not a search filter (would leak it); one workspace per contractor per job; awarded jobs leave search.
- **Workspace** (21–34, round 2: 86–97): the contractor owns the plan; **amounts follow from an itemised estimate: material lines form the materials budget, other lines the phase amounts, the fee is a separate line so lines + fee = total**; admin-assigned default Mediator; **candidate limits (3 past the introduction, 2 swaps; a candidate who reached the quote keeps its slot) replace the multi-candidate warning**.
- **Ledger** (37–41, 42–48): pure rules + locked persistence; simulated money conserved; **holdback always the full 10%; the final phase must be ≥ 10% (correction 82)**; **final request only after all other milestones are paid**; mutual settlement fee = 2% of everything paid out (none if nothing was).
- **Disputes** (49–56): **either party signs `object`; the contractor disputes a whole open request of their own (correction 83)**; objection in part releases the undisputed part at once; settle = split or withdrawal; triggers are signature-less ledger operations that move no money.
- **Nested contracts** (57): signable once the first contract is completed or its final delivery was part-paid.
- **Visibility** (58, 77): client never receives supplier payment amounts, supplier ledger entries or a balance from which they follow — but after the final payout the total supplier spend is derivable from P21's labour-income rule (recorded limitation).
- **Invoices** (61–62): 100% of base quote + Change Orders; **sequential reference `GC-INV-<year>-<n>` (OD8)**.
- **Reputation** (63–65): value-weighted average × on-time factor; no public individual ratings during the Rookie Stage.
- **Community Bank** (66–75): **administrative check before voting (OD5, correction 84)**; voters don't see identities (OD6); **simple pro-rata interest (OD9)**; admin seed money for reserves; illustrative health score.
- **Jobs** (79–81): 5-minute scheduler with per-job intervals; dedupe keys; added escrow action expiry.

## 4. Test results

Run on 17 November 2026 against the local stack:

- **Vitest: 87 tests, 7 files — all pass** (after round 2). Including the itemised estimate (line amounts, phase amounts from lines, fee line, materials budget, final phase ≥ 10%, exact totals, detail levels) and **the §7.1 example built through an itemised estimate**. Money and rounding; terms validation; budget hiding; canonical hashing; database guarantees (append-only, RLS); **32 ledger tests covering every action and its conditions, including the §7.1 worked example as an exact assertion (contract 10,000.00 → contractor 7,200.00, suppliers 2,600.00, fee 200.00, escrow empty)**; reviews, reputation, warranty metrics, interest, vote tiers, fee batch split, Safety Reserve threshold, health score.
- **Playwright: 13 tests, 5 files — all pass** (after round 2). The negotiation test now runs the round 2 flow: introductions → three candidates into the intake (a fourth refused) → one swap → pause new applicants → two-way intake with the budget → terms revision, then acceptance with the warning → itemised estimate → signing → a completion request showing its phase's lines.
  - Sign-up requires a verified email.
  - Job → workspace (five stages) → both sign → contract awaiting funding, rival candidate closed out.
  - **Path 1 through the UI: job → workspace → signing → funding → advance and supplier payments → completion → approval → holdback tranches, with the §7.1 numbers.**
  - **Path 2 through the UI: objection → Mediator activation → advice (refused before notice and before 48 h) → settlement.**
  - Trigger (b) silence: case opened, Mediator active, no payout, idempotent.
  - Change Orders (positive, negative, rejection); repair agreement + nested contract; mutual settlement without fee.
  - Final evaluation, invoices, fee statement, reviews and Rookie Stage; fee batch and full loan cycle including the administrative check; OD5 return-with-reason and approve through the admin page; system jobs (inactivity, Change Order expiry, reconciliation, health score); dashboard deadlines, notifications, admin settings with fixed holdback.
- Production build (`nuxt build`) succeeds.

Tests that need time to pass (warranty tranches, 48-hour notice, 14 days of silence, inactivity, expiry) move the relevant timestamps back in the test database; the application always uses the real clock.

## 5. How to run locally

Requirements: Docker running, Node 22, Supabase CLI.

```bash
cd app
npm install
npx supabase start                  # local stack on ports 55320–55329
cp .env.example .env                # fill keys from: npx supabase status -o env; set the two SEED_*_PASSWORD values
npx supabase db reset               # apply migrations
npm run seed                        # admin, default Mediator, demo client (€50,000 simulated), contractor, supplier
npm run dev                         # http://127.0.0.1:3100
```

- Sign-up verification emails: local Mailpit at http://127.0.0.1:55324
- Demo accounts: `client@`, `contractor@`, `supplier@`, `mediator@goodcompany.test` (password `SEED_USER_PASSWORD`), admin `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — all from `.env`, never committed.
- Tests: `npm test` (needs the local database) and `npx playwright install chromium` once, then `npm run test:e2e` (starts or reuses the dev server).
- System jobs run automatically in the dev server; the admin page can run them on demand.
