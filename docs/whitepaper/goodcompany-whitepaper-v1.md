GoodCompany — Whitepaper
A Cooperative Digital Economy Platform Built on Cardano and Midnight
Version 1.0 | Author: Sander B. | Part of the GoodCompany Ecosystem


________________


Abstract
GoodCompany is a cooperative digital economy platform designed for freelancers, independent contractors, and small businesses. It combines smart contract-based payment security, a community-governed bank, a professional reputation system, and a third-party service marketplace into a single integrated ecosystem built on the Cardano and Midnight blockchains.


The platform addresses three structural failures in today's working economy: payment insecurity, administrative overhead, and the absence of affordable community-driven financing. By placing economic governance directly in the hands of its members — using verified work history rather than capital ownership as the basis for participation — GoodCompany creates a self-reinforcing cooperative economy where trust, cashflow security, and community benefit are structurally built in rather than bolted on.


GoodCompany is also the origin platform of a broader ecosystem. Its internal voting system became P3 (People Powered Politics), a standalone civic democracy platform. Its dispute and evidence layer became the Whistleblower & Journalism Platform. All three share the same underlying infrastructure: Self-Sovereign Identity (SSI), a universal case/workflow engine, and a dual-layer Midnight/Cardano architecture.


________________


1. Introduction
1.1 Origin
In 2018, during a slow period in my freelance work, I started asking myself a hypothetical question: if I had unlimited resources and could build anything — something the whole world would notice — what would it be?


I started sketching. The initial design was a professional platform with reputation systems, headhunting, job postings, and a job application module that let candidates break their work experience into skill blocks and present only the relevant ones to a recruiter, each accompanied by a short pre-recorded video. A developer friend described it as "LinkedIn on steroids."


The project stalled when my aunt — Head of HR at ING Global — pointed out that anti-discrimination legislation in the Netherlands prevented recruiters from seeing candidate identities at early stages. My observation was that bias can enter at any point in a hiring process, making the law ineffective in practice. She agreed — but governments had decided, and the project lost momentum.


In 2021, I discovered Cardano and the vision of Charles Hoskinson. The research-first philosophy, the community, the explicit goal of building financial infrastructure for people excluded from traditional systems — it struck me as genuinely noble in a space that often prioritises extraction over contribution. Something clicked. The same core ideas I had been sitting on could live inside this ecosystem, but with a completely different intent: not to build value for myself, but to build something structurally beneficial to the people who use it.


GoodCompany grew from there.
1.2 Why Now
The freelance and independent contractor economy has grown significantly across Europe and globally. In the Netherlands alone, over 1.2 million people work as freelancers (ZZP'ers). Globally, the gig economy continues to expand. Yet the infrastructure supporting independent workers has not kept pace. Payment disputes, late invoices, administrative overhead, and the absence of affordable financing remain endemic structural problems.


At the same time, blockchain technology has matured to the point where these problems can be addressed at scale. Cardano's smart contract infrastructure (Plutus), combined with Midnight's privacy-preserving capabilities, provides the technical foundation for a platform that is both trustworthy and practically usable.


Charles Hoskinson has publicly noted the need for Cardano to deliver more real-world use cases and broader adoption. GoodCompany is precisely that: a platform born not from blockchain enthusiasm but from real frustrations experienced by real workers, designed to solve real problems at scale.


________________


2. Problem Statement
2.1 Payment Insecurity
Freelancers and contractors operate in a fundamentally asymmetric risk environment. The client holds the money; the worker holds the deliverable. Once work is completed, the worker depends on the client's willingness and ability to pay. Late payments, disputes over deliverable quality, and outright non-payment are common.


Legal recourse is expensive, slow, and disproportionate to the scale of most freelance transactions. A €2,000 invoice dispute that ends up in court costs more than the invoice is worth. The result is that independent workers absorb financial risk that larger organisations would never accept.


GoodCompany eliminates this risk structurally through escrow-based payment security: funds are locked before work begins and released only when conditions are met.
2.2 Administrative Overhead
Managing contracts, invoicing, client communication, project tracking, and compliance is a significant time burden for solo workers and small teams. Many freelancers spend 20–30% of their working time on administration rather than their core work.


Centralising these functions in one platform — with smart contracts automating payment conditions and dispute triggers — dramatically reduces this burden.
2.3 Absence of Affordable Financing
Traditional banks are poorly equipped to serve freelancers. There is no credit history for project-based work, no collateral, and no affordable short-term lending product. The result is that independent workers with strong track records and legitimate financing needs have limited options.


GoodCompany's community bank addresses this directly — using verified work history and community trust as the basis for lending decisions, rather than traditional credit scoring.
2.4 Fragmented Professional Infrastructure
Currently, a freelancer needs multiple disconnected tools: a contract template, a payment system, an invoicing tool, a project management platform, a professional network, and separate products for insurance, pension, and legal advice. Each adds cost and complexity.


GoodCompany consolidates these into one integrated ecosystem, with third-party services offered directly through the platform's marketplace layer.


________________


3. Solution Overview
GoodCompany is built around five interconnected systems that reinforce each other:


System
	Function
	Smart contract work agreements
	Payment security and workflow automation
	Community Bank
	Cooperative financing and dispute funding
	Reputation system
	Trust-based access and opportunity
	Marketplace layer
	Third-party service access
	Governance system
	Community control of financial decisions
	

Each system is described in detail in the following sections.


________________


4. Core Platform Features
4.1 Professional Profile and SSI-Based Identity
Every GoodCompany member builds a verified professional profile linked to their Self-Sovereign Identity (SSI). This profile includes:


* Work history and completed contracts (automatically updated after each transaction)
* Verified skills and qualifications
* Reputation score derived from real completed work
* Earned credentials from the platform community


SSI means the member controls their own identity data. No central GoodCompany database holds identity documents. Members can share specific verified credentials — "I am a real person," "I have completed 47 verified projects in the last three years," "I have no outstanding disputes" — without revealing their full identity unless they choose to.


This is particularly important for the third-party marketplace: a member can grant an insurance provider access to their verified work history and reputation score to assess risk, without sharing personal identification documents.
4.2 Smart Contract Work Agreements
All work agreements on GoodCompany are structured as smart contracts. The standard flow is:


Agreement created → Conditions defined → Escrow funded (Cardano)


→ Work begins → Progress tracked → Deliverable submitted


→ Review period → Approval → Atomic settlement


Key principles:


Payment before work begins: The client funds the escrow account before the freelancer starts. Neither party can access the escrow unilaterally — the smart contract is the neutral third party.


Modular contract templates: Not every user will build their own contract from scratch. GoodCompany provides preset templates with standard clauses (delivery conditions, milestone definitions, review periods, dispute triggers). Users can remove unnecessary steps or add custom elements from a library. The smart contract is configured, not coded.


Milestone-based payments: For longer projects, the escrow can be released in stages. Each milestone has defined conditions. When conditions are met and approved, the corresponding portion of the escrow is released automatically.


Privacy on Midnight: All contract negotiation, communication, and intermediate steps happen on Midnight — the privacy-preserving layer. Terms, pricing, and work-in-progress data remain private between the parties.


Settlement on Cardano: The two key milestones that are anchored on the public Cardano chain are: (1) escrow funding, and (2) final settlement. These are publicly verifiable but contain only the necessary data (transaction hash, amounts, timestamps) — not the private terms of the agreement.
4.3 Community Bank
The Community Bank is the financial heart of GoodCompany. It is funded by a small percentage of every transaction on the platform and governed entirely by the community.


Funding mechanism: 2% of every project value flows into the Community Bank. This is not a fee — it is a cooperative contribution that members benefit from directly.


Lending: Members can apply for loans from the Community Bank. Loan approvals are decided by community vote, weighted by verified work history and track record. A member with three years of completed projects and a strong reputation score has earned the right to access community lending — without needing to present collateral to a bank.


Lending limits: Hard-coded protocol limits prevent the Community Bank from becoming over-extended. A maximum of 30–40% of total reserves can be lent out at any time. These limits cannot be overridden by community vote — they are structural protections against populist financial decisions.


Interest rates: Loans carry low interest rates (target: 3–4%). Interest returns to the Community Bank, compounding the shared resource over time.


Dispute funding: Legal costs for contract disputes are covered from the Community Bank. This means members have access to professional dispute resolution without bearing the cost individually.


Future applications: As the Community Bank grows, additional applications become viable — a cooperative pension fund, angel investing in member projects, charitable contributions decided by community vote. These are long-term possibilities, not launch features.
4.4 Reputation System
Trust is the platform's core resource. The reputation system is designed to make trust legible and resistant to manipulation.


Earned through work, not engagement: Reputation upgrades happen automatically after verified, completed transactions. There are no likes, follows, or social engagement metrics. Reputation reflects what a member has actually done, not how visible they are.


Asymmetric update design: Reputation upgrades are automatic. Reputation downgrades are community-reviewed. This prevents targeted reputation attacks while maintaining accountability.


Domain-separated reputation: A member's work reputation on GoodCompany does not automatically transfer to other parts of the ecosystem. Their economic reputation (completed contracts, payment reliability) is distinct from any governance reputation they might build in P3 or review reputation in the Whistleblower platform.


Reputation as access: Reputation score determines access to platform features — higher-rated members get priority matching, access to larger lending amounts, and preferential access to premium opportunities.


Self-correcting economy: Members with consistently poor ratings lose access to opportunities. Members with strong ratings gain access to better ones. The system is designed to reward quality and reliability without requiring central enforcement.
4.5 Third-Party Marketplace
GoodCompany is not just a work platform — it is also a marketplace where third-party service providers can offer their products directly to the community.


This is a deliberate design choice. Independent workers and small businesses need insurance, pension products, legal advice, accounting software, and other professional services. Currently, they source these individually at retail prices, with no negotiating power. GoodCompany aggregates its community into a group buyer with significant negotiating power.


Third-party services can include:


* Business insurance (liability, professional indemnity, project insurance)
* Pension fund contributions
* Accounting and bookkeeping software (integrated with platform transaction data)
* Legal advice packages
* Health insurance tailored to self-employed workers
* Banking services


Provider integration: Third-party providers access the platform via a vetted marketplace layer. They can use members' verified, anonymised platform data (work history, reputation, transaction volume) to offer personalised products — with explicit member consent and SSI-based data sharing.


Revenue model: Third-party providers pay a platform integration fee and/or a revenue share on products sold through GoodCompany. This is a significant long-term revenue stream that reduces dependence on transaction fees alone.
4.6 Community Governance
GoodCompany's financial decisions are made by the community, not by the platform operator. This is a structural feature, not a promise.


Scope of community governance:


* Loan approvals (who gets funded, at what rate)
* Lending limit adjustments (within hard-coded protocol bounds)
* Dispute resolution procedures
* Community Bank reserve allocation
* Third-party provider vetting decisions


Governance design principles:


* Votes are weighted by verified work history, not by token holdings or capital
* Hard-coded protocol limits prevent populist decisions from destabilising the bank
* Good Company Ltd. maintains the platform infrastructure but cannot override community financial decisions
* Governance is designed to be resistant to whale-capture: early users do not get disproportionate voting weight simply because they arrived first


Relationship to P3: GoodCompany's internal governance system was the origin of P3 (People Powered Politics). The same voting and proposal mechanics that govern the Community Bank turned out to be a powerful tool for broader civic decision-making. P3 is now a standalone platform — but it shares the same underlying voting infrastructure as GoodCompany's internal governance.


________________


5. Technical Architecture
5.1 Dual-Layer Design: Midnight and Cardano
GoodCompany uses a two-layer blockchain architecture:


Midnight (Privacy Layer) Everything that should remain private between parties happens on Midnight:


* Contract negotiation and term-setting
* Communication between freelancer and client
* Work-in-progress documentation
* Dispute evidence and correspondence
* Review and approval workflows
* Community Bank loan application details


Midnight uses zero-knowledge proofs (ZKP) to enable verification of conditions without revealing the underlying data. A smart contract on Midnight can confirm that a milestone has been met and approved without exposing the content of that milestone to anyone outside the agreement.


Cardano (Settlement Layer) Everything that needs to be publicly verifiable is anchored on Cardano:


* Escrow funding (the ADA is locked in a Plutus smart contract)
* Milestone settlement confirmations
* Final payment release
* Reputation anchors (hashed, not detailed)
* Community Bank reserve status
* Governance vote outcomes


This separation ensures that commercial and personal transaction details remain private while financial settlements are transparent and auditable.
5.2 Self-Sovereign Identity (SSI)
GoodCompany uses Hyperledger Identus (formerly Atala PRISM on Cardano) for identity management.


SSI means:


* Members hold their own identity in a personal SSI wallet
* No central database of identity documents
* Members can share specific verified credentials without revealing their full identity
* Credentials are verifiable by third parties (insurers, lenders, clients) without contacting GoodCompany


Key credentials in the GoodCompany context:


* Proof of humanity: This is a real, unique person (prevents Sybil attacks)
* Work verification: Verified completed projects and transaction history
* Reputation credential: Current reputation score, domain-separated
* Organisational credential: Verified company or VAT registration
5.3 Smart Contract Infrastructure
Work agreements are implemented as Plutus smart contracts on Cardano. The contract is a state machine with the following primary states:


Drafted → Funded (escrow locked) → Active → [Milestone(s)] → Review → Settled


                                          → Dispute → Mediation → Settled


The contract contains:


* Party addresses (buyer/client and seller/freelancer)
* Milestone definitions and conditions
* SCP (Supplier Claim Percentage) if applicable
* Platform fee
* Optional insurance parameters


Settlement is atomic: all parties receive their portion in a single, irreversible Cardano transaction.
5.4 Token Economy
GoodCompany uses a dual-token model:


ADA (Cardano native token): Used for escrow, settlement, and major financial transactions. All final settlements are in ADA.


Midnight token dust: Used for micro-interactions within the platform — small reputation adjustments, notification fees, minor governance actions. This prevents every minor platform interaction from requiring a full ADA transaction with associated costs.


The platform stakes pooled tokens for yield. Staking rewards help cover operational costs, reducing reliance on transaction fees to fund the platform.


________________


6. The Case Primitive
One of the most important architectural insights in the GoodCompany ecosystem is that a single primitive — the Case — underlies all platform workflows.


A Case is a structured unit containing:


* Identity: Who is involved (SSI-verified)
* Conditions: What needs to happen for the case to progress or settle
* Evidence: Documents, confirmations, or proofs attached to the case
* Review: One or more validation steps by relevant parties
* Settlement: The final outcome — financial, reputational, or otherwise


In GoodCompany, a work agreement is a Case. A loan application is a Case. A dispute is a Case. A Community Bank governance vote is a Case.


The templates differ. The engine is the same.


This insight is what allowed P3 (where a governance proposal is a Case) and the Whistleblower platform (where a misconduct disclosure is a Case) to emerge naturally from GoodCompany's architecture. They are not separate inventions — they are specialised deployments of the same coordination primitive.


Case → define conditions → add evidence/input


→ review/validation → settle (payment/decision/publication)


________________


7. Target Audience and Adoption
7.1 Primary Users: Freelancers and Independent Contractors
The primary target group is the global freelancer and independent contractor community. These users benefit most immediately from:


* Payment security (escrow before work begins)
* Dispute protection (Community Bank funding)
* Administrative simplification (integrated contracts and invoicing)
* Access to lending (community bank based on work history)
* Professional services at group rates (marketplace)
7.2 Secondary Users: Small and Medium Businesses
SMEs benefit from:


* Verified supplier and contractor networks
* Efficient supply chain payment automation
* Access to community bank financing
* Reduced administrative overhead in contractor management
7.3 Tertiary Users: Larger Enterprises and Third-Party Providers
Larger companies can use GoodCompany for:


* Verified contractor procurement
* Supply chain finance integration
* Access to the platform's user data (with consent) for product design


Third-party service providers (insurers, pension funds, accounting platforms) can integrate their products into the marketplace layer, accessing a growing, verified, data-rich user base at low acquisition cost.


________________


8. Business Model
8.1 Transaction Fees
The primary revenue stream is a percentage fee on each completed transaction:


* Standard work agreements: 2% of project value (of which the majority flows to the Community Bank)
* Small transactions: Flat fee with ADA and Midnight token dust
8.2 Third-Party Marketplace Revenue
Third-party service providers pay:


* A platform integration fee
* A revenue share on products sold through the platform


This scales with the size of the user base and is designed to grow significantly as adoption increases.
8.3 Token Staking Yield
Platform-pooled tokens are staked in Cardano staking pools. Staking rewards help cover operational costs.
8.4 Community Bank Interest
Interest on Community Bank loans (target: 3–4%) returns to the bank, compounding the cooperative financial resource over time. A small portion covers platform operational costs.


________________


9. Relationship to the GoodCompany Ecosystem
GoodCompany is not a standalone product. It is the origin platform of a three-part ecosystem in which all components share the same infrastructure.


P3 — People Powered Politics emerged from GoodCompany's internal voting system. The same mechanics that let community members vote on loan approvals turned out to be applicable to civic decision-making at national and municipal level. P3 is a standalone democratic participation platform — completely independent of GoodCompany, but sharing its SSI layer and Case-based voting infrastructure.


The Whistleblower & Journalism Platform emerged from GoodCompany's dispute and evidence layer. A worker reporting workplace misconduct through GoodCompany uses the same case structure as a contract dispute — evidence, review, settlement. Expanded to cover journalistic investigation and verification, this became a standalone platform for anonymous disclosure and verified journalism.


These three platforms are peers, not a hierarchy. None is a "child" of GoodCompany. They share infrastructure:


* SSI identity layer (Cardano/Midnight)
* Case/workflow engine
* Voting mechanism
* Midnight (private) / Cardano (public settlement) dual-layer architecture


A member verified on GoodCompany can use the same identity in P3 without re-verifying. A whistleblower case references the same Case primitive as a work contract dispute. The infrastructure is built once and shared.


________________


10. Governance and Decentralisation Roadmap
GoodCompany is designed to progressively decentralise over time:


Phase 1 (Launch): Platform operator manages technical infrastructure. Community governs financial decisions within hard-coded protocol limits.


Phase 2 (Growth): Community Bank governance expands. Third-party provider vetting shifts to community vote. Protocol limit adjustments require supermajority community vote.


Phase 3 (Maturity): DAO governance for Community Bank. Platform infrastructure governance opens to community. Full decentralisation of financial and operational decisions within cryptographically enforced protocol bounds.


________________


11. Key Risks and Mitigations
11.1 Adoption and Network Effects
A marketplace platform requires critical mass to function. Early users need to see value before the community bank has significant reserves and before the third-party marketplace has multiple providers.


Mitigation: Launch strategy focuses on a specific geographic market (Netherlands) with a defined community of freelancers. Early adopters gain access to the community bank first-mover advantage and reputation building.
11.2 Reputation Gaming
Early users may accumulate disproportionate reputation through volume rather than quality. This creates a first-mover advantage that could be unfair.


Mitigation: Reputation is domain-separated. Downgrades are community-reviewed. The system tracks quality (successful completions, absence of disputes) not volume. Time-decay mechanisms can be added to prevent reputation from becoming permanently entrenched.
11.3 Regulatory Complexity
Operating a community bank and lending facility across multiple jurisdictions creates regulatory complexity, particularly around e-money regulations, lending licensing, and consumer protection.


Mitigation: Initial launch operates within a single jurisdiction (Netherlands, EU). Legal framework review is a prerequisite for launch. The Community Bank is structured as a cooperative reserve pool, not a licensed bank, which reduces regulatory scope.
11.4 Smart Contract Security
Bugs in Plutus smart contracts holding escrow funds create financial risk.


Mitigation: External independent security audits before mainnet launch. Phased rollout with transaction value limits during early stages. Bug bounty programme for the developer community.
11.5 Midnight Ecosystem Maturity
Midnight is a relatively new network. Developer tooling, audit frameworks, and community trust are still maturing.


Mitigation: Architecture is designed to function with Midnight as an enhancement, not a dependency. If Midnight tooling is not production-ready at launch, the private layer can initially use alternative privacy-preserving approaches while Midnight matures.


________________


12. Current Status and Next Steps
GoodCompany is currently in the conceptual and architectural design phase. The vision is detailed, the core mechanics are defined, and the key design questions have been identified.


What exists today:


* Full conceptual design of all core systems
* Defined technical architecture (Midnight/Cardano dual-layer)
* Detailed business model and fee structure
* Ecosystem relationship mapping (P3, Whistleblower)
* SSI integration design
* Case primitive specification


What is needed:


* Technical co-designers and Cardano/Midnight developers
* SSI engineering expertise (Hyperledger Identus)
* Smart contract architecture review (Plutus)
* Legal review for Community Bank structure
* Go-to-market strategy for initial geographic market


The project is actively looking for builders who want to co-design this system — not to implement a finished spec, but to help determine what the right spec is.


Open design questions:


1. What does the Case schema look like as a concrete data structure?
2. How should domain-separated reputation be designed to prevent gaming?
3. Where is the correct Midnight/Cardano boundary for different transaction types?
4. What is the minimum governance structure needed at launch versus what can be added progressively?


→ Join the design discussion: github.com/SBGoodGit/goodcompany-ecosystem


________________


13. Glossary
Term
	Definition
	ADA
	The native token of the Cardano blockchain, used for transaction fees and financial settlement
	Case
	The universal workflow primitive in the GoodCompany ecosystem: a structured unit of identity, conditions, evidence, review, and settlement
	Community Bank
	The cooperative reserve fund built from transaction contributions, governed by members for lending and dispute resolution
	Community Mediator
	A qualified professional providing binding dispute resolution within the platform
	Escrow
	Funds held by a smart contract, released only when defined conditions are met
	Midnight
	Cardano's privacy-preserving sidechain, used for private workflow processing
	Plutus
	The smart contract programming language for Cardano
	Reputation
	A trust score derived from verified completed transactions and community review
	SSI (Self-Sovereign Identity)
	An identity model where users control their own identity data without relying on a central authority
	Smart Contract
	A self-executing agreement where conditions are encoded in software
	UTxO
	Unspent Transaction Output — the accounting model used by Cardano
	ZKP (Zero-Knowledge Proof)
	A cryptographic method for proving a statement is true without revealing the underlying information
	

________________




GoodCompany Whitepaper v1.0 — Working document. Full technical specifications and legal review to follow as the project moves toward build phase. For discussion and collaboration: github.com/SBGoodGit/goodcompany-ecosystem