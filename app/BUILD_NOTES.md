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
