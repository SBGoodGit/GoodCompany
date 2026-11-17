# GoodCompany — Decision Log, 16–17 November 2026

<!-- v1.000 (16-11-2026): Eerste versie — besluiten over DigiD, Mollie en projecttaal; escrow-opties ter beoordeling -->
<!-- v1.001 (16-11-2026): Escrow-architectuur bevestigd, USD-settlement, geschilprocedure en open punten toegevoegd -->
<!-- v1.002 (16-11-2026): Afrondings- en geschilprocedure herzien (triggers, termijnen), herstel-/meerwerk, materialenbudget en fee-reservering toegevoegd -->
<!-- v1.003 (17-11-2026): Midnight als doelketen voor de handelscyclus, fee-bundeling naar Community Bank, materialen als vaste verkoopprijs; D4, D10 en D12 herzien -->
<!-- v1.004 (17-11-2026): Gefaseerde route (D15) en minimale bundelgrootte toegevoegd; ketenonafhankelijkheid expliciet gemaakt -->
<!-- v1.005 (17-11-2026): Besluiten over P1, P6, P7, P10, P12–P20, OD3 en OD11 verwerkt; D10 en D12 herzien, D16–D20 toegevoegd; O4 en O7 gesloten; nieuwe open punten O15–O18; voorrang boven Escrow Protocol v1 vastgelegd -->
<!-- v1.006 (17-11-2026): Besluiten over O6–O18, P3, P4, P5, P21–P23 verwerkt; adviserend Mediator-model (D21) vervangt bindende beslissing; D8, D10, D12, D13, D17, D18 herzien; D19 vervallen; D22–D23 toegevoegd; open punten O19–O23 toegevoegd -->
<!-- v1.007 (17-11-2026): O1 als functioneel uitgangspunt, O19 (fee 2% van de contractwaarde, materialenreservering intact) en O20 (statusupdate materials_ordered) verwerkt; P2, P8, P9, P11 besloten; D8, D10, D12, D14, D21 herzien; D24–D26 toegevoegd; nieuwe open punten O24–O27 -->
<!-- v1.008 (17-11-2026): D10 verduidelijkt: fee vooraf gereserveerd als vast deel van het totaalbedrag, geen fee over leveranties; O27 gesloten -->
<!-- v1.009 (17-11-2026): D10 vereenvoudigd: 2% bevroren bij storting en in één keer overgemaakt bij afronding van de opdracht; P6 vervalt -->
<!-- v1.010 (17-11-2026): O24 en O26 besloten (reactietermijn alleen voor volledige oplevering; holdback ook bij 0 dagen garantie); O25 uitgesteld -->
<!-- v1.011 (17-11-2026): Build Spec v3.007 geaccepteerd door de product owner -->

Decisions taken by the product owner on 16 and 17 November 2026, after the project review (`claude/GoodCompany_Project_Review_2026-11-16.md`). Status labels follow the project taxonomy. All entries up to v1.010 are processed in Build Spec v3.007, which the product owner accepted on 17 November 2026 (`claude/GoodCompany_MVP1_Build_Spec_v3.md`); the Codex and registries are not yet updated. This log is leading where it differs from the Build Spec or from the Claude doc "GoodCompany Escrow Protocol v1 — Architecture Proposal" (https://claude.ai/artifact/FzDsNXBC38ZSkJQ7Xuyrik).

## Decision Confirmed

**D1 — DigiD is out of MVP1 scope.**
MVP1 is built without DigiD. DigiD remains a future ambition, to be reached through AVI.
Note from the review: Logius only connects organisations with a statutory public task and the legal right to use the BSN.

**D2 — Mollie is withdrawn as the escrow mechanism.**
Reason: delayed routing must be completed within 90 days, which does not cover execution time plus warranty.

**D3 — The project is built in English.**
A Dutch frontend translation follows later.

**D4 — Blockchain-native escrow; Midnight for the trade cycle, Cardano for the Community Bank.**
Motivation: international deployability and privacy. Target direction: the whole trade sequence, including the escrow, funding, payments in between, disputes and the final payout, runs on Midnight. Cardano is used only for what goes into and out of the Community Bank. GoodCompany holds no private keys. Fiat enters and leaves through external regulated providers.
Dependencies, not established facts: a stablecoin on Midnight, a transfer route from Midnight to Cardano, and the legal classification of the resulting payment architecture.

**D5 — Settlement in a USD stablecoin is allowed.**
EUR may remain the unit shown in a quote. The contract fixes one currency and one exact amount at signing. USDCx is the preferred candidate, subject to its MiCA status and its availability on the chosen chain.

**D6 — GoodCompany Escrow Protocol v1 is the functional target architecture** for Build Spec v3 and the MVP1 simulated escrow.
The protocol describes functions, signers and state transitions and is independent of the chain. The business rules must not change when the chain changes. This does not approve any validator implementation or its regulatory status. Where the protocol differs from this log, this log wins (see the last section).

**D7 — Normal settlement and dispute resolution are separate paths.**
The Mediator has no role in normal settlement. The parties keep control for as long as they agree.

**D8 — Completion and dispute procedure.** *Revised in v1.006 by D21.*
- The contractor reports completion with evidence and requests payout. The client has at most 14 calendar days to approve, object, object in part, or ask for information.
- Silence is never approval and never leads to automatic payout.
- After an objection the parties first try to settle directly.
- The Mediator is activated in one of three ways: (a) either party activates the Mediator alone, at any time after an objection; (b) automatically after 14 days of silence, at the start or later in the process; (c) automatically when a completion request is still unpaid 30 days after it was made, even if the parties are still talking. How (b) and (c) run: see D17.
- The mediator period is 30 calendar days and always starts at activation. A design principle motivated by the cashflow dependency of freelancers and small businesses; the Dutch statutory payment term is the reference point, not the legal basis.
- Two functions: mediation, then non-binding advice if no agreement is reached (D21). *Previously: binding dispute resolution.*
- Extension: the Mediator alone decides, with a reason, notice to both parties and a revised date. No fixed maximum number of extensions.
- Non-responsive party: after demonstrable notification and a reasonable opportunity to respond, the Mediator may advise on the available evidence. Absence is not an automatic loss.
- Absence may not lock the funds indefinitely. Resolved in principle in v1.007: a final, enforceable court ruling must be executable through the escrow without the refusing party's consent (D21, O1). Until that construction exists, a refusing party can still lock the disputed amount for as long as the court route takes.
- The Mediator first investigates why a party is silent before any advice on the substance.

**D9 — Undisputed funds.**
Only the disputed amount stays frozen. The objecting party states and motivates the amount; the Mediator assesses whether it is reasonable.

**D10 — Platform fee and fee route** (replaces Codex Escrow clause 9). *Simplified in v1.009 by the product owner; replaces the detailed v1.005–v1.008 rules.*
- The fee is 2% of the total contract amount.
- The contractor takes the 2% into account when making the quote. The client deposits the full contract amount; nothing is added on top.
- At deposit, the 2% is frozen in the escrow. When the job is completed, the frozen fee is transferred in one go to the GoodCompany collect-wallet.
- No fee on supplier payments; the materials budget stays intact.
- A contract cancelled in full before any payout pays no fee.
- Mediation is paid from the pooled fees, as in the Codex.
- **Fee route (O6).** Every contract has its own escrow on Midnight. The collect-wallet, also on Midnight, gathers fees from different contracts and periodically converts and transfers its balance to a future Community Bank wallet on Cardano, when it holds at least a minimum number of fees (initial values: every hour, five fees; configurable). The Cardano destination depends on infrastructure becoming available. Privacy and traceability of the whole route must be validated.

**D11 — Repair work and extra work.**
The payment deadline can be moved only by a new agreement between the parties, and that agreement must pay out what is no longer in question. Adding work may not be used to keep money frozen. Worked out as: repair agreement inside the same escrow; Change Order during execution; nested contract after a completion request, with a payout or part-payment of the first contract as a condition.

**D12 — Materials and advances.** *Revised in v1.005 by P10, P20, OD3; in v1.006 by P21, P23, O15, O16, O17; in v1.007 by O19 and O20.*
- Materials supplied or procured by the contractor are priced at the agreed selling price in the quote. The contractor's margin is part of his business model and is confidential.
- The contractor never has to disclose purchase invoices, supplier prices or discounts to the client or to GoodCompany. No reconciliation of actual costs; under the standard arrangement no refund of an unused materials amount.
- The client must not be able to see what was paid to suppliers. GoodCompany shows materials only as the agreed amount.
- The quote shows `materials_amount` as one informational figure: the agreed selling price, never a breakdown. It is not the source of supplier payment amounts and does not replace the reserved materials budget. The full contract amount, including materials, is funded. (P20)
- The materials budget is reserved separately inside the escrow, as a percentage of the contract value approved by the client's signature on the terms, and supplier payments are made directly from escrow to the supplier, in full, not first to the contractor. The reservation is never reduced by the fee. (P10, O19)
- **Supplier payments (P23, O15, O16):** the contractor initiates and signs each supplier payment personally. Payment goes only to a verified GoodCompany account of the supplier. The supplier need not be named in the quote phase. The client does not approve the payment separately and receives a status notification without the amount.
- **`materials_ordered` is only a status update** by the contractor. There is no formal `materials_delivered` approval milestone: the client gives no approval or response for it, no response window runs, and no Mediator trigger applies. The contractor is responsible for delivery and processing of the materials. (O20, v1.007) *Previously (v1.005–v1.006): `materials_delivered` as a formal completion request.*
- **Unspent budget (P21):** the unspent part of the materials budget stays in escrow during execution. Only at completion of the whole contract is it paid to the contractor as labour income, in the last final payout, under the normal fee and payout rules. Example: budget 500, spent 400, the remaining 100 is paid as labour income at final settlement.
- **Self-supply (O17):** when the contractor supplies materials himself, there is no separate supplier payment. The amount stays part of the materials budget and is paid as labour income at final settlement. The contractor is responsible for the execution and processing of the materials.
- **Advances (P10, OD3):** an `advance` is its own milestone type, paid to the contractor, never to a supplier. The contractor can claim it once the escrow is fully funded, without a completion request or the 14-day window; the client approved it by signing the contract and its payment schedule. GoodCompany sets no maximum, standard or default range; the contractor proposes the percentage, the client accepts or rejects it before signing, and once signed it is fixed. The same amount never counts as both advance and supplier payment.
- A cost-reimbursement arrangement is possible only if it is explicitly agreed before contract acceptance. It is not the default.
- **Privacy requirement (O15):** the Midnight architecture is the starting point. The final implementation must show that supplier payments expose no confidential contract information publicly. In MVP1 the ledger is simulated; no real supplier payment or money transfer takes place.
- Paying a supplier without materials arriving is treated as potential fraud, with an investigation and a possible ban. If the work is not completed, materials bought with contract money belong to the client.

**D13 — Unfinished contracts.** *Revised in v1.006 by D21.*
When a contract ends unfinished, the Mediator assesses the situation and advises how it can be handled in a legally correct way; the parties decide. Assumed exception: no Mediator where both parties cancel by agreement and also agree on the materials.

**D14 — The response window.** *Revised in v1.007 by P2 and in v1.010 by O24.*
The client has 14 calendar days to respond to the formal delivery of the whole project. In MVP1 there is no response window per milestone, and the mediator triggers (b) and (c) apply to the final delivery and to open disputes only. Keep MVP1 simple; a per-milestone window can be added later if practice or users ask for it. A request is formal only once the agreed evidence has been supplied.

**D15 — Staged route.**

| Stage | Escrow | Status |
| --- | --- | --- |
| MVP1 | Fully simulated. Reproduces the escrow state transitions and business rules without any blockchain, wallet, stablecoin or payment provider | Decided |
| Interim production route | Real escrow on Cardano in USDCx | Optional. Only by deliberate product decision, because Cardano does not offer the confidentiality of Midnight: amounts, payouts, supplier payments and the fee per contract are public |
| Target | Shielded escrow on Midnight; Cardano only for the Community Bank | Decided as target; depends on D4's dependencies |

MVP1 scope must not be expanded to implement blockchain functionality. None of the open dependencies blocks the simulated MVP1.

**D16 — Change Orders.** (P12, P13, P14)
- A Change Order takes effect through one atomic action. The proposing party describes and motivates it and signs the proposal; the other party signs to accept; any additional amount is deposited in the same indivisible action. A positive Change Order is effective only when the extra amount is deposited in that action.
- There is no "accepted but unfunded" state. The proposing party may withdraw the proposal until it takes effect. The July rule on withdrawing an accepted, unfunded Change Order by mutual consent lapses; Codex Escrow clause 6 is superseded on this point.
- An unanswered proposal expires without affecting the original contract. `expires_at = created_at + min(execution_period_days, 90 days)`.
- `execution_period_days` is part of the contract terms; both parties accept it before signing.
- Change Orders affect unpaid milestones only. Paid milestones cannot be changed retroactively; future milestones may change in work description, description and amount.
- Negative Change Order: the original principal stays in escrow. The removed amount is earmarked as the client's entitlement, unavailable to the contractor, and settled to the client at the final payout of the completed contract, with its reserved fee. It is not a holdback.

**D17 — Mediator console and automatic activation.** (P15, P16; *revised in v1.006 by O9 and D21*)
- MVP1 includes a minimal Mediator console: assigned cases, case files, a deadline overview and the Mediator actions of Build Spec §5.5. Mediator accounts are created and assigned by an administrator. No self-service registration or assignment, no AI support.
- Triggers (b) and (c) of D8 are detected by a system job, which opens a dispute case with `opened_by = system` and notifies the Mediator and both parties. The mediator procedure and its period start at system detection. The waiting party is offered the `escalate` ledger action for signature; that signature does not delay or determine the start.
- Trigger (b) applies within an open completion request or open dispute, not during ordinary execution between requests.
- Trigger (c) does not apply to an amount covered by a repair agreement, or released through the signing condition of a nested contract.
- Automatic activation applies to MVP1 and may be changed in a later version. Refinement of the triggers and any cost arrangement remain open (O9).

**D18 — Contract data storage.** (P17; *target added in v1.006 by O10*)
- MVP1: contract content — messages, terms, quotes and evidence — is stored in the application database, encrypted at rest. A SHA-256 hash of the frozen contract snapshot is recorded in the ledger. This is the MVP1 arrangement, not the privacy architecture.
- Target architecture: contract data stored encrypted off-chain; hashes of relevant data on-chain; the contract parties keep control of their access keys; the Mediator gets selective access to what a dispute requires.
- Storage technique and key management are still to be worked out and validated (O10).

**D19 — Binding decision that cannot be co-signed.** *Superseded in v1.006 by D21.*
There is no binding decision any more. What remains from D19: the Mediator has no authority to force a payment or release funds, and cannot bypass the ledger's authorisation rules. The rule that the Mediator acts for the claimant and GoodCompany is withdrawn (O18).

**D20 — Invoicing.** (P19)
The contractor invoices 100% of the contract amount: the base quote plus Change Orders that took effect. The 2% is not deducted on the invoice; it is shown on a separate fee statement to the contractor. Tax and bookkeeping treatment remains a specialist question (O23).

**D21 — The Mediator gives non-binding advice.** (O8, O9, O18, P3; 17 November 2026)
- The Mediator is independent, gives non-binding advice and takes no binding decision.
- The Mediator has no interest in the outcome, represents neither party and does not act on behalf of a party in the same dispute.
- In MVP1 the Mediator is activated automatically once the agreed conditions are met (D17).
- The outcome of a dispute is decided by the client and the contractor together. If they do not agree, the dispute can go to the ordinary courts with the consent of one or both parties.
- **Court rulings (O1, v1.007), functional principle:** a final, enforceable court ruling must ultimately be executable through the escrow, also when one of the parties refuses to cooperate. No further consent from the refusing party may be required. The Mediator gets no independent power to decide and no power to enforce a ruling on behalf of a party. Open for research: the legal construction, the technical authorisation and execution inside the escrow, GoodCompany's legal position and responsibilities, and how the escrow handles a ruling on a disputed amount.
- Before the Mediator finalises or issues the advice, the parties receive at least 48 hours' notice (P3). This replaces the earlier proposal of 14 days' notice before a binding decision (O8).
- GoodCompany has its own financial interest in the transactions and is therefore involved in the wider construction, but it does not automatically become a claimant in a dispute between client and contractor.
- The legal position of GoodCompany and the Mediator is still to be tested (O2).

**D22 — Identity in MVP1.** (P5, O11; 17 November 2026)
MVP1 uses email verification as a temporary, replaceable solution. More advanced identity verification follows in a later phase.

**D23 — Name of the trade domain and of the dispute role.** (O13, P4; 17 November 2026)
GoodTrade remains the name of the trade functionality within GoodCompany. Other organisations or projects outside GoodCompany using the same name are not relevant to this internal product name. P4's alternative name is not adopted. The dispute role is called "Mediator", with two functions: mediation and advice.

**D24 — Separate reputation scores.** (P8; 17 November 2026)
A user has a separate reputation score as client and as contractor. How a reliability factor applies to the client score, and the Warranty/Holdback Addendum's 80/20 split of reputation points, are not settled by this decision: O25.

**D25 — Mandatory holdback of 10%.** (P9; 17 November 2026)
The holdback is 10% of the contract value and is mandatory. It replaces the Addendum's choice between 5, 10 and 15%. With a 0-day warranty the holdback stays in escrow until both parties have agreed the final payment, as an incentive to finish the project as soon as possible (O26, v1.010).

**D26 — Currency.** (P11; 17 November 2026)
One currency per contract, EUR as default, no FX conversion in MVP1. Within D5.

## Awaiting the product owner's decision

None. All proposals P1–P23 are decided. Note: P8 and P9 were decided with content that differs from the proposals as written (P8 asked about the 80/20 split; P9 about the final phase covering the holdback). Those original questions continue as O25 and O26.

## Open

| # | Topic | State |
| --- | --- | --- |
| O1 | Executing a court ruling through the escrow | **Functional principle decided v1.007 (D21).** Open for specialist research: legal construction, technical authorisation and execution, GoodCompany's position and responsibilities, handling of a ruling on a disputed amount |
| O2 | Legal position of the Mediator (non-binding advice) and of GoodCompany (own financial interest, not automatically a claimant) | Open, for specialist review. Reworded in v1.006: previously the legal form of the combined mediator and decision role |
| O3 | MiCA status of USDCx; custody construction and MiCA boundaries; treatment of shielded assets by EU exchanges and off-ramps | Open, for specialist review |
| O4 | Who bears the fee | Closed v1.005 (D10, P1) |
| O5 | Stablecoin on Midnight; operational, audited two-way route between Midnight and Cardano | Dependency. Not available on what was verified on 17 November 2026: the bridge found runs from Cardano to Midnight and carries the NIGHT token. The Midnight roadmap is a possible future source; availability and suitability must be verified before real financial transactions |
| O6 | Privacy of fee collection | Architecture decided v1.006 (D10). Remains a **validation requirement**: privacy and traceability of the whole route, including the Midnight-to-Cardano step; the collect-wallet as a script with the Community Bank as only destination |
| O7 | Fee on a contract cancelled halfway | Closed v1.005 (D10, P7, OD11) |
| O8 | Notice before the Mediator's final step | Closed v1.006: 48 hours before the advice (D21, P3) |
| O9 | Automatic Mediator activation | Decided for MVP1 v1.006 (D17, D21). Still open: refinement of the triggers, any cost arrangement, and Mediator workload |
| O10 | Contract data storage | Target architecture decided v1.006 (D18). Still open: storage technique and key management, technical work |
| O11 | Identity verification for MVP1 | Closed v1.006 (D22) |
| O12 | Community Bank legal and organisational structure | Open, separate research. Possible directions: an independent foundation; a foundation with a separate BV; another suitable structure. To include: ownership, control, liability, fund management and financial regulation. Not blocking MVP1 |
| O13 | Name of the trade domain; one term per dispute role | Closed v1.006 (D23) |
| O14 | Conflicts between project documents | Closed v1.006: this log is leading; Build Spec v3.002 synchronised. The Codex and registries themselves are not yet updated; Build Spec §13.6 lists what changes there |
| O15 | Privacy of supplier payments | Decided v1.006 as a **validation requirement** (D12). The optional Cardano interim route (D15) cannot meet it with direct supplier payments; choosing that route needs a new decision |
| O16 | Supplier payment controls | Closed v1.006 (D12, P23) |
| O17 | Contractor as his own supplier | Closed v1.006 (D12) |
| O18 | Independence of the Mediator | Closed v1.006 (D21). The enforcement role in D19 lapses |
| O19 | Fee basis with materials | Closed v1.007 (D10): 2% of the total contract value; materials reservation intact. Mechanics: O27 |
| O20 | Approval of the `materials_delivered` milestone | Closed v1.007 (D12): the milestone does not exist; `materials_ordered` is a status update |
| O21 | Whether preparing transactions and running the only interface is a crypto-asset service | Open, for specialist review. Moved from Build Spec S4 |
| O22 | Insolvent client and the escrowed amount | Open, for specialist review. Moved from Build Spec S5 |
| O23 | Tax and bookkeeping: income in a dollar token, the fee statement (D20), unspent materials budget paid as labour income (D12) | Open, for specialist review. Moved from Build Spec S6 |
| O24 | Response window for milestone requests | Closed v1.010 (D14): whole project only in MVP1 |
| O25 | Client reputation score; 80/20 split | Open, deferred by the product owner. Not blocking: scores become public only after 10 completed contracts |
| O26 | Consequences of the mandatory 10% holdback | Closed v1.010 (D25): 0-day warranty allowed; holdback held until both parties agree the final payment |
| O27 | Mechanics of the O19 fee | Closed v1.008 (D10): the fee is reserved upfront as its own slice of the total, so no withholding from later payouts is needed. A fee larger than the labour part is not a realistic case; a contractor who works for (almost) nothing makes his own choice |

## Precedence over Escrow Protocol v1

Where the Escrow Protocol v1 doc and this log differ, this log wins. The protocol doc itself has not been edited. Passages now superseded:

| Protocol v1 passage | Superseded by |
| --- | --- |
| Inputs table, "Platform fee: charged once at funding and refunded for amounts returned" | D10 |
| "What the simulation must mirror": "A one-time fee at funding, refunded for amounts returned to the client" | D10 |
| Path 1, step 3: "reserved fee to the fee address" at final approval | D10: the frozen fee goes to the collect-wallet on Midnight at completion |
| Path 1, Change Order row: positive deposit only | D16: negative Change Order as client surplus |
| Parties and keys: the mediator holds a key that co-signs a binding decision | D21: no binding decision; the Mediator has no signing role |
| Path 2, stage 1b: contractor signs to activate the mediator | D17: system activates at detection |
| Path 2, stage 5: binding decision by the mediator and one party | D21: non-binding advice; execution of an unresolved outcome open (O1) |
| Dispute procedure rules, "Two functions": mediation, then binding dispute resolution | D8, D21 |
| Materials allowance: "these rules apply only once the escrow runs shielded on Midnight" | D12: direct supplier payments are the functional rule now; shielding is target |
| Privacy layer, fee to the Community Bank on Cardano every hour | D10: via the collect-wallet on Midnight, with periodic conversion and transfer to a future Cardano wallet |
| "Three points where the on-chain design differs": Change Order acceptance and funding as one step | Now decided (D16) |
