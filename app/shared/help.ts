// "How it works" texts (step A). One place for every explanation in the app:
// - PAGE_HELP: the "How it works" button in the page heading, keyed by route name (same keys as usePageMeta).
// - TOPIC_HELP: the ⓘ icons next to a function, keyed by topic.
// Each entry names its basis in the specification, so the texts can be checked against Build Spec v3.008
// and the Decision Log (D27–D29). Edit the wording here; nothing else needs to change.

export interface HelpEntry {
  title: string
  what: string // one sentence: what this page or function is for
  steps?: string[] // how it works, in order
  know?: string[] // rules that apply here
  basis: string // where the rules come from
}

export const PAGE_HELP: Record<string, HelpEntry> = {
  dashboard: {
    title: 'Dashboard',
    what: 'Your starting point: what is going on in your negotiations, contracts and the Community Bank.',
    steps: ['Check the deadlines of open requests and cases.', 'Open an active negotiation or contract to continue.', 'Read your latest notifications.'],
    know: ['All balances are simulated: no real money moves in MVP1.'],
    basis: 'Build Spec §11',
  },
  jobs: {
    title: 'Marketplace',
    what: 'Where clients post jobs and contractors find them.',
    steps: [
      'As a client, post a job with a description, category and region.',
      'As a contractor, search the open jobs; by default only within your expertise.',
      'Respond to a job: a Negotiation Workspace opens with the client.',
    ],
    know: [
      'The indicative budget of a job is never shown to contractors, on the listing or in search.',
      'Any contractor can introduce themselves; at most 3 candidates per job go further than the introduction.',
    ],
    basis: 'Build Spec §3.3; D28',
  },
  'jobs-new': {
    title: 'Post a job',
    what: 'Describe the work so contractors can respond.',
    steps: ['Give a title, description, category and region.', 'Optionally add an indicative budget for your own overview.', 'Post the job; contractors can respond right away.'],
    know: ['The indicative budget stays private. A contractor only sees the budget range you give later, in the technical intake of one conversation.', 'The category decides which standard intake questions are asked.'],
    basis: 'Build Spec §3.3; D28',
  },
  'jobs-id': {
    title: 'Job and conversations',
    what: 'The job itself and, for the client, all conversations with contractors about it.',
    steps: [
      'Contractors respond and introduce themselves.',
      'The client moves at most 3 candidates into the technical intake, from their conversation.',
      'Pause new applicants when you have enough; existing conversations continue.',
    ],
    know: ['The client may close a candidate in the intake or terms and move another in, at most 2 times per job.', 'Once a candidate reaches the quote stage, that place is fixed.'],
    basis: 'D28 (candidates per job)',
  },
  workspaces: {
    title: 'Negotiation workspaces',
    what: 'All your negotiations, as client or contractor, with the stage each one is in.',
    steps: ['Open a workspace to continue where you left off.'],
    know: ['A workspace without activity for 21 days expires; you get a notice 3 days before.'],
    basis: 'Build Spec §7.9, §9.1',
  },
  'workspaces-id': {
    title: 'Negotiation Workspace',
    what: 'The client and one contractor go from first contact to a signed contract, in five stages.',
    steps: [
      'Introduction: get to know each other. The client moves the candidate into the technical intake.',
      'Technical intake: both ask questions; the client also gives a budget range (minimum and maximum).',
      'Terms: the contractor proposes the plan (payment phases, warranty, execution period). The client accepts, rejects, or asks for a revision.',
      'Quote: the contractor submits an itemised estimate; the client accepts or rejects it.',
      'Contract preview: both sign with their password. The contract then awaits funding.',
    ],
    know: [
      'The contractor owns the plan; the client states constraints but does not edit the plan.',
      'When the client accepts the terms, the contractor starts spending time on a quote.',
      'When a contract is signed, the other conversations about the job close.',
    ],
    basis: 'Build Spec §3.4, §5.3; D28',
  },
  contracts: {
    title: 'Contracts',
    what: 'Your signed contracts and the state of their escrow.',
    steps: ['Open a contract to fund it, follow the milestones and handle requests.'],
    basis: 'Build Spec §3.5',
  },
  'contracts-id': {
    title: 'Contract',
    what: 'Everything about one contract: escrow, milestones, materials, changes, disputes and completion.',
    steps: [
      'The client funds the escrow with the full contract amount.',
      'The contractor claims an agreed advance, pays suppliers from the materials budget, and requests completion of each phase with evidence.',
      'The client approves (money is released) or objects (only the disputed amount stays frozen).',
      'After the final approval the holdback is paid out in tranches over the warranty period.',
      'Both write a review; the invoices are made automatically.',
    ],
    know: ['Every money action is prepared, summarised and signed with your password before anything moves.', 'Silence is never approval: nothing is released without a signature.'],
    basis: 'Build Spec §4.1–§4.6',
  },
  'disputes-id': {
    title: 'Dispute',
    what: 'A case about a disputed amount between client and contractor.',
    steps: [
      'Talk it through here first; only the disputed amount is frozen.',
      'Either of you can activate the Mediator at any time.',
      'The Mediator investigates and, after a 48-hour notice, gives non-binding advice.',
      'You settle together: a split, or the objection is withdrawn.',
    ],
    know: ['The Mediator never decides and never moves money.', 'Without agreement the disputed amount stays frozen.'],
    basis: 'Build Spec §4.3, §8; D21',
  },
  contacts: {
    title: 'Contacts & Inner Circles',
    what: 'Your own address book of people and companies you work with.',
    steps: ['Add a contact by email or phone.', 'Group contacts as you like, for example "Carpenters" or "Suppliers".', 'When a contact joins GoodCompany, they are linked automatically.'],
    know: ['Your contacts are private to you.'],
    basis: 'Build Spec §3.2',
  },
  'community-bank': {
    title: 'Community Bank',
    what: 'The cooperative fund that the platform fees build up, and that lends to members.',
    steps: [
      'Each contract pays a 2% platform fee. Fees are collected in batches.',
      'A batch goes 1% to the organisation reserve; the rest is split 60/20/10/10 over the Safety, Credit, Legal and Innovation reserves.',
      'Members apply for a loan for equipment, inventory, transport or software.',
    ],
    know: ['Fee batches show time and amount only, so no single contract can be traced.', 'All balances are simulated.'],
    basis: 'Build Spec §3.6, §7.1; D10',
  },
  'community-bank-apply': {
    title: 'Loan application',
    what: 'Apply for a Community Bank loan for a business purchase.',
    steps: [
      'Describe the purpose, amount, term and supplier.',
      'An administrator checks completeness and formal conditions only.',
      'A random sample of members votes; at least 60% must vote in favour.',
      'The money goes to your supplier through a sub-escrow, never to you.',
    ],
    know: ['The interest follows from the term. Early or partial repayment costs no penalty.'],
    basis: 'Build Spec §7.4–§7.5; OD5 (D27)',
  },
  'community-bank-loans-id': {
    title: 'Loan',
    what: 'One loan application: its check, its vote and, once approved, its repayment.',
    steps: ['Invited members vote once.', 'Once approved, release the sub-escrow to your supplier when you order.', 'Repay in part or in full at any time.'],
    know: ['Voters do not see who applied or who the supplier is.'],
    basis: 'Build Spec §7.4–§7.5; OD6 (provisional)',
  },
  invoices: {
    title: 'Invoices',
    what: 'The invoices of your completed contracts and the platform fee statements.',
    know: ['The contractor invoices 100% of the contract amount; the 2% fee appears on a separate statement.'],
    basis: 'Build Spec §7.8; D20',
  },
  profile: {
    title: 'Profile',
    what: 'Your expertise, portfolio and reputation as others see it.',
    steps: ['Set your expertise so you find matching jobs.', 'Add portfolio items.'],
    know: ['Your reputation score is calculated from your first contract, but shown publicly only after 10 completed contracts (Rookie Stage).'],
    basis: 'Build Spec §3.1',
  },
  'users-id': {
    title: 'Public profile',
    what: 'How another member presents themselves: expertise, portfolio and reputation.',
    know: ['Members in the Rookie Stage (fewer than 10 completed contracts) show no public score yet.'],
    basis: 'Build Spec §3.1',
  },
  notifications: {
    title: 'Notifications',
    what: 'Everything that happened for you, newest first.',
    know: ['Notifications are in the app only; no emails are sent except to verify your address.'],
    basis: 'Build Spec §11',
  },
  mediator: {
    title: 'Cases',
    what: 'The disputes assigned to you as Mediator.',
    steps: ['Open a case once it is activated.', 'Investigate, propose, and give non-binding advice after the 48-hour notice.'],
    know: ['You have no signing role and never move money.'],
    basis: 'Build Spec §8.6; D21',
  },
  'mediator-cases-id': {
    title: 'Mediator console',
    what: 'One case: the case file, the deadlines and your advice.',
    know: ['The mediator period is 30 days from activation; you may extend it with a reason.'],
    basis: 'Build Spec §8.3–§8.4',
  },
  admin: {
    title: 'Admin',
    what: 'Platform settings, Mediators, simulated balances, loan checks and system jobs.',
    know: ['The holdback of 10% is fixed and cannot be changed here.', 'The loan check is about completeness and formal conditions only, never about whether a loan is desirable.'],
    basis: 'Build Spec §12; D27',
  },
}

export const TOPIC_HELP: Record<string, HelpEntry> = {
  escrow: {
    title: 'Escrow',
    what: 'The contract amount is held aside and released step by step, only on both parties’ terms.',
    steps: ['The client deposits the full contract amount.', 'Money is released per approved phase, as supplier payments, or as an agreed advance.', 'At the end the escrow is empty.'],
    know: ['Nothing is released by silence or by a deadline alone.', 'In MVP1 the escrow is simulated: no real money.'],
    basis: 'Build Spec §2.1, §4.1–§4.2',
  },
  holdback: {
    title: 'Holdback and warranty',
    what: '10% of the contract value is held back after the final approval, as a motivation during the warranty period.',
    steps: ['The contractor chooses a warranty of 0, 15, 30 or 90 days. With 0 days nothing is held back.', 'After the final approval the holdback is paid out in tranches over that period.', 'During the warranty the client can object to a defect; unclaimed tranches can then be frozen.'],
    know: ['The final phase must be at least 10% of the contract value, so the holdback can always be withheld.', 'A delivery of materials only has no holdback.', 'The holdback is not insurance: repair costs above it are the contractor’s.'],
    basis: 'Build Spec §4.6, §7.2; D25, D27, D29',
  },
  fee: {
    title: 'Platform fee',
    what: 'GoodCompany charges 2% of the contract value, which goes to the Community Bank.',
    know: ['The fee is part of the contract amount: the client deposits nothing on top.', 'It is frozen when the escrow is funded and transferred at completion.', 'If a contract is cancelled before any payout, no fee is charged.'],
    basis: 'Build Spec §7.1',
  },
  budget: {
    title: 'Budget for this project',
    what: 'The client gives a minimum and maximum budget in the technical intake.',
    know: ['Only the contractor of this conversation sees it.', 'The job listing and search never show a price.', 'The intake cannot be completed without it.'],
    basis: 'D28 (revises Decision 10.3)',
  },
  candidates: {
    title: 'Candidates per job',
    what: 'How many contractors can negotiate about one job at the same time.',
    steps: ['Introduction: unlimited.', 'Technical intake and terms: at most 3 candidates at a time.', 'The client may swap a candidate in the intake or terms at most 2 times per job.', 'Quote: at most 3 quotes, no swapping once a candidate is in the quote stage.'],
    basis: 'D28',
  },
  estimate: {
    title: 'Itemised estimate',
    what: 'The contractor builds the price from lines, so the client sees how it is made up.',
    steps: ['Lines are grouped in sections, each with a quantity, unit and selling price.', 'Every line belongs to a payment phase; the phase amounts follow from the lines.', 'The 2% fee is added as a separate line, so lines plus fee equal the contract total.'],
    know: ['Materials bought from third parties form the materials budget. Materials the contractor supplies count in the final phase.', 'Purchase prices, suppliers and margin are never entered or shown.', 'The contractor chooses whether the client sees section totals or every line.'],
    basis: 'D28, D29; Build Spec §7.3',
  },
  materials: {
    title: 'Materials and supplier payments',
    what: 'Materials bought from third parties are paid from the materials budget, directly to the supplier.',
    steps: ['The contractor pays a verified supplier from the escrow and links the payment to the material lines.', 'Those lines become "ordered"; the contractor sets "delivered" when they arrive.', 'Unspent budget goes to the contractor with the final payout.'],
    know: ['The contractor confirms with every payment that the supplier is not a connected company.', 'The client sees the status of each line, never the amount paid or the supplier.'],
    basis: 'Build Spec §7.3; D12, D29',
  },
  dispute: {
    title: 'Objecting and disputes',
    what: 'When you disagree about a completion request, you object instead of approving.',
    steps: ['State the reason and the disputed amount; only that amount is frozen.', 'The rest of the contract continues as normal.', 'Settle together, or activate the Mediator.'],
    know: ['The client can object to a request; the contractor can open a dispute on their own open request.', 'On a final delivery: if the party whose turn it is stays silent for 14 days, or the request is still unpaid after 30 days, a case opens automatically and the Mediator is activated. No money moves by that.'],
    basis: 'Build Spec §4.3; D17, D27',
  },
  signing: {
    title: 'Signing with your password',
    what: 'Every signature asks for your password again, so nobody can sign on your behalf.',
    know: ['The confirmation is valid once, for 5 minutes.', 'You sign a fingerprint (SHA-256) of exactly what you see; if anything changes, you sign again.'],
    basis: 'Build Spec §2.3, §5.4',
  },
  'change-orders': {
    title: 'Change Orders',
    what: 'A change to the work or price while the contract runs, agreed by both.',
    steps: ['Either party proposes; the other accepts and signs, or rejects with a reason.', 'Extra work is deposited in the same step; reduced work goes back to the client at the end.'],
    know: ['Only unpaid, unrequested phases can change.', 'Not possible after the final completion request, nor during the warranty.', 'An unanswered Change Order expires; the original contract stays as it was.'],
    basis: 'Build Spec §4.4',
  },
  'loan-voting': {
    title: 'How a loan is decided',
    what: 'Members decide on loans, not GoodCompany.',
    steps: ['An administrator checks the application on completeness and formal conditions only.', 'A random sample of eligible members is invited to vote.', 'At least 60% in favour, and the reserves must allow it.'],
    know: ['Voters do not see the identity of the applicant or the supplier.', 'The money goes to the supplier through a sub-escrow.'],
    basis: 'Build Spec §7.4; OD5 (D27), OD6 (provisional)',
  },
}
