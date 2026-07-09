**Good****Trade****  ·  GC**

**Product ****&**** Development Briefing**

*Assignment briefing for the development team — version 1.0*

**  PART OF THE GOODCOMPANY ECOSYSTEM  **

This document describes the GC platform (GoodTrade / GoodCompany core platform): a work marketplace where clients and contractors reach a fair contract through a structured negotiation process, backed by an escrow-based payment system and a cooperative Community Bank. This document serves as a reference for the development team: it sets out the product philosophy, functional requirements, information architecture, and design guidelines, so a team can base a technical design and sprint plan directly on it.

# **Table of Contents**

# **1. Vision ****&**** Product Philosophy**

GC is the economic core platform within the GoodCompany ecosystem: the layer where people work, do business, financially support each other, and build value — as a counterweight to platforms that pit contractors against each other on price. The ecosystem also includes a democratic layer (P3) and a journalism/transparency layer (Whistleblower); GC can operate independently but eventually shares identity and governance infrastructure with these projects.

## **1.1 The Core Problem**

On most existing marketplaces, the client sets the budget upfront and then picks the cheapest of dozens of free quotes. This undermines the market: the client rarely has the expertise to judge what a job actually costs, and contractors are forced to compete with each other on price rather than quality.

## **1.2 The Design Principle**

- **Expertise sets the price: **not the client. The price is only established after a substantive conversation, once the contractor genuinely understands what the work entails.

- **Negotiation friction is a feature: **by only allowing a quote as the final step (after a mandatory conversation), a natural brake is placed on the number of responses a client can collect. This forces a smaller, more deliberate selection — and therefore a fairer negotiating position for the contractor.

- **Terms before money: **terms of engagement (working hours, warranty, ownership, payment phases) are agreed before price is discussed.

- **Control instead of trust: **for financial constructions (escrow, Community Bank loans), fraud is prevented not by asking for trust, but by only releasing funds based on verified milestones or by paying a third party directly.

# **2. Product Objectives**

The platform must:

- Offer a job marketplace without a visible upfront budget, to prevent price-anchoring effects.

- Enforce a structured negotiation process before a quote can be issued.

- Give clients control over the inflow of responses (open / closed / dormant statuses).

- Support contracts with version control and a fully reviewable audit trail.

- Enable phased (milestone-based) payment with mutual approval.

- Provide escrow-based payment security for both parties.

- Offer a cooperative Community Bank that finances exclusively business investments, with transparent reserve and risk monitoring.

- Make reputation and expertise visible and filterable via profiles.

# **3. Core Mechanism: From Job to Contract**

## **3.1 Posting a Job**

A client posts a job with a title, category, location/region, and urgency. No budget is deliberately shown — this prevents price from becoming the first and only selection criterion.

## **3.2 Responding ****&**** Job Status**

Multiple parties can respond to a job, which starts a conversation (see 3.3). The client can set the job to one of three statuses at any time:

- **Open: **new responses are welcome.

- **Closed: **the job has been filled or withdrawn.

- **Dormant: **the client already has enough conversations running and temporarily wants no new responses; this can be reopened if ongoing conversations don't lead to a match.

This status mechanism is a deliberate design choice: it gives the client control over their own "negotiation fatigue" and keeps the number of simultaneous candidates manageable.

## **3.3 The Negotiation Workspace (Core Module)**

Every conversation between client and candidate follows a fixed structure, not a free-form chat:

- **1. Introduction: **free-form introduction, initial questions about the job.

- **2. Technical intake: **structured Q&A in which the contractor gathers the information needed to properly assess the work.

- **3. Working method ****&**** terms of engagement module: **a version-controlled proposal (working hours, communication channel, warranty period, ownership of materials/IP, payment phases as percentages, cancellation terms). Both parties can propose changes until consensus is reached; each change creates a new version so the process remains traceable.

- **4. Quote module: **only after agreement on the terms of engagement does the contractor set the price. For phased payment, the quote is automatically split into phase amounts according to the previously agreed percentages.

- **5. Contract preview ****&**** signing: **final overview of terms + quote; once both parties agree, the contract becomes active.

A client can have multiple Negotiation Workspaces open simultaneously with different candidates. As soon as they choose one party, the remaining candidates automatically receive a message that another party was chosen.

## **3.4 Escrow ****&**** Payment**

Upon accepting the quote, the client deposits the amount into an escrow account and an execution period begins. Two routes are possible:

- **Lump-sum payment: **after delivery and approval of the final evaluation.

- **Phased payment: **at each agreed milestone (e.g. 20% progress), the contractor submits an interim delivery/review; only after approval and signature by the client does escrow release that portion.

## **3.5 Change Orders ****&**** Adjustments During Execution**

If it becomes clear during execution that the scope is larger than anticipated (e.g. due to supplied materials or changed requirements), the contractor can flag this within the contract. This opens a targeted renegotiation (not the entire process from scratch) that, once agreed, adjusts the contract and the remaining payment.

## **3.6 Final Evaluation**

Upon delivery, both parties sign a final evaluation. Any discrepancies or points of discussion can be clarified via a linked chat function, so the full final verdict — including justification — is preserved in the audit trail.

# **4. Contracts**

Every contract is in one of three states, visible under "My Contracts":

- **In negotiation: **conversation ongoing, no accepted quote yet.

- **Active: **quote accepted, escrow funded, execution underway (incl. any milestones).

- **Completed: **final evaluation signed and closed.

For every contract, in every state, the full history must be reviewable: communication, versions of the terms of engagement, quotes, milestone approvals, and any renegotiations (audit view).

# **5. Searching ****&**** Filtering Jobs**

- Filter by region.

- Filter by industry/category.

- Filter by (indicative) budget, if the client optionally chooses to share this.

- Checkbox "Search only within my expertise" — linked to the expertise tags on the user's own profile; enabled by default, but can be manually disabled to search more broadly.

# **6. Profile ****&**** Reputation**

Every user has a profile that functions as a mini portfolio website:

- Company or personal profile with description and areas of expertise (tags).

- Portfolio of previously completed projects.

- Reviews and endorsements from previous clients.

- Reputation score, built from completed jobs, reviews, and reliability (e.g. meeting deadlines).

- Statistics such as number of completed projects, satisfaction rate, and average response time.

# **7. Community Bank**

The Community Bank is a cooperative fund, fed by a 2% platform fee on transactions, that finances exclusively business investments made by participants. The fund is deliberately phase-driven rather than based on fixed amounts or time periods, so it automatically adapts to inflation, growth, and scale.

## **7.1 One Fund, Multiple Reserves**

Rather than one large pool of money, every incoming euro is automatically distributed across several virtual reserves, each with its own purpose and payout rules:

| **Reserve** | **Purpose** | **Example Split** |
| --- | --- | --- |
| **Safety Reserve** | Absorbs risk, keeps the fund solvent | 60% |
| **Credit Reserve** | Feeds business loans (layer 2) | 20% |
| **Legal Fund** | Covers legal support and disputes | 10% |
| **Innovation Reserve** | Feeds the Innovation Fund (layer 3) | 10% |

These percentages are illustrative and should be configurable by the platform. In addition, a Capital Flow Dashboard is maintained (see 7.5) showing, per source, where every euro comes from: platform fees, loan repayments, interest, or successful exits from the Innovation Fund.

## **7.2 Phase 1 — Stability**

The startup phase. Goal: build liquidity in the Safety Reserve, enable loans from the Credit Reserve, fund legal coverage and basic insurance from the Legal Fund. The reserve display shows, per fund: total available capital, mandatory reserved amount (with percentage), freely deployable amount, and the current phase status.

## **7.3 Phase 2 — Growth**

Once the Credit Reserve grows substantially larger than the amount actually outstanding in loans, inefficiency arises: a lot of capital sits unused. This is measured with a 

- **Liquidity Utilization Ratio: **(outstanding credit ÷ total reserve). An additional dashboard shows the capital split between safety buffer, outstanding loans, and unused capital.

## **7.4 Phase 3 — Innovation Fund ****&**** Investment Slots**

The Innovation Fund is a fundamentally different product from a loan: no interest, but equity or revenue share, and a higher risk profile. Rather than thinking in millions of euros, the Innovation Reserve is expressed in 

- **investment slots: **a fixed investment budget per project (e.g. €500,000 per slot). Once the Innovation Reserve has filled the next slot, a notification automatically appears that there is room for a new investment round — the user thus thinks in terms of "how many slots are available" rather than absolute amounts.

Once a startup is approved, the slot amount is paid out and the reserve for that slot begins recharging again from ongoing platform activity (fees, repayments, interest, exits).

- **Community Health Score: **a composite score (liquidity, default rate, cash flow, reserve level) automatically — not manually — determines when the Innovation Fund becomes available and how many concurrent slots may be open.

- **Adaptive voting cadence: **to prevent voter fatigue as the platform scales (and thus fills slots more often), the Community Bank itself determines how many slots may be open concurrently, or the community votes at fixed, periodic moments (e.g. monthly) on multiple fully-filled slots at once.

An application to the Innovation Fund takes the form of a full startup pitch: company name, problem, solution, market, competition, business model, team, amount needed, use of investment, pitch deck/video. The application goes through: community review → expert review → due diligence → voting round → investment.

Profits from successful Innovation Fund investments (exits) flow partly back into the Innovation Reserve — not the general Safety Reserve — so the safety buffer is never put under pressure as the investment portion grows.

## **7.5 Capital Flow Dashboard**

To deliver on the promise of transparency, the platform shows not only "how much money do we have", but also where every euro comes from and goes to — monthly, broken down by the four reserves (Safety, Credit, Legal, Innovation) and by source (platform fees, loan repayments, interest, exits). Individual users can, if they wish, see what portion of their own completed job contributed to the Innovation Reserve — this makes the contribution of individual activity tangible and strengthens community engagement.

## **7.6 Capital Hierarchy**

| **Layer** | **Function** |
| --- | --- |
| **1 — Safety Reserve** | Unused capital, absorbs risk |
| **2 — Loans (Credit Reserve)** | Business loans with interest and repayment obligation |
| **3 — Innovation Fund (Innovation Reserve)** | Angel investing via investment slots: equity / revenue share |
| **4 — Co-investments** | Joint investment with municipalities / impact investors |
| **5 — Strategic reserves** | Long-term buffer for the entire cooperative |

## **7.7 Loan Application — Requirements**

A loan application is a compact business plan, not a simple form:

- Purpose of the investment — exclusively business investments (e.g. equipment, inventory, transport, software); never living expenses or revenue bridging.

- Type of investment.

- Amount requested.

- Repayment term — an interest rate is automatically derived from this.

- Projection of expected additional income from the investment.

- Supplier/third party delivering the investment — this party must create their own GC account.

## **7.8 Payout via Sub-Escrow**

Upon approval, funds are never paid out directly to the applicant. A sub-escrow is created between the Community Bank and the applicant; from that sub-escrow, the (platform-registered) supplier receives the right to payment. This keeps the money traceable within the platform and prevents improper use as personal income.

## **7.9 Community Voting**

Loan applications and Innovation Fund applications are both put to a community vote. Every application shows: vote split (for/against), progress toward the required quorum, and the required majority threshold (e.g. ≥60% of votes, with a minimum quorum of N votes). For the Innovation Fund, the adaptive voting cadence described above also applies to prevent voter fatigue.

## **7.10 Reserve Transparency Requirement**

Reserve status must always be visible as a progress bar with an explicit threshold marker (e.g. at 52–55%): below this threshold, new loans are not approved, regardless of the voting outcome. This prevents the cooperative from putting itself in financial difficulty.

# **8. Other Modules (Sitemap)**

The modules below are part of the full product vision. See chapter 11 for phasing (MVP vs. later releases).

| **Module** | **Core Function** |
| --- | --- |
| **Dashboard** | Overview of work status, active contracts, negotiations, escrows, Community Bank snapshot, and notifications. |
| **Project Execution** | Project dashboard, tasks/milestones, activity log, document vault, structured communication, change-order center, delivery & acceptance. |
| **Plugin Marketplace** | Add-ons such as insurance, accounting, and legal support, linkable to an active contract. |
| **Dispute Center** | Opening disputes, uploading evidence, viewing contract logs, mediation and arbitration flow, escrow freeze/unfreeze. |
| **Agenda ****&**** Planning** | Calendar, deadlines, milestones, meetings, deliveries, and escrow events. |
| **Notifications Center** | Central alerts for contract updates, required approvals, change-order requests, escrow actions, and disputes. |
| **System / Audit Layer** | Full, exportable traceability: contract history, escrow audit trail, procurement logs, compliance exports. |

## **8.1 UX Core: State Machine Instead of Menu**

The interface is not primarily menu-driven, but context-driven: at any moment, every user is in one of five states — negotiating, executing, financing, resolving, closing — and the UI adapts accordingly, rather than the user constantly navigating between separate menus.

# **9. Technical Architecture (Directional)**

This section is directional, not prescriptive — the development team determines the final technical implementation.

- Dual-layer blockchain: Cardano as the public settlement layer, Midnight for privacy-sensitive contract data (amounts, terms, identity).

- Escrow and sub-escrow as smart contracts; release tied to milestone approval or to registered third parties (Community Bank).

- Self-sovereign identity (SSI) via Hyperledger Identus for verified profiles — shares infrastructure with other GoodCompany projects (e.g. AVI) longer term, but is not a hard requirement for an MVP.

- Governance/voting contract for Community Bank loans (quorum, majority threshold) and later for Innovation Fund voting rounds.

- Full audit trail as an immutable, append-only log structure, linked to every contract.

# **10. Design Guidelines**

- Colours: Teal #5CBDC7 (primary) and Orange #F39221 (accent).

- Typography: Montserrat for headings, Arial for body text.

- The GoodTrade brand name is visually split into two colours ("Good" in teal, "Trade" in orange).

- Financial/blockchain-related labels (e.g. simulation indicators, transaction statuses) may use a monospace typeface to distinguish them from regular UI text.

# **11. Phasing: MVP vs. Later Releases**

## **11.1 MVP (Phase 1)**

- Job marketplace with open/closed/dormant status and filters.

- Negotiation Workspace (introduction through contract preview).

- Contracts in three states with audit trail.

- Escrow with optional phased payment.

- Community Bank phase 1 + 2 (Stability, Growth/loans) with reserve transparency and community voting.

- Basic profile with portfolio and reviews.

## **11.2 Phase 2**

- Innovation Fund (Community Bank phase 3), including the Community Health Score mechanism.

- Project Execution module fully built out.

- Dispute Center.

- Plugin Marketplace (first add-ons).

## **11.3 Phase 3**

- Full System/Audit Layer with compliance exports.

- Co-investments and strategic reserves (Community Bank layers 4–5).

- Deeper integration with other GoodCompany ecosystem projects (identity, governance).

# **12. Glossary**

| **Term** | **Definition** |
| --- | --- |
| **Dormant (job)** | Status in which a job temporarily accepts no new responses. |
| **Negotiation Workspace** | The structured conversation environment between client and candidate, prior to a quote. |
| **Escrow** | An account where payment is held until agreed conditions are met. |
| **Sub-escrow** | An escrow tied to a specific sub-transaction, e.g. a Community Bank loan directed to a supplier. |
| **Liquidity Utilization Ratio** | The ratio between outstanding credit and total Community Bank reserve. |
| **Community Health Score** | A composite score (liquidity, default rate, cash flow, reserves) that automatically determines Community Bank phase transitions. |
| **Innovation Pot** | A separate reserve, fed by profit from the Innovation Fund, for higher-risk experimental financing. |
| **Quorum** | The minimum number of votes required for a vote to be valid. |
| **Investment Slot** | A fixed investment budget within the Innovation Fund (e.g. €500,000) that fills up from ongoing platform activity. |
| **Community Health Score** | A composite score that automatically determines whether and how many investment slots may be opened. |

# **13. Appendix — Navigation Structure (Sitemap)**

The diagram below shows the complete, expanded page structure of GC: all eleven main modules with all their subpages, including the detailed Community Bank Loan Flow as its own UI zone. The highlighted (orange) modules — Work, Finance, and Community Bank Loan Flow — form the heart of the negotiation and financing mechanism central to this document; the remaining modules are supporting.

This structure is deliberately not a strictly menu-driven navigation: as described in chapter 8.1, the user primarily experiences the app as a context-driven state machine (negotiating / executing / financing / resolving / closing). The sitemap diagram above serves as a completeness overview for the development team, not as a literal menu structure that needs to be visible one-to-one in the UI.