**GoodCompany**

**MVP 1 Build Specification**

*Marketplace · GoodTrade · Community Bank — v2.0*

Prepared for the GoodCompany Ecosystem

# Table of Contents

# 0. Purpose & How to Use This Document

This document translates the *GC Product **&** Development Briefing* into a build-ready technical specification for **MVP 1 only**. It supersedes v1.0: the earlier version bundled everything under the name "GoodTrade," which conflated three functionally distinct systems. This version separates them:

- **Marketplace** — discovery: posting jobs, searching, matching, contacts.

- **GoodTrade** — the transaction: Negotiation Workspace → Contract → Escrow → sign-off.

- **Community Bank** — the cooperative treasury fed by GoodTrade's platform fee, governed by community vote.

A fourth, non-user-facing layer — how GoodCompany the *organization* sustains itself — is documented separately in **Appendix A**, deliberately kept out of the Community Bank material so the community-facing transparency story isn't muddied by the organization's own operating economics.

Where the product briefing used "e.g." for a parameter, this document commits to a specific default so the team has something buildable. Defaults are marked **[DEFAULT — CONFIGURABLE]**. Items that still require a decision from the product owner are collected in **Section 10 — Open Decisions**.

This spec assumes the interactive demo prototypes already produced are the source of truth for visual/UX design; Section 9 lists the screens each module needs so prototype and spec stay mapped to each other. Section 12 closes the document with a **suggestive, non-binding roadmap** for MVP 2 through 5+, so ideas raised during scoping aren't lost even though they're out of scope now.

# 1. MVP 1 Scope Boundary

## 1.1 In scope

**Marketplace**

- User accounts & profiles

- Contacts & Inner Circles (grouped contacts, GC-account status indicator)

- Job posting, search & filtering, status management (open/closed/dormant)

**GoodTrade**

- Negotiation Workspace (all 5 stages)

- Contracts (state model) with audit trail

- Escrow: lump-sum and phased payment

- Change orders during execution

- Final evaluation & basic reviews

- Minimal delivery/approval flow (full Project Execution module is later)

**Community Bank**

- Stability reserves + Growth/loans, including community voting and reserve transparency

**Cross-cutting**

- Payment/Bank Coupling module (onramp: bank → GC escrow; offramp: GC balance → personal bank) — required for GoodTrade to function at all

- Notifications (transactional only)

- Basic dashboard (status overview only)

- Identity: bare Hyperledger Identus + DigiD (see 6.6), not full AVI

## 1.2 Explicitly out of scope for MVP 1

- Dispute Center self-service layer + AI/ML suggestion step (interim: direct escalation to a hired mediator, see 8.2)

- Innovation Fund & investment slots (a read-only progress indicator toward unlock is a cheap optional add — see 12)

- Plugin Marketplace (architecture should anticipate it; the marketplace itself is later)

- Full Project Execution module (task boards, document vault)

- Full audit/compliance export tooling

- Full AVI (six-month re-attestation, three-tier backup, etc.) — MVP 1 ships a bare identity layer only

- Contacts-based acquisition/re-engagement outreach

- Achievements/badges gamification layer

- Any additional bank-style products (savings, individual staking, individual angel investing)

# 2. Data Model

Field types are indicative (string/int/decimal/enum/timestamp/bool/array/ref). Every entity gets `id` (UUID), `created_at`, `updated_at` implicitly.

## 2.1 Identity & Profile

**User**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| email | string | unique, verified |
| phone | string | optional |
| identus_did | string | decentralized identifier issued by the bare Identus layer, see 6.6 |
| digid_verified | bool | set once via DigiD-backed credential issuance |
| role | enum[client, contractor, both] | a user can act as both |
| profile_id | ref → Profile |  |
| status | enum[active, suspended, deleted] |  |

**Profile**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| user_id | ref → User |  |
| account_type | enum[individual, company] |  |
| display_name | string |  |
| description | text |  |
| expertise_tags | array[string] | drives "search only within my expertise" filter |
| portfolio_items | array[ref → PortfolioItem] |  |
| reputation_score | decimal | computed, see 2.1.1 |
| stats_completed_jobs | int | computed |
| stats_satisfaction_rate | decimal | computed |
| stats_avg_response_time | int (hours) | computed |

**PortfolioItem** — profile_id (ref), title, description, media_urls (array), linked_contract_id (ref, optional)

**Review** — contract_id (ref), reviewer_id (ref → User), reviewee_id (ref → User), rating (int 1–5), comment (text)

### 2.1.1 Reputation score (MVP formula)

`reputation_score = weighted_avg(rating) × reliability_factor`

`reliability_factor` **[DEFAULT — CONFIGURABLE]** = on-time milestone/delivery rate over the last 20 contracts, floor of 0.5. Computed server-side, cached on Profile.

## 2.2 Contacts & Inner Circles (new in v2.0 — Marketplace)

**Contact**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| owner_id | ref → User | the user who added this contact |
| linked_user_id | ref → User, nullable | set automatically if the contact's details match an existing GC account |
| display_name | string |  |
| company_name | string, nullable |  |
| phone / email | string, nullable | manually entered if linked_user_id is null |
| status | enum[unlinked, linked] | drives the grey/teal UI indicator — grey = not yet on GC, teal = active GC member |
| notes | text, nullable |  |

**ContactGroup** — owner_id (ref), name (string, e.g. "Timmermannen", "Leveranciers") — user-defined, arbitrary count

**ContactGroupMembership** — contact_id (ref), group_id (ref) — many-to-many, a contact can sit in multiple groups

No messaging/mail/chat/VOIP layer is built on top of this in MVP 1 — Contacts is purely an organizational address book scoped to the user's own GoodCompany relationships. Communication happens off-platform or, once a Job/Workspace exists, via the existing workspace Message thread (2.4).

## 2.3 Jobs & Search (Marketplace)

**Job**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| client_id | ref → User |  |
| title | string |  |
| category | enum/ref → Category table |  |
| region | string / geo |  |
| urgency | enum[low, medium, high] |  |
| status | enum[open, closed, dormant] | see state machine 3.1 |
| indicative_budget | decimal, nullable | optional, client-controlled visibility |

**JobResponse** — job_id (ref), contractor_id (ref), negotiation_workspace_id (ref), created_at

Search/filter is a read query over Job + Profile.expertise_tags; the "search only within my expertise" toggle is a per-user session preference, **default ON**.

## 2.4 Negotiation Workspace (GoodTrade)

**NegotiationWorkspace**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| job_id | ref → Job |  |
| client_id | ref → User |  |
| contractor_id | ref → User |  |
| stage | enum[introduction, technical_intake, terms, quote, contract_preview, closed] | see 3.2 |
| outcome | enum[pending, accepted, rejected, withdrawn, expired] |  |
| last_activity_at | timestamp | drives deadlock rule, 8.1 |

**Message** — workspace_id (ref), sender_id (ref), body (text)

**TechnicalIntakeAnswer** — workspace_id (ref), question_key (string), answer (text)

**TermsOfEngagementVersion**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| workspace_id | ref |  |
| version_number | int | increments on every change |
| working_hours | text |  |
| communication_channel | text |  |
| warranty_period_days | int |  |
| ownership_terms | text |  |
| payment_phases | array[{percentage, description}] | must sum to 100 |
| cancellation_terms | text |  |
| proposed_by | ref → User |  |
| status | enum[proposed, accepted, superseded] |  |

**Quote**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| workspace_id | ref |  |
| terms_version_id | ref | must point to an *accepted* terms version |
| total_amount | decimal |  |
| currency | string | **[DEFAULT: EUR only for MVP 1]**, see 10.4 |
| phase_amounts | array[{sequence, percentage, amount}] | auto-derived from terms.payment_phases × total_amount |
| status | enum[draft, submitted, accepted, rejected] |  |

## 2.5 Contracts, Escrow, Execution (GoodTrade)

**Contract**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| workspace_id | ref | 1:1 once created |
| job_id | ref |  |
| client_id, contractor_id | ref |  |
| terms_version_id | ref | frozen snapshot at contract creation |
| quote_id | ref | frozen snapshot |
| status | enum[active, completed] | see 3.3 — created directly into `active`, see note there |
| activated_at, completed_at | timestamp, nullable |  |

**Escrow**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| contract_id | ref | 1:1 |
| total_amount | decimal | = quote.total_amount |
| funded_amount | decimal |  |
| status | enum[pending, funded, partially_released, released, frozen] | see 3.4 |

**Milestone** — contract_id (ref), sequence (int), percentage (decimal), description (text), status (enum[pending, submitted, approved, rejected, paid]), submitted_at, approved_at

**ChangeOrder** — contract_id (ref), description (text), requested_by (ref), amount_delta (decimal, nullable), new_terms_version_id (ref, nullable), status (enum[proposed, accepted, rejected])

**FinalEvaluation** — contract_id (ref), client_signed (bool), contractor_signed (bool), client_signed_at, contractor_signed_at, discrepancy_notes (text, nullable), closed_at

**Invoice** *(new)*

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| contract_id | ref, nullable | nullable because a `received` invoice may originate from a Community Bank SubEscrow supplier payment rather than a GoodTrade contract |
| related_sub_escrow_id | ref, nullable | set when the invoice originates from a Community Bank loan-to-supplier payment (2.7) rather than a GoodTrade contract |
| direction | enum[issued, received] | `issued` = this user was paid and is the invoice's sender; `received` = this user paid and is the invoice's recipient |
| amount | decimal | base quote amount plus any accepted ChangeOrder amount_deltas (2.5) — i.e. reflects "meerwerk," not just the original quote |
| currency | string | EUR for MVP 1, see 10.4 |
| status | enum[draft, finalized] | generated as `finalized` automatically — see generation rules below |
| external_reference_id | string | the identifier a third-party bookkeeping integration would use to fetch this specific invoice — stable and unique, independent of the contract's own ID |

**Generation rules:**

- An `issued` Invoice is generated automatically for the contractor the moment both signatures on `FinalEvaluation` are recorded (3.3) — not manually created. Its amount is computed from the frozen quote plus any accepted ChangeOrders on that contract.

- A `received` Invoice is generated automatically on the paying side of the same event (the client), and separately whenever a Community Bank `SubEscrow.release_to_supplier` completes (2.7) — the supplier gets an `issued` Invoice, the Community Bank/loan applicant's record gets a `received` Invoice.

- Every Contract (and every SubEscrow) can therefore have zero, one, or more associated Invoices hanging off it via `contract_id`/`related_sub_escrow_id` — MVP 1 does not need its own invoice-numbering UI, but the **existence of a stable, fetchable ID per invoice is required now**, even though the actual third-party bookkeeping *connector* that consumes it is Plugin Marketplace-era work (see 12). Building the ID/structure now and the fetch-integration later avoids a painful retrofit.

- **[Open decision 10.16]**: exact shape of `external_reference_id` (sequential per-user invoice numbers vs. a UUID) is undecided — this matters for how comfortably it maps onto Dutch invoice-numbering conventions (sequential, gapless numbering is a common bookkeeping/tax expectation) versus a technically simpler UUID. Recommend deciding this before Invoice generation is actually built, since retrofitting sequential numbering after the fact is awkward.

**AuditLogEntry** — contract_id (ref), event_type (string), actor_id (ref), payload (JSON), timestamp — **append-only, no updates or deletes permitted at the application layer.**

## 2.6 Payment / Bank Coupling (new in v2.0 — cross-cutting, required for GoodTrade)

GoodTrade cannot function without a way to move real money in and out of a user's GC balance — this was implicit in the original spec (Escrow.fund) but the actual bank-linkage layer was missing.

**BankLink**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| user_id | ref → User |  |
| provider_reference | string | reference token from the payment provider (e.g. Mollie/Stripe Connect-style EU provider) — never store raw IBAN/credentials directly |
| status | enum[pending, verified, revoked] |  |

**FundingRequest** (onramp — personal bank → GC escrow)

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| user_id | ref → User |  |
| related_contract_id | ref, nullable | typically funding an Escrow |
| amount | decimal |  |
| status | enum[initiated, processing, completed, failed] |  |
| provider_transaction_id | string |  |

**PayoutRequest** (offramp — GC balance → personal bank)

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| user_id | ref → User |  |
| bank_link_id | ref → BankLink |  |
| amount | decimal |  |
| status | enum[initiated, processing, completed, failed] | see 3.6 |
| provider_transaction_id | string |  |

This module sits behind the same **step-up auth** requirement as escrow actions (7.1). See 8.7 for failure handling and 10.11 for the open compliance question.

## 2.7 Community Bank

**Reserve** — type (enum[safety, credit, legal, innovation]), balance (decimal), target_percentage (decimal) **[DEFAULT: 60/20/10/10]**, min_threshold_percentage (decimal, safety reserve only) **[DEFAULT: 55%]**

**LedgerTransaction** — source_type (enum[platform_fee, loan_repayment, interest, exit_proceeds]), amount (decimal), reserve_id (ref), related_contract_id (ref, nullable), related_loan_id (ref, nullable), timestamp

**LoanApplication**

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| applicant_id | ref → User |  |
| purpose | text | must map to an allowed category (equipment, inventory, transport, software — never living expenses) |
| amount_requested | decimal |  |
| repayment_term_months | int | interest_rate is derived, not entered — see 6.3 |
| interest_rate | decimal | computed |
| projected_income | decimal | applicant-provided, informational only, not validated |
| supplier_id | ref → User | supplier must have a GC account |
| required_votes | int | computed from amount_requested at submission — see 6.2. This **replaces the flat quorum** used in v1.0 of this spec. |
| audience_size | int | computed = required_votes × audience_multiplier — see 6.2. The number of members actually invited to vote, not the whole eligible population. |
| status | enum[submitted, community_voting, approved, rejected, active, repaid, defaulted] | see 3.5 |

**VoteInvitation** *(new — replaces **"**anyone eligible can vote**"**)*

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| loan_application_id | ref |  |
| voter_id | ref → User | drawn from a random sample of eligible voters (6.2 eligibility rule), sized to audience_size |
| sent_at | timestamp |  |
| responded_at | timestamp, nullable |  |
| status | enum[pending, responded, closed] | `closed` = required_votes was reached by other invitees before this one responded, or the application resolved/expired |

Only users with a `VoteInvitation` for a given application may cast a `Vote` for it — this is a deliberate scalability constraint, not a UX nicety. See 6.2 for the rationale.

**Vote** — application_id (ref → LoanApplication), voter_id (ref → User), choice (enum[for, against]), created_at — one vote per user per application, enforced at DB level, and only valid if a matching non-closed VoteInvitation exists

**SubEscrow** — loan_application_id (ref), community_bank_reserve_id (ref), supplier_id (ref), amount (decimal), status (enum[pending, released])

**CommunityHealthScoreSnapshot** — liquidity_utilization_ratio (decimal), default_rate (decimal), cash_flow (decimal), reserve_level (decimal), computed_score (decimal), computed_at — recomputed daily.

Note: the Community Bank's own stake-pool activity (funding organizational infrastructure) is **not** modeled here — see Appendix A. The 2% fee that feeds LedgerTransaction above is the community-facing figure; the organization's 0.02%-of-contract-value sub-fraction is deducted at the organizational layer, invisibly to this ledger's community-facing balance reporting.

# 3. State Machines

## 3.1 Job status

`open → closed` (manual, client action)

`open ⇄ dormant` (manual, client action, reversible)

`dormant → closed` (manual, client action)

No automatic transitions in MVP 1. **[Open decision 10.1]**

## 3.2 Negotiation Workspace stage

introduction → technical_intake → terms → quote → contract_preview → closed(accepted)

                                                                    → closed(rejected)

any stage → closed(withdrawn)   [either party can withdraw at any time]

any stage → closed(expired)     [inactivity rule, see 8.1]

Stage regression is allowed *within* `terms` (new versions), never across stages.

A **Contract** row is created at the moment `contract_preview` is signed by both parties. The product doc's "in negotiation" contract view is a **UI-level read-model** joining active Workspaces, not a distinct row.

## 3.3 Contract status

`active → completed` (both signatures on FinalEvaluation)

Contract is created directly into `active`; there is no persisted `in_negotiation` row (see 3.2 note).

## 3.4 Escrow status

pending → funded            [client deposits total_amount via FundingRequest]

funded → partially_released [per approved milestone, if phased]

funded → released           [lump-sum, on final evaluation signed]

partially_released → released [final milestone approved]

funded/partially_released → frozen [interim dispute process, see 8.2]

frozen → funded/partially_released [manual resolution]

## 3.5 Loan Application status

submitted → community_voting → approved → active → repaid

                              → rejected

active → defaulted   [manual trigger, see 8.4]

## 3.6 PayoutRequest status (new)

initiated → processing → completed

                       → failed → initiated  [user may retry, see 8.7]

# 4. API Contract (indicative — REST)

## 4.1 Jobs (Marketplace)

- `POST /jobs` — client creates a job. Pre: user.role includes client. Effect: Job created, status=open.

- `PATCH /jobs/{id}/status` — client changes status. Effect: status transition per 3.1.

- `GET /jobs?region=&category=&budget_min=&budget_max=&my_expertise=true` — search/filter, `my_expertise` defaults true.

- `POST /jobs/{id}/responses` — contractor responds. Pre: job.status=open, no existing open Workspace for this job. Effect: creates JobResponse + NegotiationWorkspace(stage=introduction).

## 4.2 Contacts (Marketplace) (new)

- `POST /contacts` — add a contact manually. Effect: Contact(status=unlinked) unless email/phone matches an existing User, in which case status=linked and linked_user_id is set.

- `POST /contacts/{id}/groups` — assign to one or more ContactGroups.

- `GET /contacts?group=` — list, optionally filtered by group.

- Background job: nightly reconciliation re-checks `unlinked` contacts against new User signups and flips status to `linked` when a match appears.

## 4.3 Negotiation Workspace (GoodTrade)

- `POST /workspaces/{id}/messages` — Pre: workspace.stage != closed.

- `POST /workspaces/{id}/advance` — Pre: required intake questions answered before leaving technical_intake.

- `POST /workspaces/{id}/terms-versions` — Pre: stage=terms. Effect: new TermsOfEngagementVersion(status=proposed).

- `POST /workspaces/{id}/terms-versions/{vid}/accept` — Effect: version.status=accepted, workspace advances to `quote`.

- `POST /workspaces/{id}/quote` — contractor only. Pre: an accepted terms version exists.

- `POST /workspaces/{id}/quote/accept` — client only.

- `POST /workspaces/{id}/sign` — Effect: once both signed → Contract + Escrow(status=pending) created — **[open decision 10.2 on sibling-workspace closure]**.

## 4.4 Escrow & Milestones (GoodTrade)

- `POST /contracts/{id}/escrow/fund` — Pre: an underlying FundingRequest has status=completed for the full amount. Effect: escrow.status=funded.

- `POST /contracts/{id}/milestones/{mid}/submit` — Pre: milestone.status=pending.

- `POST /contracts/{id}/milestones/{mid}/approve` — Effect: milestone.status=paid, triggers partial escrow release, emits AuditLogEntry.

- `POST /contracts/{id}/milestones/{mid}/reject` — with required comment.

## 4.5 Change Orders (GoodTrade)

- `POST /contracts/{id}/change-orders` — Effect: ChangeOrder(status=proposed).

- `POST /contracts/{id}/change-orders/{cid}/accept` — **[open decision 10.5]**.

## 4.6 Final Evaluation & Reviews (GoodTrade)

- `POST /contracts/{id}/evaluation/sign` — When both signed → contract.status=completed, escrow released fully, completed_at set. **Also generates the `issued`/`received` Invoice pair (2.5)** — this is not a separate manual step.

- `POST /contracts/{id}/reviews` — post-completion only. Triggers async reputation_score recompute.

- `GET /invoices?since=&direction=` — read-only, returns finalized Invoices for the requester (issued and/or received). This is the endpoint a future third-party bookkeeping connector would poll periodically (12) — it does not exist as a built connector in MVP 1, but the endpoint and underlying data must exist so that integration is possible without a data-model retrofit.

## 4.7 Payment / Bank Coupling (new)

- `POST /bank-links` — initiate provider-hosted bank verification flow. Effect: BankLink(status=pending) → provider webhook flips to `verified`.

- `POST /funding-requests` — onramp. Pre: verified BankLink OR a direct one-off payment method. Effect: on provider confirmation, calls `escrow/fund` (4.4).

- `POST /payout-requests` — offramp. Pre: verified BankLink, requester has sufficient available GC balance, step-up auth passed. Effect: provider payout initiated; on confirmation, PayoutRequest.status=completed.

- Provider webhooks update FundingRequest/PayoutRequest status asynchronously — never trust a synchronous response alone for money movement.

## 4.8 Community Bank

- `POST /loan-applications` — Pre: applicant verified, purpose in allowed category, supplier resolves to existing GC user. Effect: computes `required_votes` and `audience_size` from amount_requested (6.2), status=submitted → community_voting — **[open decision 10.6]**.

- System job (triggered on entering `community_voting`): randomly samples `audience_size` eligible members (6.2 eligibility rule) and creates a `VoteInvitation` per selected member. Only these members can vote on this application.

- `POST /loan-applications/{id}/votes` — Pre: application.status=community_voting, requester holds a non-`closed` VoteInvitation for this application, hasn't already voted.

- Voting resolution (scheduled): once `required_votes` responses are collected + majority **[DEFAULT: ≥60% for]** + reserve stays above min_threshold → approved, and remaining `pending` VoteInvitations are closed (5.4). Deadline (14 days) without reaching required_votes → rejected.

- `POST /loan-applications/{id}/activate` — system. Effect: creates SubEscrow, deducts Credit Reserve, status=active.

- `POST /loan-applications/{id}/repayments` — records LedgerTransaction; full repayment → status=repaid.

# 5. Smart Contract / On-Chain Layer

Directional — the team owns implementation choices — but these boundaries encode product guarantees, not preference.

## 5.1 Data placement: Cardano vs Midnight

| **Data** | **Layer** | **Rationale** |
| --- | --- | --- |
| Contract existence, hash of terms, timestamps, status transitions | Cardano (public) | Public verifiability without revealing content |
| Contract amounts, terms content, identity data | Midnight (private) | Privacy-sensitive |
| Escrow balance & release events | Midnight, with a public commitment on Cardano | Amount private, validity verifiable |
| Reserve balances & Community Bank aggregate stats | Cardano (public) | Community transparency requirement |
| Vote choices | Midnight (private ballot), tallies on Cardano | Prevents vote-buying/coercion |
| VoteInvitation membership (who was sampled for a given application) | Midnight (private) or a Merkle-root commitment on Cardano | Confirms a voter was legitimately invited without publicly exposing the full sampled member list — exact mechanism is directional, see 5.4 |

Organization-level stake-pool holdings (Appendix A) are a **separate on-chain concern** from the above — they back GoodCompany's own infrastructure participation, not user-facing Community Bank transparency reporting.

## 5.2 Escrow contract — required functions

- `fund(contract_id, amount)` — locks funds; only callable once a FundingRequest has confirmed the money is actually in GC custody.

- `release_milestone(contract_id, milestone_id, amount)` — only after an off-chain approval attestation; rejects if amount exceeds remaining balance.

- `release_final(contract_id)` — only when both FinalEvaluation signatures are attested.

- `freeze(contract_id)` / `unfreeze(contract_id)` — restricted to the interim dispute-mediator role (8.2).

- `refund(contract_id, amount)` — explicitly scoped, moves funds back to the client.

## 5.3 Sub-escrow contract (Community Bank)

- `create(loan_id, reserve_id, supplier_id, amount)` — debits Credit Reserve.

- `release_to_supplier(loan_id)` — pays the registered supplier directly; **must never expose a path paying the applicant directly**.

## 5.4 Governance/voting contract

- `cast_vote(application_id, voter_id, choice)` — only succeeds if voter_id holds a non-`closed` VoteInvitation for that application (2.7) — enforced on-chain, not just app-layer, since app-layer-only enforcement can be bypassed by direct contract calls.

- `close_invitations(application_id)` — triggered once required_votes is reached; flips remaining `pending` VoteInvitations to `closed` so they stop appearing as actionable for those members.

- `tally()` — produces public required-votes-progress/majority result without revealing individual ballots.

- Read functions: current vote split, required-votes progress (not a single global quorum — see 6.2), time remaining.

# 6. Business Rules & Committed Defaults

All values are **[DEFAULT — CONFIGURABLE]** via an admin settings layer.

## 6.1 Platform fee & reserve split

- Platform fee: **2%** of every completed contract's total_amount — **[open decision 10.7 on timing: once at final release, or per-milestone]**.

- Community Bank reserve split: Safety 60% / Credit 20% / Legal 10% / Innovation 10%.

- Safety Reserve minimum threshold: **55%** of target — below this, no new loans regardless of vote outcome.

- Of the 2% fee, a further **1% of that fee amount (i.e. 0.02% of contract value)** is separately routed to the GoodCompany Organization Reserve, not the Community Bank reserves above. See Appendix A. This is invisible to the community-facing Community Bank balance — the 2% figure communicated to users already nets this out.

## 6.2 Community voting — targeted sampling, not open broadcast

**This supersedes the flat-quorum model from v1.0 of this spec.** At GoodCompany's target scale (potentially millions of users), broadcasting every loan application to the entire eligible member base and allowing anyone to cast an on-chain vote would create significant unnecessary transaction volume — most members would never see or respond to most applications anyway, so a full broadcast buys little additional legitimacy at a real infrastructure cost. Instead, each application is sent to a **randomly-sampled subset** of eligible members, sized so that a larger loan (more consequential to the shared reserve) requires a broader — but still bounded — sample, without needing to reach anywhere near the full membership.

The underlying assumption: a sufficiently large random sample of eligible members reaching a clear majority is a reasonable proxy for what the broader, non-sampled membership would also conclude — the goal is credible representative consensus, not full-population participation.

- **Required votes scale with loan amount [DEFAULT — CONFIGURABLE, illustrative tiers]:**

| **Amount requested** | **Required votes (target)** |
| --- | --- |
| ≤ €2,000 | 50 |
| €2,000 – €10,000 | 100 |
| €10,000 – €50,000 | 250 |
| > €50,000 | 500 *(hard cap — does not scale further regardless of amount)* |

- **Audience size** (how many members are actually invited via VoteInvitation) = `required_votes × audience_multiplier`. **[DEFAULT: multiplier = 3]** — sized larger than required_votes because not every invited member will be active or choose to respond within the window (per the product owner's own point: some members may not use the platform for months at a time, so the invited pool must comfortably exceed the number of responses actually needed).

- Once `required_votes` responses are collected, remaining `pending` VoteInvitations for that application are flipped to `closed` (5.4 `close_invitations`) and disappear from those members' pending view — they were never guaranteed a vote, only a chance to participate before the threshold was reached.

- Voter eligibility (who can be sampled at all): account age ≥30 days AND ≥1 completed contract — unchanged from v1.0.

- Sample selection should be randomized across the eligible pool (not, e.g., always the most active members) to keep the "representative of the average member" assumption reasonable — exact sampling algorithm is an implementation detail, but must not be deterministic/gameable.

- Majority threshold: **≥60% for** — unchanged from v1.0, now applied against `required_votes` responses rather than a flat 25.

- Voting window: **14 days** from the first invitation sent, then auto-expire to `rejected` if `required_votes` is not reached — unchanged from v1.0.

- **[Open decision 10.12]**: the exact tiers, multiplier, and cap above are illustrative defaults, not validated against real usage. The product owner should expect to revisit these once real application volume and response-rate data exists — e.g. if the true response rate is far below 1-in-3, the multiplier will need to increase; if large loans turn out rare, the cap may need rethinking.

## 6.3 Loan interest rate derivation

`interest_rate = base_rate + term_adjustment(repayment_term_months)`

**[DEFAULT]** base_rate = 4%; +0.25% per 6-month block beyond an initial 12-month grace, capped at +3%. **[Open decision 10.8]**

## 6.4 Reputation & search defaults

- "Search only within my expertise" — default ON.

- Reliability factor floor: 0.5.

## 6.5 Negotiation Workspace expiry

- Auto-expires after **21 days** of inactivity (see 8.1).

## 6.6 Identity approach for MVP 1

MVP 1 uses a **bare Hyperledger Identus deployment**, extended with a DigiD-backed credential issuance flow (via Logius's existing DigiD Connect/OIDC), rather than building a custom hardware-key solution. This is a deliberate simplification, not a placeholder to be thrown away:

- Building a custom hardware-key identity system would essentially mean building AVI itself, prematurely and without AVI's full design (three-stage bootstrap, re-attestation cycle, tiered backup).

- Because both MVP 1's identity layer and AVI are built on **Identus** (not the older, separate Hyperledger Indy stack), AVI is an **extension of MVP 1****'****s identity foundation**, not a replacement requiring migration. Users verified via bare Identus + DigiD in MVP 1 carry forward when AVI's fuller feature set is layered on top.

- A longer-term option worth exploring directly with the Hyperledger Identus team: proposing GoodCompany's specific requirements (DigiD integration pattern, re-attestation cycle) as something Identus itself might want to adopt into its core offering, given the ecosystem-scale user base GoodCompany is targeting. This is a partnership conversation, not a build-spec item.

## 6.7 Multi-candidate governance threshold (new)

For jobs at or above **[DEFAULT — CONFIGURABLE: €5,000]** indicative value, a client is required to have engaged at least **[DEFAULT: 5]** distinct candidates in a Negotiation Workspace before a quote can be accepted.

**Important correction to how this is framed:** this was originally proposed by the product owner as an EU-mandated procurement rule. It is not. The actual EU public procurement directives (2014/24/EU and related) apply only to **public-sector contracting authorities** (government bodies), at thresholds far higher than €5,000 (roughly €143,000+ for central government contracts, higher still for works) — they do not apply to private individuals or businesses transacting with each other, which is what GoodCompany is for. This rule is instead adopted here as **GoodCompany****'****s own internal governance principle** — good practice against favoritism, and useful audit-trail groundwork if GoodCompany is ever used for actual public-sector tendering in the future, where these thresholds would apply for real. Do not describe this to users or partners as a legal requirement; describe it as a platform-level fairness/transparency standard.

- Below the threshold, direct 1-to-1 negotiation and signing is unrestricted.

- At/above the threshold, `POST /workspaces/{id}/sign` should reject if the client has fewer than the required number of distinct Workspaces on that Job with status beyond `introduction`.

- **[Open decision 10.13]**: should this be a hard block (cannot sign at all without 5 candidates) or a soft warning (client can override, but the override is logged)? Given it's a self-imposed standard rather than a legal one, a soft block with a logged override may be more appropriate than an absolute hard block — but this is the product owner's call.

- **[Open decision 10.14]**: when a client selects one candidate, should the non-selected candidates be notified only that they weren't selected, or also told the terms of the winning offer? Disclosing a competitor's exact price to losing bidders is standard in some formal public-tender contexts but could be commercially awkward or discourage competitive quoting in a private marketplace context — recommend defaulting to a simple non-selection notice without competitor pricing detail, unless there's a specific reason to disclose more.

- Correspondence and Workspace history with non-selected candidates is **never deleted** — it remains queryable indefinitely (consistent with the append-only AuditLogEntry principle in 2.5), both because it's the evidentiary basis for this threshold rule and because nothing else in this spec deletes historical negotiation data either.

## 6.8 Onramp/offramp provider

**[Open decision 10.11]** — no EU payment provider has been selected yet (candidates: Mollie, Stripe Connect, or a comparable PSD2-licensed provider). This choice affects the BankLink/FundingRequest/PayoutRequest implementation directly and should be resolved before that module's sprint.

## 6.9 Contact invitation channel (new)

Inviting an unlinked Contact (2.2) to join GoodCompany currently assumes email. **[Open decision 10.15]**: should WhatsApp and/or SMS also be supported as invitation channels? Email is a simple, low-cost integration (any transactional email provider). WhatsApp requires a WhatsApp Business API partnership, template message pre-approval, and a per-message cost. SMS is simpler than WhatsApp to integrate (any SMS gateway provider) but still carries a real per-message cost unlike email, and requires the Contact's phone number to be reliably captured (already modeled — Contact.phone, 2.2). Recommend shipping email-only for MVP 1 and adding SMS before WhatsApp if/when a second channel is justified, since SMS is the lower-effort addition of the two.

# 7. Non-Functional Requirements

## 7.1 Security

- All escrow-moving and payout-moving actions require step-up (re-)authentication.

- Terms-of-engagement versions and quotes are immutable once accepted; corrections happen via a new version/Change Order.

- AuditLogEntry table is append-only at the database permission level.

- Raw bank credentials/IBANs are never stored directly — only provider reference tokens (2.6).

## 7.2 Privacy & compliance

- GDPR applies (Dutch/EU users). Personal data stored off-chain with only hashes/commitments on-chain, so deletion requests can be honored without breaking on-chain proofs.

- Loan business-plan data is commercially sensitive — **[open decision 10.9]** on voter visibility (full documents vs. reviewed summary).

- Payment/bank coupling introduces PSD2-adjacent obligations even when using a licensed provider as intermediary — the provider carries the regulated-payment-institution burden, but GoodCompany still needs basic AML-awareness (e.g. flagging unusually large or frequent payouts) — see 10.11.

## 7.3 Performance & scale (MVP 1 targets)

- Design for low hundreds of concurrent active Negotiation Workspaces and low thousands of registered users at launch — a soft infra-sizing target, not an SLA.

- Reserve/vote read endpoints must be fast and cacheable (read-heavy relative to write frequency).

## 7.4 Availability

- No single point of failure for fund-moving operations (escrow, payout); prefer queued/retry patterns over synchronous chains that fail silently.

# 8. Edge Cases & Interim Processes

## 8.1 Negotiation deadlock / inactivity

Auto-expires after 21 days inactivity; both parties notified 3 days prior.

## 8.2 Disputes before the Dispute Center exists (MVP 1 interim process)

Either party flags a contract for manual review → `freeze()` on escrow → support ticket created outside the platform for a human mediator. **This role is always a hired, independent professional mediator — never a community-elected or peer role**, by deliberate design: someone from within the community carries the same risk of emotional or relational bias that made the dispute happen in the first place. The 2% platform fee is explicitly understood to fund this professional-mediation guarantee, alongside insurance/legal cover. There is no escalation ladder in MVP 1 (no self-service attempt first) — every flagged dispute goes straight to the mediator. This is a deliberate simplification that will not scale past low dispute volumes; see 12 for the MVP 2 self-service + AI-suggestion layer.

## 8.3 Race condition: multiple simultaneous quote acceptances

Enforce with an optimistic lock on Job (`selected_contractor_id` set atomically).

## 8.4 Loan default

No automated default detection. Manual conversion to `defaulted`, reduces Credit Reserve, feeds Community Health Score.

## 8.5 Currency & rounding

EUR only (10.4). Phase splits round using "largest remainder" method — sum must always exactly equal total_amount.

## 8.6 Withdrawal mid-negotiation vs mid-contract

Pre-contract withdrawal: no financial consequence. Post-contract withdrawal (active escrow): routes through the change-order/dispute path (8.2), never a simple status change.

## 8.7 Payout/funding failure (new)

A `failed` FundingRequest or PayoutRequest must never leave a Contract, Escrow, or Reserve in an ambiguous intermediate state — the triggering action (e.g. `escrow/fund`) must not fire until the provider confirms success. A failed PayoutRequest returns the user to `initiated` for retry with a different bank link if needed; funds never leave GC custody on a failed attempt.

# 9. Screens Required Per Module

- **Marketplace — Jobs**: post-job form, job list/search with filters, job detail (client/contractor views)

- **Marketplace — Contacts**: contact list (grouped, grey/teal status), add/edit contact, group management

- **GoodTrade — Negotiation Workspace**: stage-stepper, introduction/chat, technical intake Q&A, terms editor (version history), quote view/builder, contract preview & signing

- **GoodTrade — Contracts**: "My Contracts" list, contract detail with audit trail, milestone tracker, change-order flow

- **GoodTrade — Escrow**: funding confirmation, milestone approve/reject, release confirmation

- **Payment**: link bank account, funding flow, payout request + status, transaction history

- **Profile**: edit profile, public profile view, portfolio management, reviews list, and a unified "My Work" view combining jobs posted (as client) and contracts executed (as contractor), both with history — the same underlying Job/Contract data as Marketplace/GoodTrade, presented per-person rather than per-module so a user isn't forced to switch modules to see their own overview

- **Community Bank**: reserve dashboard (4 reserves + thresholds), loan application form, loan detail + voting UI, capital flow dashboard

- **Notifications**: transactional toasts/inbox (minimal)

- **Dashboard**: status overview (active negotiations, active contracts, escrow snapshot, Community Bank snapshot, bank-link status)

# 10. Open Decisions for the Product Owner

Resolved during scoping conversations (no longer open): dispute mediator role (always a hired professional, never community-based — 8.2); organization reserve fraction (0.02% of contract value — 6.1); identity approach for MVP 1 (bare Identus + DigiD — 6.6); Contacts/Inner Circles in scope for MVP 1 (yes — 2.2); bank coupling in scope for MVP 1 (yes, bidirectional — 2.6); community voting uses targeted random-sample invitations scaled to loan amount, not a flat open-to-all quorum — done specifically to bound on-chain transaction volume at scale (6.2); multi-candidate governance threshold adopted as GoodCompany's own standard, explicitly *not* an EU legal requirement for private transactions (6.7); negotiation correspondence with non-selected candidates is retained indefinitely, never auto-deleted (6.7).

Still open:

- Should stale `open` jobs auto-expire, or stay open indefinitely?

- When a client accepts one candidate, do all other open Workspaces on that Job auto-close, or get marked "not selected" while staying open?

- How are already-approved/paid milestones treated when a later Change Order changes the total contract amount?

- Is there an admin/compliance review gate before a loan application goes to public vote?

- Is the 2% platform fee deducted once at final release, or proportionally per milestone?

- Is a simple flat loan interest rate acceptable for MVP 1, or is a specific rate model required?

- Do loan/vote participants see full business-plan documents, or only a reviewed summary?

10.4. Confirm EUR-only scope for MVP 1 (no multi-currency).

- Which EU payment provider (Mollie, Stripe Connect, or equivalent PSD2-licensed provider) for the onramp/offramp module — this blocks the Payment module sprint directly.

- The required-votes tiers, audience multiplier (3x), and hard cap (500) in 6.2 are illustrative defaults with no usage data behind them yet — expect to revisit once real application volume and response rates are observed.

- Multi-candidate threshold (6.7): hard block on signing, or soft warning with logged override?

- Multi-candidate threshold (6.7): do non-selected candidates learn the winning offer's terms, or just that they weren't chosen?

- Contact invitation channel (6.9): email-only for MVP 1, or also SMS/WhatsApp (SMS materially lighter to add than WhatsApp)?

- Invoice external_reference_id shape (2.5): sequential per-user numbering (matches Dutch bookkeeping/tax conventions) vs. a simpler UUID — decide before Invoice generation is built, since retrofitting sequential numbering later is awkward.

# 11. Glossary

| **Term** | **Definition** |
| --- | --- |
| Marketplace | The discovery layer: posting, searching, and matching jobs and contractors, plus Contacts. |
| GoodTrade | The transaction layer: Negotiation Workspace through Escrow to sign-off. |
| Community Bank | The cooperative treasury fed by GoodTrade's platform fee, governed by community vote. |
| Negotiation Workspace | The structured, staged conversation environment between client and candidate, prior to a quote. |
| Escrow | An account where payment is held until agreed conditions are met. |
| Sub-escrow | An escrow tied to a specific sub-transaction, e.g. a Community Bank loan directed to a supplier. |
| Onramp / Offramp | Moving money from a personal bank account into GC custody (onramp) or back out (offramp). |
| BankLink | A verified reference to a user's external bank account, held via a licensed payment provider — never raw IBAN/credentials. |
| Contact / Inner Circle | A user's own organized address book of GC-relevant relationships, grouped by role (e.g. suppliers, tradespeople). |
| Liquidity Utilization Ratio (LUR) | Outstanding credit ÷ total Community Bank reserve. |
| Community Health Score (CHS) | Composite score (liquidity, default rate, cash flow, reserves) determining Community Bank phase transitions. |
| Required votes | The number of responses a loan application must collect to resolve — scales with loan amount (6.2). Replaces a flat "quorum" concept from earlier drafts. |
| VoteInvitation | A record inviting one specific, randomly-sampled eligible member to vote on one specific loan application — only invited members may vote, which bounds on-chain transaction volume at scale. |
| Read model | A query/view assembled from underlying tables for UI convenience — not a source-of-truth table. |
| Step-up auth | Re-authentication immediately before a sensitive action, even within an already-logged-in session. |
| Hyperledger Identus | The SSI/DID framework underlying both MVP 1's bare identity layer and, later, the full AVI product. |
| Organization Reserve | GoodCompany's own operating fund, funded by a sub-fraction of the platform fee — see Appendix A. |

# 12. Suggestive Roadmap — MVP 2 through 5+

*Non-binding. Serves as a memory aid for future prioritization; order within each MVP is not fixed. Raised during MVP 1 scoping but deliberately deferred.*

**MVP 2**

- Dispute Center: self-service layer + AI/ML-generated settlement suggestion, as a step *before* escalation to the hired mediator

- Innovation Fund: functional investment slots + allocation/voting mechanics (a read-only unlock-progress indicator can ship earlier, cheaply, using the existing Community Health Score calculation)

- Plugin Marketplace: public launch of the marketplace itself (architecture anticipated from MVP 1)

- Full Project Execution module: task boards, document vault

- Contacts/Inner Circles: acquisition/re-engagement outreach to past clients or contractors (must stay relationship-toned, never discount-spam)

- Third-party bookkeeping connector: the actual polling/fetch integration consuming the `GET /invoices` endpoint (2.5/4.6) — the endpoint and Invoice data model exist from MVP 1, but no bookkeeping software is actually wired up to it yet.

- Job applicant-flow throttling: a client-configurable cap on how many candidates they're actively negotiating with at once (e.g. a personal preference, bounded by a platform-wide maximum), with the Job visually/functionally paused ("in onderhandeling — reageren tijdelijk niet mogelijk") once that cap is reached, and automatically reopened to new candidates if one drops out. Goal: avoid a client being flooded with far more responses than they can realistically evaluate, while being transparent to prospective candidates about why they can't respond right now. Needs its own design pass (exact cap defaults, how "reopening" interacts with fairness/ordering) before being built.

**MVP 3**

- Full audit/compliance export tooling

- Full AVI rollout on top of MVP 1's bare Identus foundation (three-stage bootstrap, six-month re-attestation, tiered backup)

- Achievements/Badges: non-tradeable milestone recognition (e.g. revenue or completed-job thresholds) — explicitly *not* a cryptocurrency or tradeable token, purely a gamification/recognition layer

- Community roadmap voting: extending the existing vote mechanism to let the community help prioritize future features/products

**MVP 4**

- Additional bank-style products (crypto purchase, savings, individual angel investing) — introduced only via community roadmap vote, not unilaterally

- Retirement / "golden handshake" provision funded from Community Bank profits, scaled to a member's activity history and tenure

- Development-aid track within the Innovation Fund, structured as a double-bottom-line investment (financial return + verified local impact)

**MVP 5+**

- Open Midnight stake pool for PING (distinct from GoodCompany's own closed organizational stake pool — see Appendix A)

- A "buy crypto" onboarding product that explains GoodCompany's Cardano/Midnight staking activity and lets users participate directly

**Future implementations to consider (long-term platform vision, non-binding)**

- Lightweight, built-in productivity tools — a calendar, a Kanban-style planner, a mindmap-based workflow builder — positioned as an accessible, simplified alternative to enterprise tools like Monday.com or SAP. The goal is not to compete for enterprise market share (those tools serve a different, larger-organization segment), but to make equivalent working capability available for free to individuals and small businesses who currently can't justify that spend. Likely delivered as first-party or third-party modules through the Plugin Marketplace architecture (already anticipated from MVP 1) rather than built as core GoodTrade functionality, so the core stays simple for users who don't need it.

- Profile presentation page: a shareable mini-site/promotional page generated from a user's existing PortfolioItem data (2.1) — a presentation layer on top of data that's already modeled, not a new data concept.

- These are explicitly long-term direction-setters, not commitments — logged here so the current architecture (particularly the Plugin Marketplace boundary) is kept compatible with them without needing to build any of it now.

# Appendix A — GoodCompany Organization

*This appendix documents how the GoodCompany organization itself sustains its own operations. It is intentionally kept separate from the Community Bank material in Section 2.7/6.1, which is written for community-facing transparency about funds that belong to and are governed by the community. The organization**'**s own operating economics are a different accountability relationship and are documented here so the two are never accidentally merged in product communication.*

## A.1 Why a separate organizational reserve exists

GoodCompany's guiding principle is that platform usage stays free for the user — no subscription, no upfront cost, payment only occurs once a job's value is actually realized (the 2% fee on completed contracts). This is a deliberate choice: charging upfront, or requiring the kind of return an angel-investor-funded product typically demands, would exclude exactly the users (e.g. a self-employed tradesperson in a lower-income region) the platform is meant to serve. To keep that "free to use" principle sustainable without external investors dictating pricing, the organization needs its own minimal, self-generated income stream to cover operating and infrastructure costs — hence a fraction of the existing fee, not an additional charge to users.

## A.2 The mechanism

- Of the 2% GoodTrade platform fee (which itself flows to the Community Bank, see 6.1), **1% of that fee amount** — i.e. **0.02% of the underlying contract value** — is separately routed to the GoodCompany Organization Reserve.

- Worked example: a €1,000 contract generates €20 (2%) to the Community Bank. Of that €20, 1% (€0.20) is further routed to the Organization Reserve.

- At current (approximate) prices, €0.20 is sufficient to acquire roughly 1 ADA — small per-transaction, but the intent is aggregate growth across many transactions, not per-transaction significance.

- Illustrative scale: at a hypothetical 10 million active EU users each generating ~100 invoices/year (a plausible number for freelancers/self-employed tradespeople, who are a natural early-adopter segment given the platform's built-in dispute-insurance and legal-support value relative to typical paid marketplace subscriptions), that fraction alone would generate roughly €2 million/week toward the Organization Reserve, while the Community Bank itself would receive roughly €200 million/week. This is presented purely to illustrate why even a minuscule fraction is viable at scale — it is not a growth projection or commitment.

## A.3 What the reserve is used for

- The Organization Reserve is used to fund **GoodCompany****'****s own Cardano and Midnight stake pools** — a closed/internal stake pool set (not open for public participation, unlike PING's stake pool model, see A.4).

- Staked ADA generates yield that supports ongoing organizational costs (infrastructure, protocol fees, continuity).

- Staked Midnight generates **dust**, which the GoodCompany organization can use to cover the dust cost of processing its own on-chain operations (e.g. supporting the transaction volume the platform itself generates).

- This is explicitly a **cost-covering mechanism, not a profit-extraction mechanism** — it exists to let the organization remain self-sufficient without needing external investment or user subscription fees, not to generate distributable profit. Any product communication about this reserve should preserve that distinction clearly, since it is core to why GoodCompany can credibly promise the platform stays free to use.

## A.4 Relationship to PING's stake pool

GoodCompany's organizational stake pool (A.3) is **closed** — funded solely by the Organization Reserve, used solely for the organization's own operational needs. PING's stake pool (a separate, later product — see roadmap, MVP 5+) is intentionally **open**: any community member can stake their own Midnight into it and earn a share of the dust revenue it generates from liveness-check usage. These must remain architecturally and economically distinct — a developer should not merge them into a single pool with blended rules, since the two have fundamentally different participants, risk profiles, and payout logic.

## A.5 Strategic rationale (non-technical, for context)

GoodCompany is deliberately being built through the Cardano community rather than with commercial/angel investment, specifically to avoid external pressure to introduce subscription pricing or paywalls that would exclude lower-income users — a stated design goal, not an incidental preference. The Organization Reserve mechanism above is what makes that strategic choice financially viable without contradiction: the organization can sustain itself purely from the economic activity the platform generates, once that activity exists at scale, rather than needing revenue in advance of it.