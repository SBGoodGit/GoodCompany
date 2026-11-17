# GoodCompany — MVP1 Build Specification v3

<!-- v3.000 (17-11-2026): Eerste versie van Build Spec v3 — vervangt v2; verwerkt besluitenlogboek v1.004 (D1–D15), Escrow Protocol v1, de onverwerkte juli-besluiten en de tegenstrijdigheden uit de projectreview -->
<!-- v3.001 (17-11-2026): Besluiten van de product owner over P1, P6, P7, P10, P12–P20, OD3 en OD11 verwerkt; P2, P3, P4, P5, P8, P9 en P11 blijven open; nieuwe voorstellen P21–P23 en open punten toegevoegd -->
<!-- v3.002 (17-11-2026): Besluiten over O6–O18, P3, P4, P5, P21–P23 verwerkt; adviserend Mediator-model vervangt bindende beslissing; naam GoodTrade; fee-route via collect-wallet; nummering gelijkgetrokken met het besluitenlogboek -->
<!-- v3.003 (17-11-2026): O1 (functioneel uitgangspunt), O19 (fee 2% van de contractwaarde, materialenreservering intact), P2, P8, P9, P11 verwerkt; materials_delivered-mijlpaal vervangen door statusupdate materials_ordered; feemomenten gescheiden; nieuwe open punten O24–O27 -->
<!-- v3.004 (17-11-2026): Fee vooraf gereserveerd als vast deel (2%) van het totaalbedrag, geen fee over leveranties; inhouding bij uitbetalingen vervalt; O27 gesloten -->
<!-- v3.005 (17-11-2026): Feeregel vereenvoudigd: 2% bevroren bij storting en in één keer overgemaakt bij afronding van de opdracht -->
<!-- v3.006 (17-11-2026): O24 (reactietermijn alleen voor volledige oplevering) en O26 (holdback ook bij 0 dagen garantie) verwerkt; O25 uitgesteld -->
<!-- v3.007 (17-11-2026): Geaccepteerd door de product owner -->
<!-- v3.008 (17-11-2026): Correcties na de bouw: eindfase minimaal 10%, OD5 administratieve controle, OD6–OD9 voorlopig, foto-uploads als geplande uitbreiding -->

*Marketplace · GoodTrade · Community Bank*

**Status of this document: v3.008, accepted by the product owner on 17 November 2026, with corrections after the MVP1 build (D27). This is the single buildable specification for MVP1. O25 (client reputation score) is deferred and does not block the build.**

---

## 0. Purpose, authority and how to read this document

### 0.1 Purpose

This is the single buildable specification for MVP1. It replaces Build Spec v2 and merges into one document:

- the decisions of 16–17 November 2026 (Decision Log v1.010, D1–D26), including the product owner's decisions on proposals P1–P23 and open points O1, O6–O20;
- the GoodCompany Escrow Protocol v1 (functional target architecture, D6);
- the July decisions that were never processed in v2 (Project Review §2.2);
- the resolution of the contradictions between documents (Project Review §2.3).

After acceptance, the Warranty/Holdback Addendum and the Reputation Review Addendum are retired as separate sources: their content is in this document.

### 0.2 Order of authority

Where sources conflict, the higher one wins.

1. Decision Log v1.010 (`claude/GoodCompany_Decision_Log_2026-11-16.md`). Open points use the log's O-numbers in both documents
2. GoodCompany Escrow Protocol v1 — Architecture Proposal (Claude doc)
3. This Build Spec v3 (accepted 17 November 2026)
4. Codex documents, registries, Core Design Principles, Build Spec v2 — source material, partly outdated

### 0.3 Status labels

Every rule carries one of the project's status labels. A rule without a label in a table inherits the label of its section heading.

| Label | Meaning |
|---|---|
| **Confirmed** | Laid down in a primary source (Build Spec v2, briefing, addendum, whitepaper) and not superseded |
| **Confirmed (Derived)** | Not stated literally, but follows directly from several confirmed sources |
| **Decision Confirmed** | Decided by the product owner; cited by D-number, by an accepted P- or OD-number, or by the July session overview |
| **Illustrative Default** | A configurable starting value with no usage data behind it |
| **Proposed** | Not decided. Written into this spec so it is buildable; the product owner accepts or changes it. All are collected in §13.1 |
| **Open** | Unresolved question; no value is assumed. Collected in §13.2 and §13.3 |
| **Dependency** | An external fact that must be verified before it is relied on. Never stated as a fact. Collected in §13.4 |

### 0.4 What changed against v2

| v2 section | Change in v3 | Basis |
|---|---|---|
| Module name "GoodTrade" | Kept as the name of the trade domain (§1.1) | D23 |
| §1.1, §6.6 Identity (Identus + DigiD) | Email identity; no DigiD (§7.6) | D1, D22 |
| §2.5, §3.4 Escrow entity and states | Replaced by protocol contract data and two transition tables, with holdback fields (§3.5, §4) | D6, Addendum |
| §2.6, §4.7 BankLink, FundingRequest, PayoutRequest | Removed from the escrow path (§2.2) | D2, D4 |
| §4.4, §4.5 Escrow and Change Order endpoints | Endpoints prepare actions for the parties to sign; they do not move money (§5.4) | D6 |
| §5 On-chain layer | Replaced by a chain mapping that is not built in MVP1 (§6) | D4, D15 |
| §6.1 Fee | 2% of the total contract amount, frozen at deposit, transferred when the job is completed (§7.1) | D10 |
| §6.8 Payment provider | Replaced by settlement asset and chain as dependencies (§6.3) | D2, D5 |
| §8.2 Disputes | Completion and dispute procedure with three mediator triggers; the Mediator gives non-binding advice (§4.3, §8) | D7–D9, D17, D21 |
| §8.5 Currency | One currency and one exact amount fixed at signing (§7.7) | D5 |
| §8.7 Payout/funding failure | Replaced by ledger confirmation rules (§5.4) | D6 |
| §10 Open decisions | Rebuilt from the log (§13) | Log O1–O27 |

---

## 1. MVP1 scope

### 1.1 Domains

| Domain | Covers | Status |
|---|---|---|
| **Marketplace** | Accounts, profiles, contacts, job posting, search | Confirmed (v2 §0) |
| **GoodTrade** | Negotiation Workspace → Contract → Escrow → completion, warranty, disputes | Name: Decision Confirmed (D23). Other organisations or projects using the name outside GoodCompany are not relevant to this internal product name |
| **Community Bank** | Reserves, loans, community voting | Confirmed (v2 §0). Treated as a separate domain; this spec describes its interface with the trade cycle and the MVP1 simulation, not its legal form (O12) |

AVI is a separate domain. This spec describes only the identity interface MVP1 needs (§7.6).

### 1.2 In scope

**Marketplace**
- User accounts and profiles; contacts and Inner Circles; private collaboration preference
- Job posting, search and filtering, job status management

**GoodTrade**
- Negotiation Workspace, all five stages
- Contracts with frozen snapshot and append-only audit trail
- **Simulated escrow** implementing Escrow Protocol v1: funding, lump-sum and phased payment, advance milestones, a separately reserved materials budget with simulated supplier payments and a `materials_ordered` status update, holdback and warranty tranches, Change Orders including client surplus, repair agreements, nested contracts
- Completion requests with the 14-day response window
- Dispute path: objection, settlement between the parties, three mediator triggers with automatic activation on (b) and (c), mediation, non-binding advice
- Minimal mediator console (§8.6) — Decision Confirmed (P15)
- Final evaluation, reviews, reputation with Rookie Stage
- Invoices with a stable external reference

**Community Bank (simulated balances)**
- Four reserves, loan applications, sampled community voting, sub-escrow to supplier, repayments
- Fee collection account and hourly batch transfer

**Cross-cutting**
- Transactional notifications; basic dashboard; admin settings layer for configurable values

### 1.3 Out of scope

| Item | Basis |
|---|---|
| Any blockchain, wallet, stablecoin, bridge or payment provider | D15, Decision Confirmed. MVP1 scope must not be expanded to implement blockchain functionality |
| Real money movement of any kind; bank coupling, on-ramp, off-ramp | D2, D4 |
| DigiD; Hyperledger Identus deployment; full AVI | D1, D22 |
| Binding dispute decisions by the Mediator | D21 |
| Executing a court ruling against the escrow | Required as functional principle (D21, O1); the legal and technical construction is open, so MVP1 has no execution path |
| Real supplier payments; shielding of supplier payments so that they do not reveal the contractor's margin | P10: MVP1 simulates supplier payments; shielding belongs to the target architecture |
| Dispute Center self-service layer and AI suggestions | Confirmed (v2 §1.2), MVP2 |
| Automated missed-payment detection for loans | Decision Confirmed (July), MVP2/3 |
| Innovation Fund slots, Plugin Marketplace, full Project Execution module, compliance export tooling, badges, outreach, extra bank products | Confirmed (v2 §1.2) |
| Dutch frontend translation | D3: follows later. The build is in English |

### 1.4 Foundational rules the build must never break

| Rule | Status |
|---|---|
| Terms before Money: no price before agreed terms | Confirmed (Core Design Principles) |
| Escrow before Execution: execution may not start before the escrow is funded | Confirmed |
| Silence is never approval and never leads to automatic payout | Decision Confirmed (D8) |
| The mediator has no role in normal settlement | Decision Confirmed (D7) |
| The escrow can pay only the client, the contractor, suppliers from the reserved materials budget, and the fee collection account | Confirmed (Derived) from Protocol v1; supplier destination added by P10 |
| The Mediator gives non-binding advice only, has no signing role in the escrow and cannot force or release a payment | Decision Confirmed (D21) |
| Disputes are handled by an independent hired professional, never a peer. The Mediator has no interest in the outcome and represents neither party | Confirmed (v2 §8.2); Decision Confirmed (D21) |

---

## 2. Architecture for MVP1

### 2.1 The ledger boundary

**Decision Confirmed (D6, D15).** The escrow business rules live behind one interface, the **Escrow Ledger**. MVP1 ships one implementation: `SimulatedLedger`. A later Midnight implementation, or an interim Cardano implementation if deliberately chosen, replaces this one module. No business rule may live outside it in a way that a chain change would alter.

```
UI / API  →  GoodTrade service (prepares actions, collects signatures)
                     ↓ submit(action, signatures)
              Escrow Ledger interface
                     ↓
              SimulatedLedger  (MVP1)   |   MidnightLedger (target)   |   CardanoLedger (optional interim)
```

Rules for the boundary:

| # | Rule | Status |
|---|---|---|
| L1 | The GoodTrade service never changes an escrow balance directly. It submits a signed action; the ledger validates and applies it | Confirmed (Derived), Protocol v1 |
| L2 | The ledger rejects any action whose signers or conditions do not match the transition tables in §4 | Confirmed (Derived) |
| L3 | Escrow state shown in the UI is read back from the ledger, not from a provider callback or an application flag | Confirmed (Derived), Protocol v1 "What the simulation must mirror" |
| L4 | Nothing happens by itself. A time-based entitlement means "claimable by the entitled party from a given moment". System jobs may open cases and send notifications; they do not pay out | Confirmed (Derived), Protocol v1 design rules |
| L5 | The ledger stores no personal data: party references, amounts, dates, flags and the hash of the contract snapshot | Confirmed (Derived) |

### 2.2 What is removed

`BankLink`, `FundingRequest`, `PayoutRequest`, their endpoints and the payout state machine (v2 §2.6, §3.6, §4.7, §8.7) do not exist in v3. In the target architecture fiat enters and leaves through external regulated providers, outside GoodCompany (D4). In MVP1, users receive a **simulated balance** for demonstration and testing; it is created by an admin or seed function and has no relation to real money.

### 2.3 Signatures in MVP1

**Proposed** as implementation of D6 for the simulation. A "signature" in MVP1 is a server-recorded attestation: user id, action hash, timestamp, created only after step-up authentication. It stands in for the wallet signature of the target architecture. GoodCompany holds no key that can sign on behalf of a party; the simulation must keep that property by never creating a party attestation without that party's step-up authentication.

### 2.4 Contract content storage

**Decision Confirmed (P17).** MVP1 stores contract content (messages, terms, quotes, evidence) in the application database, encrypted at rest, and records a SHA-256 hash of the frozen contract snapshot in the ledger.

This is the MVP1 arrangement, **not the privacy architecture**. The target design is decided (D18): contract content encrypted off-chain, hashes of relevant data on-chain, access keys held by the parties, selective access for the Mediator to what a dispute requires. It is not built in MVP1. Storage technique and key management remain open technical work (T9, O10). Encryption at rest protects against a lost disk, not against GoodCompany itself: in MVP1 GoodCompany can read contract content, and the hiding of supplier payments from the client (§7.3) is access control only.

---

## 3. Data model

Field types are indicative. Every entity has `id` (UUID), `created_at`, `updated_at`. Monetary amounts are integers in minor units of the contract currency.

### 3.1 Identity and profile

**User**

| Field | Type | Notes | Status |
|---|---|---|---|
| email | string | unique, verified | Confirmed |
| phone | string, nullable | | Confirmed |
| identity_level | enum[email_verified] | single value in MVP1; extensible for later identity verification | Decision Confirmed (P5, D22) |
| did | string, nullable | reserved for AVI; always null in MVP1 | Decision Confirmed (P5, D22) |
| role | enum[client, contractor, both, mediator, admin] | `mediator` and `admin` accounts are created and assigned by an admin, never self-selected | Decision Confirmed (P15) for `mediator` |
| status | enum[active, suspended, deleted] | | Confirmed |

v2 fields `identus_did` and `digid_verified` are removed (D1).

**Profile** — as v2 §2.1: `account_type`, `display_name`, `description`, `expertise_tags`, `portfolio_items`, `stats_completed_jobs`, `stats_satisfaction_rate`, `stats_avg_response_time`. Changed and added:

| Field | Type | Notes | Status |
|---|---|---|---|
| reputation_score_as_contractor | decimal | computed from reviews received as contractor; replaces v2 `reputation_score` | Decision Confirmed (P8, D24) |
| reputation_score_as_client | decimal | computed from reviews received as client | Decision Confirmed (P8, D24). Formula open (O25) |

Further fields:

| Field | Type | Notes | Status |
|---|---|---|---|
| reputation_public | bool, derived | per score: true once the user has `rookie_reviews_required` completed contracts in that role | Decision Confirmed (Reputation Review Addendum) |
| warranty_offered_rate | decimal, derived | completed contracts with warranty > 0 ÷ all completed contracts | Confirmed (Addendum §7) |
| warranty_avg_days | int, derived | | Confirmed (Addendum §7) |
| warranty_completion_rate | decimal, derived | warranty periods without claim ÷ completed warranty periods, excluding 0-day | Confirmed (Addendum §7) |

**PortfolioItem** — as v2.

**Review**

| Field | Type | Notes | Status |
|---|---|---|---|
| contract_id, reviewer_id, reviewee_id | ref | one review per party per contract, enforced at DB level | Confirmed |
| rating | int 1–5 | | Confirmed |
| motivation | text | **required when rating ≤ 3**, optional for 4–5; minimum length configurable (indicative 100 characters); private to reviewer and reviewee | Decision Confirmed (Reputation Review Addendum) |

Reviews cannot be removed or appealed (Model B). No cooldown.

#### 3.1.1 Reputation score

**Separate scores — Decision Confirmed (P8, D24).** A user has a reputation score as contractor and a separate one as client. Contractor score: `weighted_avg(rating) × reliability_factor` — Confirmed (v2 §2.1.1), with `reliability_factor` = on-time delivery rate over the last `reliability_factor_window` contracts, floor `reliability_factor_floor`. The client score uses ratings received as client; whether and how a reliability factor applies to it is open (O25).

**Rookie Stage — Decision Confirmed.** The score is computed from the first completed contract and counts internally from then on. It is shown publicly only after `rookie_reviews_required` completed contracts. Before that the public profile shows the number of completed contracts and verification badges, no score.

**Warranty and reputation — Open (O25).** The Addendum awards "80% of reputation points at Completion, 20% at Warranty Completed". The formula above has no points to split (Project Review §2.3, item 2). P8 as decided concerns separate scores and does not settle this. Until decided, warranty behaviour shows only through the three warranty profile metrics in §3.1.

### 3.2 Contacts

As v2 §2.2: `Contact`, `ContactGroup`, `ContactGroupMembership`. Added:

| Field | Type | Notes | Status |
|---|---|---|---|
| Contact.collaboration_preference | enum[none, prefer, avoid] | Private Collaboration Preference. Visible only to the owner. No block, no notification, no effect on the other party's reputation or visibility. May influence the owner's own matching suggestions | Decision Confirmed (July #5) |

### 3.3 Jobs

**Job** — as v2 §2.3, with:

| Field | Notes | Status |
|---|---|---|
| indicative_budget | Search and matching criterion only. **Never returned to any contractor**, on the listing or in a workspace. A price enters the conversation only through a Quote | Decision Confirmed (July #3, Variant C) |
| selected_contractor_id | set atomically when a contract is signed (race guard, §9.3) | Confirmed (v2 §8.3) |

There is no "candidate selected" status. Selection is implied by offering the contract for signing (Decision Confirmed, July #1).

**JobResponse** — as v2.

### 3.4 Negotiation Workspace

**NegotiationWorkspace** — as v2 §2.4, with `outcome` extended:

`outcome`: enum[pending, accepted, rejected, withdrawn, expired, **closed_other_selected**]

**Message**, **TechnicalIntakeAnswer** — as v2. Intake questions come from a per-category question library plus a free custom field (Confirmed, Codex Negotiation clause 2). The content of the library is not specified (Open, §13.2).

**TermsOfEngagementVersion** — as v2, with these changes:

| Field | Type | Notes | Status |
|---|---|---|---|
| warranty_period_days | enum[0, 15, 30, 90], default 30 | With 0 days the holdback is released once both parties have agreed the final payment (§7.2) | Confirmed (Addendum); Decision Confirmed (O26) |
| holdback_percentage | fixed 10 | Mandatory. No longer a choice between 5, 10 and 15 | Decision Confirmed (P9, D25). Replaces the Addendum's choice |
| payment_phases | array[{sequence, kind, percentage, description, evidence_required}] | Phases, `materials_budget_percentage` and the 2% fee together sum to 100% of the contract value. Phase amounts are what the contractor receives. `kind`: enum[advance, work, final]. Exactly one `final`, last in sequence, and **at least 10% of the contract value**, so the mandatory holdback can always be withheld in full. There is no materials milestone | Decision Confirmed (P10, D12, D25, D27) |
| materials_budget_percentage | decimal, nullable | share of the contract value reserved for supplier payments, proposed by the contractor and approved by the client's signature on the terms. Changes only through a Change Order | Decision Confirmed (D12; Sander's direction of 16 November: percentage set in the quote and payment terms) |
| execution_period_days | int | agreed execution period, accepted by both parties before signing. Also sets the Change Order expiry (§4.4) | Decision Confirmed (P14) |
| mediator_id | ref → User(role=mediator) | assigned by an admin; both parties accept the mediator by accepting the terms | Confirmed (Derived), Protocol v1 "Parties and keys"; assignment by admin Decision Confirmed (P15) |


Advance percentage — **Decision Confirmed (OD3).** The contractor proposes the percentage of an `advance` phase in the payment schedule. The client sees it and accepts or rejects it before signing and funding. GoodCompany sets no maximum, standard or default range. Once the contract is signed, the percentage is fixed.

**Quote** — as v2, with:

| Field | Type | Notes | Status |
|---|---|---|---|
| total_amount | int (minor units) | the full amount the client places in escrow, including any materials component | Decision Confirmed (D10) |
| currency | string | fixed at signing with the exact amount (§7.7) | Decision Confirmed (D5) |
| materials_amount | int, nullable | the agreed selling price of materials. A quote-display figure: one amount, never a breakdown of purchase costs, supplier invoices or margin. **Not** the source of supplier payment amounts and not the reserved materials budget (§7.3). The full contract amount, including materials, is funded | Decision Confirmed (D12, P20) |
| phase_amounts | array[{sequence, amount}] | derived from `payment_phases × total_amount`, largest-remainder rounding | Confirmed |

A quote has no expiry of its own. It stays valid while its workspace is active (Decision Confirmed, July #4).

### 3.5 Contract, escrow and execution

**Contract**

| Field | Type | Notes | Status |
|---|---|---|---|
| workspace_id, job_id, client_id, contractor_id | ref | | Confirmed |
| parent_contract_id | ref, nullable | set for a nested contract (§4.5) | Decision Confirmed (D11) |
| terms_version_id, quote_id | ref | frozen snapshot at signing | Confirmed |
| snapshot_hash | string | SHA-256 of the frozen terms and quote; recorded in the ledger | Confirmed (Derived), Protocol v1 |
| mediator_id | ref | copied from the accepted terms; replaceable by both parties together | Confirmed (Derived), Protocol v1 |
| status | enum[awaiting_funding, active, completed, closed, ended_unfinished] | see §4.1 | Confirmed (Derived); v2 had only `active`, `completed` |

**EscrowAccount** — the contract data held by the ledger. One per contract. Replaces v2 `Escrow`.

| Field | Type | Notes |
|---|---|---|
| contract_id | ref | 1:1 |
| currency | string | |
| principal_total | int | sum of all deposits: the quote total plus positive Change Orders that took effect |
| client_surplus | int | amount removed from the contract by negative Change Orders. Earmarked as the client's entitlement, unavailable to the contractor, settled to the client at final approval or in the settlement that ends the contract. Not a holdback (P12, P13) |
| contract_value | int, derived | `principal_total − client_surplus` |
| fee_rate | decimal | copied from configuration at funding; fixed for this contract |
| fee_reserved | int | 2% of the contract value, frozen at deposit (§7.1) |
| fee_final | int | not used; the whole fee is transferred at completion (§7.1) |
| materials_budget | int | `materials_budget_percentage × contract_value`. Reserved in full for supplier payments; never reduced by the fee (§7.3) |
| paid_to_suppliers | int | cumulative supplier payments from the materials budget. Never shown to the client |
| paid_to_contractor | int | cumulative |
| refunded_to_client | int | cumulative, including returned fee and settled client surplus |
| fee_transferred | int | cumulative, moved to the fee collection account |
| balance | int, derived | deposits − paid_to_contractor − paid_to_suppliers − refunded_to_client − fee_transferred |
| holdback_amount | int | `contract_value × 10%`; recalculated on every Change Order that takes effect |
| warranty_start_date | date, nullable | set at final approval |
| holdback_tranches | array[{sequence, claimable_from, amount, status[pending, claimed, frozen, reassigned]}] | derived from the schedule in §7.2 |
| disputed_amount | int | 0 when no dispute is open. The dispute **flag** is `disputed_amount > 0` or an open DisputeCase; there is no separate frozen status |
| mediator_id | ref | |
| mediator_active | bool | false until one of the three triggers in §4.3 fires |
| snapshot_hash | string | |

**Milestone**

| Field | Type | Notes |
|---|---|---|
| contract_id, sequence, kind, description | | `kind` as in `payment_phases`: advance, work, final |
| amount | int | principal share, gross of fee |
| evidence_required | text | what makes a completion request formal |
| status | enum[pending, requested, disputed, paid] | v2 `submitted/approved/rejected` are replaced: a rejection is an objection (§4.3) |

**CompletionRequest**

| Field | Type | Notes | Status |
|---|---|---|---|
| contract_id, milestone_id | ref | one open request per milestone | Decision Confirmed (D8) |
| evidence | text in MVP1; `array[file ref]` reserved | a request is formal only once the agreed evidence is supplied. Photo and file uploads are a planned extension (D27) | Decision Confirmed (D14, D27) |
| evidence_hash | string | recorded in the ledger | Confirmed (Derived) |
| requested_at | timestamp | starts the response window and the payment deadline | Decision Confirmed (D8) |
| response_due_at | timestamp | `requested_at + completion_response_days`; final delivery only | Decision Confirmed (D8, P2, O24) |
| payment_deadline_at | timestamp | `requested_at + payment_deadline_days` | Decision Confirmed (D8c) |
| awaiting_party | enum[client, contractor] | whose turn it is; drives the silence timer | Confirmed (Derived) from D8b |
| last_party_action_at | timestamp | | |
| status | enum[open, approved, objected, superseded] | | |

**ChangeOrder**

| Field | Type | Notes | Status |
|---|---|---|---|
| contract_id, requested_by | ref | | Confirmed |
| description | text | what changes | Confirmed |
| motivation | text, required | why it is needed | Decision Confirmed (July) |
| amount_delta | int | positive: extra amount deposited in the same action. Negative: added to `client_surplus`; nothing leaves the escrow until final settlement (§4.4) | Confirmed; negative handling Decision Confirmed (P12, P13) |
| milestone_changes | array | unpaid milestones only: work description, description and amount. Paid milestones are never changed | Decision Confirmed (P13) |
| response_note | text | optional on acceptance, **required on rejection** | Decision Confirmed (July) |
| expires_at | timestamp | `created_at + min(execution_period_days, change_order_expiry_max_days)` | Decision Confirmed (July #7, P14) |
| status | enum[proposed, effective, rejected, expired, withdrawn] | no "accepted, unfunded" state, see §4.4 | Decision Confirmed (P12) |

Each Change Order has its own linked conversation, which is part of the contract's audit file.

**RepairAgreement** — contract_id, dispute_case_id, description, held_amount, signed_by_client_at, signed_by_contractor_at, status enum[proposed, effective, completed]. Decision Confirmed (D11).

**SupplierPayment** — contract_id, supplier_id (ref → User), amount, signed_by, signed_at, delivery_status enum[pending, delivered, disputed]. Drawn only from the materials budget, paid to the supplier in full. Visible to the contractor, and to the mediator in a dispute; never to the client, who sees only the agreed materials amount. Decision Confirmed (D12, P10). Signed by the contractor alone. The supplier must have a verified GoodCompany account; it need not be named in the quote. The client receives a status notification without the amount and does not approve the payment. Decision Confirmed (P23, D12). In MVP1 a simulated payment.

**DisputeCase**

| Field | Type | Notes |
|---|---|---|
| contract_id, completion_request_id (nullable) | ref | |
| opened_by | enum[client, contractor, system] | |
| trigger | enum[objection, silence, payment_deadline] | |
| reason | text, required for an objection | hash recorded in the ledger |
| disputed_amount | int | stated and motivated by the objecting party |
| status | enum[between_parties, mediator_active, advice_issued, settled, withdrawn] | `advice_issued` ends the Mediator's work; the disputed amount stays frozen until `settled` or `withdrawn` |
| mediator_activated_at | timestamp, nullable | starts the mediator period |
| mediator_due_at | timestamp, nullable | `mediator_activated_at + mediator_period_days`, moved only by an extension |
| extensions | array[{reason, new_due_at, notified_at}] | Mediator only |
| silence_investigation | text, nullable | the Mediator's finding on why a party is silent; required before any advice on the substance in a silence case |
| proposal | text, nullable | mediation proposal; no ledger effect |
| advice_notice_at | timestamp, nullable | when both parties were told the advice will be finalised; advice may follow no earlier than `advice_notice_hours` later (P3) |
| advice | {content, reasoning, issued_at}, nullable | non-binding (D21); no ledger effect |

**FinalEvaluation** — contract_id, contractor_signed_at (the final completion request), client_signed_at (the approval), discrepancy_notes (text, nullable, either party), closed_at. The two signatures of v2 are the same two acts as the final completion request and its approval; they are not an extra step. Confirmed (Derived).

**Invoice** — as v2 §2.5, without `currency` default and without the Mollie-era assumptions. Generation rules in §7.8.

**AuditLogEntry** — contract_id, event_type, actor_id, payload (JSON), timestamp. Append-only at database permission level. Confirmed.

**LedgerEntry** — the simulated ledger's own append-only record: account, action type, signers, amounts, resulting balances, timestamp. Types include `deposit`, `payout`, `supplier_payment`, `refund`, `client_surplus_settlement`, `fee_reserve`, `fee_final`, `fee_return`, `fee_transfer`, `holdback_release`, `holdback_claim`, `fee_batch_transfer`. Confirmed (Derived); `Holdback Release` and `Holdback Claim` from the Addendum.

### 3.6 Community Bank

As v2 §2.7: `Reserve`, `LedgerTransaction`, `LoanApplication`, `VoteInvitation`, `Vote`, `SubEscrow`, `CommunityHealthScoreSnapshot`. Changes:

| Entity | Change | Status |
|---|---|---|
| FeeCollectionAccount (new) | balance; list of pending fees each with contract reference and amount. Only permitted destination: the Community Bank | Decision Confirmed (D10) |
| FeeBatch (new) | executed_at, fee_count, total_amount | Decision Confirmed (D10) |
| LedgerTransaction | `source_type` `platform_fee` is recorded per **batch**, not per contract. `related_contract_id` is not set for fee income | Confirmed (Derived) from D10: a single contract's size must not be derivable |
| LoanApplication | supplier and applicant "verified" means `identity_level = email_verified` in MVP1 | Decision Confirmed (P5, D22) |
| Loan repayment | early full or partial repayment allowed at any time, without penalty; remaining interest reduced pro rata | Decision Confirmed (Codex Community Bank clause 8) |

---

## 4. State machines

### 4.1 Contract

```
awaiting_funding → active            [fund]
active           → completed         [final completion request approved; warranty starts]
completed        → closed            [all holdback tranches claimed or reassigned; escrow empty]
active/completed → ended_unfinished  [mutual settlement closing the contract]
```

A contract with `warranty_period_days = 0` moves from `completed` to `closed` in the same action. Warranty is a substate of completion, not a separate phase (Confirmed, Addendum §4).

Job status (v2 §3.1), workspace stages (v2 §3.2) and loan status (v2 §3.5) are unchanged, except that signing closes sibling workspaces (§5.3).

### 4.2 Path 1 — normal settlement

**Decision Confirmed (D6, D7).** Only the client and the contractor act. No third party can sign, approve or block.

| Action | Signers | Conditions checked by the ledger | Result |
|---|---|---|---|
| `fund` | Client | Contract is `awaiting_funding`; deposit equals `quote.total_amount`; contract data and snapshot hash are present | EscrowAccount created; fee reserve (2%) and materials budget set aside; contract `active`; execution may start |
| `claim_advance` | Contractor | Milestone `kind = advance`, status `pending`; escrow funded; release leaves the disputed amount in escrow | Phase amount to contractor in full. No completion request, no response window: the client approved the advance by signing. Decision Confirmed (P10) |
| `pay_supplier` | Contractor (P23) | Contract `active`; materials budget not exhausted; supplier has a verified GoodCompany account; release leaves the disputed amount in escrow | Full amount to the supplier from the materials budget. No fee on it (D10). The client receives a status notification without the amount and does not approve |
| `request_completion` | Contractor | Milestone not yet paid; agreed evidence attached | CompletionRequest opened; evidence hash and time recorded. For the final delivery the 14-day response window and the 30-day payment deadline start. For a milestone no window or deadline runs in MVP1 (O24) |
| `approve` | Client | An open request exists; the release leaves the disputed amount in escrow | Milestone: phase amount to contractor. Final delivery: final phase plus any unspent materials budget as labour income (P21), minus holdback, to contractor; `client_surplus` to the client; the frozen fee is transferred to the collect-wallet; `warranty_start_date` set; tranche dates start |
| `claim_holdback_tranche` | Contractor | Tranche `claimable_from` has passed; tranche not frozen; release leaves the disputed amount in escrow | Tranche to contractor |
| `change_order` | Proposer, then the other party | Contract `active`; no final completion request has been made; only unpaid milestones change; for a positive delta the extra amount is deposited in the same action | Positive: totals, milestones, `fee_reserved` and `holdback_amount` updated. Negative: amount added to `client_surplus`, milestones and holdback updated; nothing leaves the escrow (P12, P13) |
| `mutual_settlement` | Client and contractor | None | Any split of the remaining balance between the two parties; fee handled per §7.1; contract closed |
| `replace_mediator` | Client and contractor | None | New `mediator_id` in the contract data |

Within the response window the client can: **approve**, **object** with a reason, **object in part** with a stated amount, or **ask for information**. An approval ends the request. An objection moves the request to Path 2. A request for information sets `awaiting_party = contractor` and is a response; it does not stop the payment deadline.

### 4.3 Path 2 — dispute

**Decision Confirmed (D7, D8, D9, D17, D21).** The Mediator gives non-binding advice. The outcome of a dispute is decided by the client and the contractor together.

| Stage | Action | Signers | Conditions | Result |
|---|---|---|---|---|
| 1a | `object` | Client or contractor | Escrow not empty; reason and disputed amount stated | DisputeCase `between_parties`; only the disputed amount is frozen; undisputed amounts continue on Path 1 |
| 1b | `escalate` | The waiting party | `silence_days` have passed with no action by `awaiting_party`, **or** `payment_deadline_days` have passed since the completion request without payment | Confirms the activation the system already made at detection; the mediator period does not wait for this signature (D17). The requested amount stays in escrow until the outcome |
| 2 | `settle` | Client and contractor | A dispute is open | A split between the parties, or the objection is withdrawn and Path 1 reopens. The only action that releases a disputed amount |
| 3 | `activate_mediator` | Client or contractor, alone | A dispute is open | `mediator_active = true`; no consent of the other party needed |
| 4 | Mediation | Nobody | Off-ledger | The Mediator investigates and seeks a solution both parties accept |
| 5 | Advice | Nobody | Off-ledger; at least `advice_notice_hours` (48) after both parties were told the advice will be finalised | Non-binding advice. If both parties accept it, they execute it as a stage 2 settlement |

If the parties do not agree after the advice, the disputed amount stays frozen until they settle or a court ruling is executed. **Functional principle — Decision Confirmed (O1, D21):** a final, enforceable court ruling must ultimately be executable through the escrow, also when a party refuses to cooperate, without further consent from that party. The Mediator gets no power to decide or to enforce a ruling for a party. The legal construction, the technical authorisation inside the escrow, GoodCompany's position, and how a ruling on a disputed amount is handled are open (O1, T3). MVP1 has no execution path.

**The three mediator triggers.** In each case the mediator period starts at activation.

| Trigger | When | Purpose |
|---|---|---|
| (a) A party activates | Any time after an objection | The parties decide for themselves when talks have failed |
| (b) Silence | `silence_days` (14) without action by the party whose turn it is, at the start of a formal request or later in the process | A party who stops answering cannot stall the process |
| (c) Payment deadline | `payment_deadline_days` (30) after a completion request that is still unpaid, even while the parties are still talking | A party who keeps answering but never concludes cannot stall the process either |

**Decision Confirmed (D17).** A system job detects triggers (b) and (c), opens the DisputeCase with `opened_by = system`, and notifies the Mediator and both parties. The mediator procedure and its period start at detection. The ledger action `escalate` is offered to the waiting party; that signature does not delay or determine the start. Automatic activation applies to MVP1 and may change in a later version; refinement of the triggers and the cost arrangement are open (O9).

Triggers (b) and (c) apply to the final delivery request and to open disputes, not to milestone requests or ordinary execution (O24: keep MVP1 simple).

Trigger (c) does not fire for an amount covered by a repair agreement or released through the signing condition of a nested contract (§4.5). Materials status updates are not completion requests and start no window or trigger (D12).

### 4.4 Change Orders

| Rule | Status |
|---|---|
| A Change Order needs a motivation from the submitter; a rejection needs a reason; a note on acceptance is optional | Decision Confirmed (July) |
| The submitter signs the proposal on sending; the other party signs to accept | Decision Confirmed (Codex Escrow, 10.5) |
| A Change Order takes effect through one atomic action: the proposer signs the proposal, the other party signs to accept, and any extra amount is deposited in the same action. If the deposit fails, nothing takes effect | Decision Confirmed (P12) |
| There is no "accepted but not yet funded" state. The proposing party may withdraw the proposal until it takes effect. The July rule on withdrawing an accepted, unfunded Change Order by mutual consent lapses; Codex Escrow clause 6 is superseded on this point | Decision Confirmed (P12) |
| When the client proposes a positive Change Order, the client's signature on the proposal authorises the deposit, which is made when the contractor accepts. In MVP1 the action fails as a whole if the client's simulated balance is short | Confirmed (Derived) from P12. On a chain this needs a pre-signed deposit (T8) |
| Change Orders touch unpaid milestones only: their work description, description and amount. Paid milestones are never changed retroactively | Decision Confirmed (P13) |
| A negative Change Order does not refund immediately. The removed amount stays in escrow as `client_surplus`, unavailable to the contractor, and goes to the client with its reserved fee at final approval. If the contract ends unfinished, it goes to the client in that settlement. It is not a holdback | Decision Confirmed (P12, P13); the unfinished case Confirmed (Derived) |
| An unanswered Change Order expires at `expires_at = created_at + min(execution_period_days, 90 days)` with no consequence for the original contract; no claim, no dispute category | Decision Confirmed (July #7, P14) |
| Reversing a Change Order that has taken effect runs through a new Change Order or the dispute path | Decision Confirmed (July) |
| Change Orders are allowed only while the contract is `active` and before the final completion request. This is a ledger guard, not only a hidden button | Confirmed (Addendum §4), D11 |
| Extra work is not required to be carried out before it is funded | Confirmed (Addendum clause 3) |

### 4.5 Repair work, extra work and nested contracts

**Decision Confirmed (D11).** The payment deadline can be moved only by a new agreement between the parties, and that agreement must pay out what is no longer in question. Adding work may never keep money frozen.

| Situation | Mechanism | Money | Effect on deadlines |
|---|---|---|---|
| Repair after an objection | RepairAgreement inside the same escrow, signed by both | No new money. The agreement names the amount held for the repair; everything else in the request is released when it is signed | A new completion request for the repair starts a new response window and payment deadline for the held amount only |
| Extra work during execution | Change Order | Extra amount deposited in the same action | None for work already requested |
| Extra work after a completion request or during warranty | A new contract with `parent_contract_id`, own EscrowAccount | Funded separately. Signing requires the payout or a part-payment of the first contract | The new contract runs its own cycle; the first contract's deadline is not extended |

### 4.6 Warranty and holdback

Confirmed (Addendum), adapted to "claimable, not automatic" (Protocol v1).

```
Warranty active    → tranche date reached, no freeze → claimable by contractor
Warranty active    → client objects                  → remaining unclaimed tranches frozen up to the disputed amount
Warranty frozen    → settlement between the parties  → tranches released or reassigned per outcome
all tranches done  → contract closed
```

- Tranches already claimed are final and are never reclaimed, whatever the outcome.
- The contractor never has to top up the escrow.
- If repair costs exceed the remaining holdback, the contractor bears the excess outside the platform. The holdback is a motivation amount, not insurance. This must be visible in the contract preview before funding.
- A warranty objection uses the same dispute path as §4.3. Without agreement, the frozen tranches stay frozen until a settlement or an executed court ruling (O1).

---

## 5. API contract (indicative, REST)

### 5.1 Jobs and 5.2 Contacts

As v2 §4.1 and §4.2. `GET /jobs` never returns `indicative_budget` to a contractor. `PATCH /contacts/{id}` accepts `collaboration_preference`.

### 5.3 Negotiation Workspace

As v2 §4.3, with these changes:

- `POST /workspaces/{id}/terms-versions` — validates the holdback and phase rules of §3.4.
- `POST /workspaces/{id}/sign` — once both have signed: Contract created with status `awaiting_funding`; snapshot frozen and hashed; `Job.selected_contractor_id` set atomically; **all other open workspaces on the job close with outcome `closed_other_selected`**, and their candidates are told the job has been awarded, without the winning terms. Decision Confirmed (July, 10.2). No EscrowAccount exists yet; it is created by `fund`.
- For a nested contract, `sign` is rejected unless the parent contract's payout or part-payment condition is met (§4.5).

### 5.4 Escrow actions

**Endpoints prepare actions for the parties to sign. They do not move money.** Decision Confirmed (D6).

| Endpoint | Effect |
|---|---|
| `POST /contracts/{id}/escrow/actions` | Body: action type and parameters. The GoodTrade service validates, builds the action, returns its id, hash, required signers and a human-readable summary of what will happen. Nothing changes in the ledger |
| `POST /escrow/actions/{aid}/sign` | Requires step-up authentication. Records the caller's signature. When all required signatures are present the action is submitted to the ledger |
| `GET /escrow/actions/{aid}` | Status: `awaiting_signatures`, `submitted`, `applied`, `rejected`, `expired` |
| `GET /contracts/{id}/escrow` | EscrowAccount as read from the ledger: balances, fee frozen, materials budget, client surplus, tranches, disputed amount, mediator state, open requests and their deadlines. For the client, the materials budget is one figure; `paid_to_suppliers` is omitted |
| `GET /contracts/{id}/ledger` | The contract's LedgerEntries. The client does not receive `supplier_payment` entries |

Action types: `fund`, `claim_advance`, `pay_supplier`, `request_completion`, `approve`, `claim_holdback_tranche`, `change_order`, `mutual_settlement`, `replace_mediator`, `object`, `escalate`, `settle`, `activate_mediator`, `repair_agreement`.

Confirmation and failure rules (replace v2 §8.7):

- An action is either applied in full or not at all. A rejected or expired action leaves contract, escrow and reserves unchanged.
- The contract becomes `active` only after the ledger shows the `fund` entry.
- A prepared action that is not fully signed within `action_signature_ttl_hours` expires.
- All amounts in an action are recomputed by the ledger; client-supplied amounts are requests, not facts.

Non-ledger endpoints around completion:

- `POST /contracts/{id}/completion-requests/{rid}/information-request` — client asks for information; sets `awaiting_party`.
- `POST /contracts/{id}/completion-requests/{rid}/information-response` — contractor answers.
- `POST /contracts/{id}/change-orders`, `.../{cid}/reject`, `.../{cid}/withdraw` — conversation and status; taking effect goes through an escrow action.
- `POST /contracts/{id}/materials-status` — contractor only; value `materials_ordered`. A status update shown to the client. No approval, no response window, no trigger (D12).

### 5.5 Disputes and Mediator

| Endpoint | Caller | Effect |
|---|---|---|
| `GET /disputes/{id}` | Parties, assigned Mediator | Case file: reason, amounts, timeline, deadlines |
| `POST /disputes/{id}/messages` | Parties, Mediator | Case conversation |
| `POST /disputes/{id}/silence-finding` | Mediator | Records why a party is silent; required before advice on the substance in a silence case |
| `POST /disputes/{id}/proposal` | Mediator | Records a mediation proposal; no ledger effect |
| `POST /disputes/{id}/extension` | Mediator | Reason and new date required; both parties notified |
| `POST /disputes/{id}/advice-notice` | Mediator | Tells both parties the advice will be finalised; starts the 48-hour notice (P3) |
| `POST /disputes/{id}/advice` | Mediator | Issues the non-binding advice; rejected before the notice has run. No ledger effect |
| `GET /mediator/cases` | Mediator | Assigned cases with due dates |
| `POST /admin/mediators`, `POST /admin/contracts/{id}/mediator` | Admin | Create a Mediator account; assign a Mediator (P15) |

Disclosure of contract content to the Mediator is limited to what the dispute requires and starts at mediator activation (D18).

### 5.6 Final evaluation, reviews, invoices

- The final `approve` action sets `FinalEvaluation.client_signed_at`, generates the invoice pair (§7.8) and opens reviews.
- `POST /contracts/{id}/evaluation/discrepancy-note` — either party; does not block completion.
- `POST /contracts/{id}/reviews` — after completion only; `motivation` required for rating ≤ 3; triggers reputation recompute.
- `GET /invoices?since=&direction=` — as v2.

### 5.7 Community Bank

As v2 §4.8, with:

- `POST /loan-applications/{id}/repayments` — accepts early and partial repayments; recalculates remaining interest pro rata.
- System job `fee_aggregation` — see §7.1.
- `GET /community-bank/fee-batches` — public list of batches: time, amount. No per-contract data.

---

## 6. Chain mapping — not built in MVP1

This section records where the simulated protocol is meant to run. It creates no build work for MVP1, and none of the dependencies below blocks the simulated MVP1.

### 6.1 Staged route

**Decision Confirmed (D15).**

| Stage | Escrow | Status |
|---|---|---|
| MVP1 | Fully simulated | Decided |
| Interim production route | Real escrow on Cardano in USDCx | Optional. Only by a deliberate product decision: Cardano does not offer the confidentiality of Midnight. Amounts, payouts, supplier payments and the fee per contract would be public. See T7 |
| Target | Shielded escrow on Midnight; Cardano only for the Community Bank | Decided as target; rests on the dependencies in §6.3 |

### 6.2 Target placement

| Layer | Holds | Status |
|---|---|---|
| Midnight | A separate escrow per contract, using Midnight's privacy features, for the complete contract lifecycle: funding, payments in between including supplier payments, dispute steps and the final payout. Also the GoodCompany collect-wallet, which gathers final fees from all contracts | Decision Confirmed (D4, D10, D12) |
| Cardano | A future Community Bank wallet, the only intended public destination. The collect-wallet periodically converts and transfers its balance there | Decision Confirmed (D4, D10). Depends on infrastructure not yet available (DEP1, DEP2) |
| Encrypted storage off-chain | Contract content. Hashes of relevant data on-chain; parties hold their own access keys; the Mediator gets selective access to what a dispute requires | Decision Confirmed as target (D18). Technique and key management open (T9) |

The protocol is chain-agnostic at the functional level. A Midnight deployment, or an interim Cardano deployment, must not change the business rules in §4, §7 and §8. A validator written for Cardano is not reusable on Midnight; the chain is chosen before any validator is written.

Using Midnight does not by itself rule out linking through metadata, amounts or timing. Every privacy property in this section is a validation requirement, not an assumption.

### 6.3 Dependencies requiring verification

None of these is a fact. Each must be verified before any real financial transaction relies on it.

| # | Dependency | State on 17 November 2026 |
|---|---|---|
| DEP1 | A stablecoin (USDCx preferred) on Midnight | Not found. O5 |
| DEP2 | An operational, audited two-way transfer route between Midnight and Cardano, including the collect-wallet's conversion step | Not found. The bridge found runs from Cardano to Midnight and carries NIGHT. The Midnight roadmap is a possible future source; availability and suitability must be verified. O5 |
| DEP3 | Custody construction and MiCA boundaries; GoodCompany's role in preparing transactions | Legal research. O3, O21 |
| DEP4 | MiCA status of USDCx | Legal research. O3 |
| DEP5 | Treatment of shielded assets by EU exchanges and off-ramps | Legal and technical research. O3 |
| DEP6 | Legal position of the Mediator and of GoodCompany | Legal research. O2 |
| DEP7 | Community Bank legal and organisational structure | Separate research. O12. Not blocking MVP1 |

### 6.4 Validation requirements and open technical questions

| # | Item | Status |
|---|---|---|
| T1 | Privacy and traceability of the full fee route: contract escrow, collect-wallet, conversion and transfer to Cardano. Batching does not by itself prevent linking through metadata, amounts or timing | Validation requirement (D10, O6) |
| T2 | The collect-wallet as a script with the Community Bank as its only destination, with no key at GoodCompany | Open (O6) |
| T3 | Construction for executing a final, enforceable court ruling through the escrow without the refusing party's consent, including a ruling on a disputed amount. Required by D21; construction open | Open (O1) |
| T4 | Silence after an initial response is not visible on-chain; the 30-day deadline is the on-chain safety net | Open |
| T5 | Stuck funds until a court ruling can be executed (T3); a lost key has a similar effect | Open (O1) |
| T6 | Where the organisation-reserve share of the fee is split off | Open |
| T7 | Supplier payments must not publicly expose confidential contract information. Required of the Midnight implementation. The optional Cardano interim route cannot meet this with direct supplier payments; choosing that route needs a new decision | Validation requirement (D12, O15) |
| T8 | A positive Change Order proposed by the client needs a deposit authorised at proposal and executed at acceptance; on a chain that is a pre-signed transaction | Open |
| T9 | Storage technique and key management for contract content | Open (O10) |

---

## 7. Business rules and defaults

All values marked configurable are set through an admin settings layer and listed in §12.

### 7.1 Platform fee

**Decision Confirmed (D10, simplified by the product owner on 17 November 2026).** Replaces v2 §6.1 and Codex Escrow clause 9.

| Rule | Status |
|---|---|
| The platform fee is 2% of the total contract amount | Decision Confirmed |
| The contractor takes the 2% into account when making the quote. The client deposits the full contract amount; nothing is added on top | Decision Confirmed |
| At deposit, the 2% is frozen in the escrow | Decision Confirmed |
| When the job is completed (final approval), the frozen fee is transferred in one go to the collect-wallet | Decision Confirmed |
| No fee on supplier payments; the materials budget stays intact | Decision Confirmed |
| Phases, materials budget and fee together make up the contract amount, using largest-remainder rounding | Confirmed (Derived) |
| A contract cancelled in full before any payout pays no fee; the frozen fee goes back to the client | Decision Confirmed (P1, OD11) |
| Mediation is paid from the pooled fees | Confirmed (Codex Identity/Audit clause 6) |

Example: contract 10,000.00; fee 200.00 frozen at deposit; materials budget 3,000.00; phases 6,800.00. At final approval the 200.00 goes to the collect-wallet.

**Fee aggregation — Decision Confirmed (D10).** A system job runs every `fee_batch_interval_minutes` (60). If the fee collection account holds at least `fee_batch_min_count` (5) fees, it transfers the full balance to the Community Bank as one FeeBatch. With fewer fees the amount stays for a later run. Both values are configurable; they are not protocol constants. In MVP1 this is a simulated transfer between two ledgers.

**Target route — Decision Confirmed (D10, O6).** Final fees move from the contract escrow on Midnight to the GoodCompany collect-wallet on Midnight. The collect-wallet periodically converts and transfers its balance to a future Community Bank wallet on Cardano. The Cardano destination depends on infrastructure that does not yet exist (DEP1, DEP2). Privacy and traceability of the whole route must be validated (T1).

**Organisation reserve — Confirmed (v2 §6.1, Appendix A).** 1% of the fee, that is 0.02% of contract value, is routed to the GoodCompany Organisation Reserve; the rest is split over the Community Bank reserves. In MVP1 the split is applied per FeeBatch on arrival. Where this split happens in the chain stage is open (T6).

**Reserve split — Illustrative Default.** Safety 60 / Credit 20 / Legal 10 / Innovation 10. Safety reserve minimum threshold 55% of target: below it, no new loans.

### 7.2 Warranty and holdback

Confirmed (Addendum).

| `warranty_period_days` | Release at final approval | Holdback tranches |
|---|---|---|
| 0 | 100% | none |
| 15 | 100% − holdback | 100% of holdback, day 15 |
| 30 | 100% − holdback | 50% day 15, remainder day 30 |
| 90 | 100% − holdback | one third day 30, one third day 60, remainder day 90 |

The holdback is 10% of the contract value and is always withheld (Decision Confirmed, P9, D25). With `warranty_period_days = 0` it stays in escrow until both parties have agreed the final payment, as an incentive to finish the project quickly (Decision Confirmed, O26).

Every tranche except the last is `holdback_amount ÷ number_of_tranches`, rounded. The last tranche is whatever is left, so the escrow always empties exactly. Mandatory clauses 1–5 of Addendum §8 are pre-loaded and cannot be removed from the terms.

### 7.3 Materials and advances

**Decision Confirmed (D12, revised by P10, P20, P21, P23, OD3, O15, O16, O17, O19 and O20).** Materials and advances are separate flows.

**Materials**

| Rule | Status |
|---|---|
| Materials are priced at the agreed selling price in the quote. The contractor's margin is confidential | Decision Confirmed |
| The contractor never discloses purchase invoices, supplier prices or discounts to the client or to GoodCompany. No reconciliation of actual costs. Under the standard arrangement no unused amount is refunded to the client | Decision Confirmed |
| The quote shows `materials_amount` as one informational figure (§3.4). It is not the source of supplier payment amounts | Decision Confirmed (P20) |
| The materials budget is reserved separately inside the escrow as `materials_budget_percentage` of the contract value, approved by the client's signature on the terms | Decision Confirmed (P10) |
| The materials reservation stays fully intact. The fee is never charged against it (§7.1) | Decision Confirmed (O19) |
| Supplier payments go directly from the materials budget to the supplier, in full, not first to the contractor | Decision Confirmed (P10, O19) |
| The contractor initiates and signs each supplier payment personally. The client does not approve it | Decision Confirmed (P23) |
| A supplier is paid only into a verified GoodCompany account. The supplier need not be named in the quote | Decision Confirmed (P23) |
| The client receives a status notification for each supplier payment, without the amount | Decision Confirmed (P23, O15) |
| `materials_ordered` is a status update by the contractor, nothing more. There is no `materials_delivered` milestone: no client approval or response, no response window, no Mediator trigger | Decision Confirmed (O20) |
| The contractor is responsible for delivery and processing of the materials | Decision Confirmed (O17, O20) |
| The unspent budget stays in escrow during execution. It is paid to the contractor as labour income in the final payout, under the normal fee and payout rules | Decision Confirmed (P21) |
| Self-supply: no separate supplier payment. The amount stays in the materials budget and is paid as labour income in the final payout | Decision Confirmed (O17) |
| A cost-reimbursement arrangement exists only if explicitly agreed before contract acceptance. It is not the default and MVP1 offers no dedicated flow for it | Decision Confirmed |
| Paying for materials that never arrive is treated as potential fraud: investigation and possible ban. If the work is not completed, materials bought with contract money belong to the client | Decision Confirmed |

**Advances**

| Rule | Status |
|---|---|
| An `advance` is a separate phase kind, paid to the contractor, never to a supplier | Decision Confirmed (P10) |
| The contractor can claim it once the escrow is fully funded, without a completion request or response window. The client approved it by signing the contract and its payment schedule | Decision Confirmed (P10) |
| The contractor proposes the advance percentage; the client accepts or rejects it before signing. GoodCompany sets no cap, standard or default range. Once signed, it is fixed | Decision Confirmed (OD3) |
| The same amount never counts as both advance and materials budget. The ledger pays advances only from the advance phase and supplier payments only from the materials budget | Decision Confirmed (P10); enforcement Confirmed (Derived) |

**MVP1.** The ledger is simulated: no real supplier payment or money transfer takes place. In MVP1 the confidentiality of supplier payments rests on access control only. The target implementation on Midnight must show that supplier payments expose no confidential contract information publicly (T7).

Known risks, recorded without a decision:

- The advance and the materials budget are the client's exposure before anything is delivered. With no cap (OD3) and supplier payments signed by the contractor alone (P23), a dishonest contractor can draw both early; the fraud rule acts after the loss.
- Under self-supply and P21, the contractor pre-finances self-supplied materials until the final payout, unless an advance is agreed.

### 7.4 Community voting

As v2 §6.2: sampled invitations, required votes by amount (50 / 100 / 250 / 500, cap 500), audience multiplier 3, eligibility account age ≥ 30 days and ≥ 1 completed contract, majority ≥ 60%, window 14 days. Tiers and multiplier are Illustrative Defaults.

### 7.5 Loans

Interest as v2 §6.3 (base 4%, +0.25% per six-month block beyond 12 months, cap +3%). Early repayment allowed without penalty (Decision Confirmed). No automated default detection in MVP1 (Decision Confirmed). Loan money goes to the supplier through a SubEscrow, never to the applicant.

### 7.6 Identity

| Rule | Status |
|---|---|
| MVP1 is built without DigiD. DigiD remains a future ambition, to be reached through AVI | Decision Confirmed (D1) |
| MVP1 identity is a verified email address: a temporary, replaceable solution. No Hyperledger Identus deployment, no DID issuance | Decision Confirmed (P5, D22). Departs from v2 §6.6 "bare Identus" |
| The identity interface is one function, `identity_level(user)`, so a later identity source can replace email without touching the trade cycle | Decision Confirmed (P5, D22) |

Flag: with email-only identity, one person can hold several accounts. Voter sampling and the "verified supplier" rule are then weaker than the documents assume. Acceptable while balances are simulated; it must be resolved before real money.

### 7.7 Currency and rounding

| Rule | Status |
|---|---|
| The contract fixes one currency and one exact amount at signing | Decision Confirmed (D5) |
| Settlement in a USD stablecoin is allowed; EUR may remain the unit shown in a quote | Decision Confirmed (D5) |
| MVP1: one currency per contract, no FX conversion, default EUR, held in a configuration value | Decision Confirmed (P11, D26) |
| Phase amounts use largest-remainder rounding; the sum always equals the total | Confirmed. A deterministic rule, not a parameter |

### 7.8 Invoices

| Rule | Status |
|---|---|
| An `issued` invoice for the contractor and a `received` invoice for the client are generated automatically at final approval | Confirmed (v2 §2.5) |
| Amount: base quote plus Change Orders that took effect | Confirmed |
| The contractor invoices 100% of the contract amount: the base quote plus Change Orders that took effect. The 2% is not deducted on the invoice; it appears on a separate platform fee statement to the contractor | Decision Confirmed (P19). Tax and bookkeeping treatment: Open, specialist question O23 |
| Each invoice has a stable, unique `external_reference_id` | Confirmed. Its shape is Open (§13.2) |

### 7.9 Other defaults

- "Search only within my expertise": default on. Confirmed.
- Workspace inactivity: expires after 21 days, both parties notified 3 days before. Confirmed.
- Multi-candidate threshold: from an indicative value of €5,000, at least 5 distinct candidates beyond `introduction` before signing. GoodCompany's own fairness standard, not a legal requirement. Confirmed (v2 §6.7); hard block or soft warning is Open.
- Contact invitations: email only. Confirmed.

---

## 8. Completion and dispute procedure

**Decision Confirmed (D7, D8, D9, D13, D17, D21)** unless marked.

### 8.1 Roles and terms

**Decision Confirmed (D21, D23).**

| Term | Meaning |
|---|---|
| **Mediator** | The independent professional named in the contract. Has no interest in the outcome, represents neither party and does not act for a party in the same dispute. The only name used for this role |
| **Mediation** | The Mediator's first function: investigating and seeking a solution both parties accept |
| **Advice** | The Mediator's second function: non-binding advice when mediation has not produced agreement |

The Mediator takes no binding decision. The outcome is decided by the client and the contractor together. GoodCompany has its own financial interest in the transaction but is not automatically a claimant in a dispute between client and contractor. The legal position of GoodCompany and the Mediator is to be tested (O2).

### 8.2 Completion

1. The contractor reports completion with the agreed evidence and requests payout.
2. The client has at most 14 calendar days to approve, object, object in part, or ask for information. In MVP1 this applies only to the delivery of the whole project, not per milestone — Decision Confirmed (P2, O24). A per-milestone window can be added later if practice asks for it.
3. Silence is never approval and never leads to automatic payout.
4. After an objection the parties first try to settle directly.

### 8.3 Mediator activation and period

- The Mediator is activated by trigger (a), (b) or (c) of §4.3; (b) and (c) automatically by the system (D17). This applies to MVP1 and may change later. Refinement of the triggers and the cost arrangement are open (O9).
- The mediator period is 30 calendar days, always counted from activation. A design principle motivated by the cashflow dependency of freelancers and small businesses. The Dutch statutory payment term is the reference point, not the legal basis.
- Longest route before any extension: 30 days without agreement, then 30 days of procedure. With a silent client: 14 days plus 30.
- Extension: the Mediator alone decides, with a reason, notice to both parties and a revised date. No fixed maximum number of extensions. Neither party can demand one.

### 8.4 Advice

- Only after mediation has not produced agreement.
- **Notice: both parties are told at least 48 hours before the Mediator finalises or issues the advice — Decision Confirmed (P3).** This replaces the earlier proposal of 14 days before a binding decision.
- Non-responsive party: after demonstrable notification and a reasonable opportunity to respond, the Mediator may advise on the available evidence. Absence is not an automatic loss.
- In a silence case the Mediator first establishes why the party is silent, before any advice on the substance.
- The advice has no ledger effect. If both parties accept it, they execute it themselves through `settle`.
- If they do not agree, the disputed amount stays frozen. Either party, or both, may go to the ordinary courts. A final, enforceable court ruling must ultimately be executable through the escrow without the refusing party's consent; the Mediator has no role in that (Decision Confirmed, O1). The construction is open (T3).

**Conflict with D8 resolved in principle.** D8 says absence may not lock the funds indefinitely. The O1 principle provides the exit: settlement, or execution of a court ruling. Until the construction exists (T3), a refusing party can still lock the disputed amount for as long as the court route takes.

### 8.5 Undisputed funds and unfinished contracts

- Only the disputed amount stays frozen. The objecting party states and motivates the amount; the Mediator assesses whether it is reasonable as part of the advice. Until the Mediator is active, nobody checks it.
- When a contract ends unfinished, the Mediator assesses the situation and advises how it can be handled in a legally correct way. The parties decide (D13 as revised by D21).
- Assumed exception (D13): no Mediator where both parties cancel by agreement and also agree on the materials. They use `mutual_settlement`.

### 8.6 Mediator console

**Decision Confirmed (P15).** MVP1 includes a minimal Mediator console: assigned cases, case files, a deadline overview, and the Mediator actions of §5.5. Mediator accounts are created and assigned by an admin. No self-service registration or assignment, no AI support. The Mediator has no signing role in the console or the ledger.

Mediator workload and operating cost are a separate concern and remain open (O9).

---

## 9. Edge cases

| # | Case | Rule | Status |
|---|---|---|---|
| 9.1 | Negotiation inactivity | Workspace expires after 21 days; notice 3 days before | Confirmed |
| 9.2 | Withdrawal | Before signing: no financial consequence. After funding: only through Change Order, mutual settlement or the dispute path, never a status change | Confirmed (v2 §8.6) |
| 9.3 | Simultaneous quote acceptances | Optimistic lock on `Job.selected_contractor_id` | Confirmed (v2 §8.3) |
| 9.4 | Contract signed but never funded | Execution may not start. No timeout is decided | Open (§13.2) |
| 9.5 | Change Order while a milestone request is open | Allowed; it cannot change a milestone that is `requested`, `disputed` or `paid` | Confirmed (Derived) from P13: only future, unpaid milestones change |
| 9.6 | Objection after a tranche was claimed | Claimed tranches are final; only unclaimed tranches can be frozen | Confirmed (Addendum §5) |
| 9.7 | Loan default | Manual conversion to `defaulted`; reduces Credit Reserve; feeds the Community Health Score | Confirmed (v2 §8.4) |
| 9.8 | Mediator unresponsive | The Mediator has no ledger role, so an unresponsive Mediator delays the advice, not a release. The parties can replace the Mediator together | Confirmed (Derived) from D21 |
| 9.9 | Insolvent client | A trustee may have a claim on the escrowed amount | Open, for specialist review (O22) |
| 9.10 | No agreement after the advice | Disputed amount stays frozen until settlement or an executed court ruling. Execution through the escrow is required; its construction is open | Decision Confirmed (O1) as principle; construction open (T3) |

---

## 10. Non-functional requirements

- Step-up authentication before every signature on an escrow action. Confirmed.
- Accepted terms versions and quotes are immutable; changes go through a new version or a Change Order. Confirmed.
- `AuditLogEntry` and `LedgerEntry` are append-only at database permission level. Confirmed.
- GDPR applies. Personal data stays out of the ledger (L5), so deletion requests can be honoured without breaking the record. Confirmed.
- Data minimisation: store and disclose only what a function needs. Confirmed (Core Design Principles).
- Scale target for launch: low hundreds of concurrent workspaces, low thousands of users. A sizing target, not an SLA. Confirmed.
- Timer jobs are idempotent and safe to re-run; a missed run must not skip a deadline. Confirmed (Derived).
- The UI states clearly, wherever a balance is shown, that MVP1 balances are simulated. Proposed.

**System jobs**

| Job | Interval | Effect |
|---|---|---|
| Response window and silence check | hourly | Opens DisputeCase on trigger (b); notifies |
| Payment deadline check | hourly | Opens DisputeCase on trigger (c); notifies |
| Mediator due-date check | daily | Notifies mediator and parties before and at the due date |
| Change Order expiry | hourly | Sets `expired` |
| Workspace inactivity | daily | Notice at day 18, expiry at day 21 |
| Fee aggregation | every 60 minutes | FeeBatch if the minimum count is met |
| Vote resolution | hourly | As v2 §4.8 |
| Contact reconciliation | nightly | As v2 §4.2 |
| Community Health Score | daily | As v2 §2.7 |

---

## 11. Screens

| Area | Screens |
|---|---|
| Marketplace — Jobs | Post job, job list and search, job detail (client and contractor views; no budget shown to contractors) |
| Marketplace — Contacts | Contact list by group, add/edit, group management, private collaboration preference |
| GoodTrade — Workspace | Stage stepper, introduction chat, technical intake, terms editor with version history (warranty, holdback, phases with kind, mediator), quote builder with materials amount, contract preview and signing |
| GoodTrade — Contracts | My Contracts, contract detail with audit trail, milestone tracker, Change Order flow with conversation, nested-contract link |
| GoodTrade — Escrow | Funding, escrow overview (balance, fee frozen, materials budget, client surplus, holdback tranches, disputed amount), supplier payment and `materials_ordered` status (contractor only), advance claim, action summary and signing dialog, completion request with evidence, response screen (approve / object / object in part / ask for information) with countdown, tranche claim |
| GoodTrade — Disputes | Objection form with amount and reason, case file, settlement proposal and signing, activate Mediator, advice view |
| Mediator | Case list, case file, deadline overview, silence finding, proposal, extension, advice notice, advice |
| Profile | Edit, public view with Rookie Stage rule and warranty metrics, portfolio, reviews, My Work |
| Community Bank | Reserve dashboard, fee batch list, loan application, loan detail and voting, capital flow |
| Notifications, Dashboard | As v2 §9, with deadlines for open requests and cases |
| Admin | Settings (§12), mediator accounts, simulated balances |

---

## 12. Configuration values

| Parameter | Value | Status |
|---|---|---|
| `platform_fee_rate` | 2% | Confirmed |
| `fee_batch_interval_minutes` | 60 | Decision Confirmed (D10); configurable |
| `fee_batch_min_count` | 5 | Decision Confirmed (D10); initial value, configurable |
| `organization_reserve_fraction` | 1% of the fee | Confirmed |
| `reserve_split` | 60 / 20 / 10 / 10 | Illustrative Default |
| `safety_reserve_threshold` | 55% of target | Confirmed |
| `completion_response_days` | 14 | Decision Confirmed (D8, P2, O24); final delivery only |
| `silence_days` | 14 | Decision Confirmed (D8) |
| `payment_deadline_days` | 30 | Decision Confirmed (D8) |
| `mediator_period_days` | 30 | Decision Confirmed (D8) |
| `advice_notice_hours` | 48 | Decision Confirmed (P3) |
| `warranty_period_options` | 0, 15, 30, 90; default 30 | Confirmed; 0 allowed (O26) |
| `holdback_percentage` | 10, fixed | Decision Confirmed (P9, D25) |
| `change_order_expiry_max_days` | 90 | Decision Confirmed (July #7, P14) |
| `workspace_inactivity_timeout_days` | 21, notice 3 days before | Confirmed |
| `action_signature_ttl_hours` | 72 | Proposed |
| `rookie_reviews_required` | 10 | Confirmed |
| `mandatory_motivation_threshold` | rating ≤ 3 | Confirmed |
| `reliability_factor_floor` / `_window` | 0.5 / last 20 contracts | Illustrative Default |
| `required_votes_tiers`, `audience_multiplier` | 50/100/250/500, ×3 | Illustrative Default |
| `community_loan_approval_threshold`, `community_vote_duration` | 60%, 14 days | Confirmed |
| `loan_interest_rate` | 4% base, +0.25% per 6 months after 12, cap +3% | Confirmed |
| `multi_candidate_threshold` | €5,000 / 5 candidates | Confirmed |
| `mvp1_contract_currency` | EUR | Decision Confirmed (P11, D26) |

The registry entry `warranty_holdback_schedule` (15d→5%, 30d→10%, 90d→15%) is wrong and is replaced by the two independent option lists above. `dispute_escalation_ladder` ("none, straight to mediator") and `identity_layer_scope` ("Identus + DigiD") are superseded.

---

## 13. Decisions, proposals and open points

Open points use the Decision Log's O-numbers. Numbers of closed items are not reused.

### 13.1 Proposals

All proposals are decided (17 November 2026).

| # | Decision | Where |
|---|---|---|
| P1 | Client deposits 100%; fee 2% reserved upfront; returned with refunds; full cancellation pays no fee | §7.1 |
| P2 | 14-day window for the delivery of the whole project only, not per milestone (O24) | §8.2 |
| P3 | At least 48 hours' notice before the Mediator finalises or issues the advice | §8.4 |
| P4 | GoodTrade stays the domain name (D23); role term "Mediator" | §1.1, §8.1 |
| P5 | Email identity for MVP1 as a temporary, replaceable solution | §7.6 |
| P6 | Superseded by the simplified fee rule: the whole fee is transferred at completion | §7.1 |
| P7 | Partial termination keeps the fee only on amounts paid out | §7.1 |
| P8 | Separate reputation scores for client and contractor (D24). The 80/20 question it was raised for remains open: O25 | §3.1 |
| P9 | Mandatory holdback of 10%, also with a 0-day warranty (D25, O26) | §3.4, §7.2 |
| P10 | Materials and advances are separate; reserved materials budget with direct supplier payments; advance claimable after funding | §7.3 |
| P11 | One currency per contract, EUR as default, no FX (D26) | §7.7 |
| P12 | Change Order takes effect in one atomic action; negative delta earmarked as client surplus | §4.4 |
| P13 | Change Orders touch unpaid milestones only | §4.4 |
| P14 | `execution_period_days` in the terms; sets Change Order expiry, capped at 90 days | §3.4, §4.4 |
| P15 | Minimal Mediator console | §8.6 |
| P16 | System detects triggers (b) and (c) and starts the period at detection | §4.3 |
| P17 | MVP1 storage encrypted at rest, snapshot hash in the ledger; not the final privacy architecture | §2.4 |
| P18 | Superseded by D21: no binding decision; the Mediator cannot force or release a payment | §8 |
| P19 | Contractor invoices 100%; fee on a separate statement | §7.8 |
| P20 | `materials_amount` is one informational figure on the quote | §3.4, §7.3 |
| P21 | Unspent materials budget paid as labour income in the final payout | §7.3 |
| P22 | Lapsed; replaced by O19: fee 2% of the total contract value, materials reservation intact | §7.1 |
| P23 | Contractor signs supplier payments; verified supplier account; client status notification | §7.3 |
| OD3 | No GoodCompany cap on the advance percentage | §3.4, §7.3 |
| OD11 | "Cancelled" means cancelled in full before any contractor payout | §7.1 |

### 13.2 Open product decisions

**Deferred, not blocking**

| # | Decision | Where |
|---|---|---|
| O25 | Client reputation score and the Addendum's 80/20 split. Deferred: scores only become public after 10 completed contracts, so this does not block the start of the build | §3.1 |

**Other open product decisions** (Build Spec only; no Decision Log number)

| # | Decision | Note |
|---|---|---|
| OD1 | Should stale open jobs auto-expire? | v2 10.1 |
| OD2 | Funding timeout after signing; what happens to closed sibling workspaces if the client never funds | New in v3 |
| OD4 | Can an expired workspace be reactivated? Codex decision 10.6 implies it; v2 §3.2 closes it | New in v3 |
| OD5 | Loan applications get an administrative check before voting: completeness, required data and formal conditions only, never the merits | **Decided (D27)** |
| OD6 | Provisional: voters do not see the identities of applicant and supplier. Further product work required | Provisional (D27) |
| OD7 | Provisional: multi-candidate threshold as a warning with logged override, not a block. Further product work required | Provisional (D27) |
| OD8 | Provisional: sequential invoice numbers. Further product work required | Provisional (D27) |
| OD9 | Provisional: simple interest, pro rata to time. Further product work required | Provisional (D27) |
| OD10 | Content of the technical-intake question library per category | Codex |

Also open in the log, not blocking: O9 (refinement of the mediator triggers and the cost arrangement).

### 13.3 Open, for specialist review

| # | Question |
|---|---|
| O1 | Legal construction for executing a court ruling through the escrow without the refusing party's consent; GoodCompany's position and responsibilities (functional principle decided, D21) |
| O2 | Legal position of the Mediator (non-binding advice) and of GoodCompany (own financial interest, not automatically a claimant) |
| O3 | MiCA status of USDCx; custody construction and MiCA boundaries; shielded assets at EU exchanges and off-ramps |
| O12 | Community Bank legal and organisational structure: ownership, control, liability, fund management, financial regulation. Not blocking MVP1 |
| O21 | Whether preparing transactions and running the only interface is a crypto-asset service |
| O22 | Insolvent client and the escrowed amount |
| O23 | Tax and bookkeeping for income received in a dollar token, for the fee statement (P19), and for unspent materials budget paid as labour income (P21) |

### 13.4 Dependencies and validation

See §6.3 (DEP1–DEP7) and §6.4 (T1–T9).

### 13.5 How the contradictions of the Project Review are resolved

| Review §2.3 item | Resolution in v3 |
|---|---|
| 1. Full release vs holdback | Holdback applies; final approval releases the remainder minus holdback (§4.2, §7.2) |
| 2. Reputation points vs formula | Formula stands for the contractor score; separate client score (P8). 80/20 split still open (O25) |
| 3. Holdback schedule coupled or independent | Independent choices, as in the Addendum (§3.4, §12) |
| 4. Change Order withdrawal after acceptance | The state no longer exists — Decision Confirmed P12 (§4.4) |
| 5. Early loan repayment | Allowed without penalty (§7.5) |
| 6. EUR-only awaiting confirmation | Superseded by D5; MVP1: one currency per contract, EUR default (P11, D26) |
| 7–8. Registry cross-references | Values restated in §12; the registries are to be regenerated from this document |
| 9. Change Order non-response still "parked" | Decided: expiry without consequence (§4.4) |

### 13.6 Older content that is superseded

| Source | Superseded content | By |
|---|---|---|
| v2 §1.1, §6.6; Codex Identity clause 1; Implementation Registry | Identus + DigiD | D1, D22 |
| v2 §6.8; Session overview #6; Payment/Bank Coupling Codex as a whole | Mollie, Payment Service Layer, bank coupling | D2, D4 |
| Codex Escrow clause 9; Configuration Registry `platform_fee` | Fee at payout | D10 |
| Codex Escrow clause 1 | "Confirmed by the payment provider" | Ledger confirmation (§5.4) |
| Codex Escrow clause 6 | Withdrawal of an accepted, unfunded Change Order by mutual consent | D16 (P12) |
| Codex Escrow clause 7 | Whole escrow frozen on a dispute | D9: disputed amount only |
| Codex Identity clause 5; `dispute_escalation_ladder` | Straight to the mediator, no step before | D8: parties first |
| Final Evaluation clause 1 | Escrow "fully released" | Holdback |
| v2 §5 | Cardano/Midnight data placement table | D4, §6 |
| Session overview #2 | EUR-only settlement | D5 |
| Decision Log D8 (v1.002–v1.005), D19; Build Spec v3.001 §8.4 | Binding decision by the mediator; "not executable — O1"; Mediator acting for the claimant and GoodCompany | D21 |
| Build Spec v3.001 §1.1, §8.1 | Proposed domain name in place of GoodTrade | D23 |
| Build Spec v3.001 P21, P22 (proposal wording) | Unspent budget released at approval of the materials milestone; supplier payment counted as payout for fee purposes | D12 (P21); D10 (O19) |
| Build Spec v3.001–v3.002 | `materials_delivered` as a formal completion request with approval and response window | D12 (O20): `materials_ordered` status update only |
| Build Spec v3.001–v3.004 | Fee deducted per payout; fee on supplier payments withheld; fee transferred per tranche | D10 (v1.009): 2% frozen at deposit, transferred at completion |
| Warranty/Holdback Addendum; Configuration Registry | Holdback percentage as a choice of 5, 10 or 15 | D25 (P9): fixed 10% |
| Build Spec v2 §2.1.1 | One reputation score per user | D24 (P8): separate scores as client and as contractor |
| Escrow Protocol v1, Inputs table and "What the simulation must mirror" | Fee "charged once at funding"; whole fee to the fee address at final approval | D10 |
| Escrow Protocol v1, materials allowance | Applies only once the escrow runs on Midnight | D12: functional rule now, simulated in MVP1 |
| Escrow Protocol v1, Path 2 stage 1b | Contractor signs `escalate` to activate the mediator | D17 |
| Escrow Protocol v1, Path 2 stage 5; mediator key in the contract data | Binding decision by the mediator and one party | D21: non-binding advice; no signing role |
| Escrow Protocol v1, Change Order row | Positive Change Order only | D16 |

---

## 14. Glossary

| Term | Definition |
|---|---|
| GoodTrade | The trade domain inside GoodCompany: Negotiation Workspace through escrow, completion, warranty and disputes. Not to be confused with GoodTrade Lite, a separate future pitch tool |
| Escrow Ledger | The interface behind which escrow rules run. `SimulatedLedger` in MVP1 |
| Action | A prepared escrow step that takes effect only when its required parties have signed |
| Completion request | The contractor's formal request for payout of a milestone or the final delivery, with the agreed evidence |
| Response window | The 14 calendar days the client has to respond to a completion request |
| Payment deadline | 30 days after a completion request; if still unpaid, the Mediator is activated |
| Disputed amount | The amount an objecting party states and motivates; the only amount that is frozen |
| Mediator | The independent professional named in the contract, who mediates and gives non-binding advice |
| Advice | The Mediator's non-binding recommendation after mediation has not produced agreement |
| Holdback | Part of the contract amount kept in escrow during the warranty period as a motivation amount |
| Tranche | A part of the holdback that becomes claimable on a date |
| Advance milestone | A phase paid to the contractor once the escrow is funded, without a completion request. Separate from the materials budget |
| Materials budget | The share of the contract value reserved for supplier payments, never reduced by the fee; the unspent part is paid to the contractor at the final payout |
| `materials_ordered` | A status update by the contractor; no approval, window or trigger |
| Supplier payment | A payment from the materials budget to a verified supplier, signed by the contractor; the client gets a notification without the amount |
| Self-supply | Materials the contractor supplies himself; no supplier payment, paid as labour income at the final payout |
| Client surplus | An amount removed by a negative Change Order, kept in escrow for the client until final settlement |
| Collect-wallet | The GoodCompany wallet on Midnight where final fees gather before a batch goes to the Community Bank. Called the fee collection account in the data model |
| Fee batch | One combined transfer of at least a minimum number of fees to the Community Bank |
| Nested contract | A new contract linked to an earlier one in the same project, for extra work after a completion request |
| Rookie Stage | The period before a profile's reputation score becomes public |
| Private collaboration preference | A user's private prefer/avoid mark on a contact |
| Simulated balance | An MVP1 test balance with no relation to real money |

---

## Appendix A — GoodCompany Organisation

Carried over from v2 Appendix A; unchanged in substance, status Confirmed.

- Platform use stays free for users; the only charge is the 2% on realised contract value.
- 1% of that fee (0.02% of contract value) goes to the Organisation Reserve, to cover operating and infrastructure costs. It is a cost-covering mechanism, not profit extraction.
- The reserve is intended to fund GoodCompany's own closed Cardano and Midnight stake pools. This is distinct from PING's open stake pool and must stay architecturally separate.
- None of this is built in MVP1 beyond the split per fee batch (§7.1).

## Appendix B — Roadmap after MVP1

Non-binding; carried over from v2 §12 with the November changes.

| Stage | Items |
|---|---|
| Next decision | Whether to take the interim Cardano route (D15) or wait for the Midnight dependencies |
| MVP2 | Dispute Center self-service layer and AI suggestions; automated missed-payment detection; Innovation Fund slots; Plugin Marketplace; Project Execution module; bookkeeping connector; applicant-flow throttling; photo and file uploads as completion evidence |
| MVP3 | Compliance export tooling; AVI with DigiD or EU identity as source; badges; community roadmap voting |
| Target architecture | Shielded escrow on Midnight; shielded materials account with payments to verified suppliers; Community Bank on Cardano |
| Later | Additional bank products by community vote; GoodTrade Lite as a separate pitch tool; PING stake pool |
