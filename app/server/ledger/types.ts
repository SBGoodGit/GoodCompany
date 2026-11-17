// Escrow Ledger types (Build Spec v3 §2.1, §3.5). Amounts are integers in minor units.

export type ContractStatus = 'awaiting_funding' | 'active' | 'completed' | 'closed' | 'ended_unfinished'
export type TrancheStatus = 'pending' | 'claimed' | 'frozen' | 'reassigned'

export interface Tranche {
  sequence: number
  claimable_from: string // ISO date-time
  amount: number
  status: TrancheStatus
  dispute_id?: string | null
}

export interface Account {
  contract_id: string
  currency: string
  principal_total: number
  client_surplus: number
  client_surplus_settled: number
  fee_rate: number // percent, e.g. 2
  fee_reserved: number
  fee_final: number // unused (§3.5)
  fee_transferred: number
  fee_kept: number
  materials_budget: number
  paid_to_suppliers: number
  materials_released: number
  paid_to_contractor: number
  refunded_to_client: number
  holdback_amount: number
  warranty_start_date: string | null
  holdback_tranches: Tranche[]
  disputed_amount: number
  repair_held: number
  mediator_id: string
  mediator_active: boolean
  snapshot_hash: string
}

export interface Milestone {
  id: string
  sequence: number
  kind: 'advance' | 'work' | 'final'
  description: string
  amount: number
  evidence_required: string
  status: 'pending' | 'requested' | 'disputed' | 'paid'
}

export interface CompletionRequest {
  id: string
  milestone_id: string
  is_final: boolean
  repair_agreement_id: string | null
  evidence_text: string
  evidence_hash: string
  requested_amount: number
  requested_at: string
  response_due_at: string | null
  payment_deadline_at: string | null
  awaiting_party: 'client' | 'contractor'
  last_party_action_at: string
  status: 'open' | 'approved' | 'objected' | 'superseded'
}

export interface Dispute {
  id: string
  completion_request_id: string | null
  opened_by: 'client' | 'contractor' | 'system'
  trigger: 'objection' | 'silence' | 'payment_deadline'
  scope: 'request' | 'request_partial' | 'warranty'
  reason: string | null
  reason_hash: string | null
  disputed_amount: number
  status: 'between_parties' | 'mediator_active' | 'advice_issued' | 'settled' | 'withdrawn'
  mediator_activated_at: string | null
  mediator_due_at: string | null
}

export interface RepairAgreement {
  id: string
  dispute_case_id: string
  description: string
  held_amount: number
  status: 'proposed' | 'effective' | 'completed'
  signed_by_client_at: string | null
  signed_by_contractor_at: string | null
}

export interface ChangeOrder {
  id: string
  requested_by: string
  amount_delta: number
  milestone_changes: { milestone_id: string; amount: number; description?: string; evidence_required?: string }[]
  new_materials_budget?: number | null
  expires_at: string
  status: 'proposed' | 'effective' | 'rejected' | 'expired' | 'withdrawn'
}

export interface SupplierPayment {
  id: string
  supplier_id: string
  amount: number
  signed_by: string
  signed_at: string
}

export interface PartyInfo {
  id: string
  role: string
  status: string
  verified: boolean
}

/** Everything the ledger holds or reads for one contract. */
export interface LedgerState {
  contract: {
    id: string
    status: ContractStatus
    client_id: string
    contractor_id: string
    mediator_id: string
    currency: string
    snapshot_hash: string
    warranty_period_days: number
    holdback_percentage: number
    total_amount: number
    fee_amount: number
    materials_budget_amount: number
  }
  account: Account | null
  milestones: Milestone[]
  requests: CompletionRequest[]
  disputes: Dispute[]
  repairs: RepairAgreement[]
  changeOrders: ChangeOrder[]
  supplierPayments: SupplierPayment[]
  users: Record<string, PartyInfo>
  balances: Record<string, number> // simulated balances of the users involved
  feeCollection: { contract_id: string; amount: number }[] // new collect-wallet items produced by this action
  completedAt?: string | null
  closedAt?: string | null
  activatedAt?: string | null
}

export type ActionType =
  | 'fund' | 'claim_advance' | 'pay_supplier' | 'request_completion' | 'approve' | 'claim_holdback_tranche'
  | 'change_order' | 'mutual_settlement' | 'replace_mediator' | 'object' | 'escalate' | 'settle'
  | 'activate_mediator' | 'repair_agreement'

/** System operations: opened by system jobs on triggers (b)/(c). They move no money (L4). */
export type SystemActionType = 'system_open_dispute' | 'system_activate_mediator'

export interface Action {
  type: ActionType | SystemActionType
  params: Record<string, any>
  /** The party preparing the action (for single-signer actions: the signer). */
  actor: string | null
}

export interface LedgerEntryDraft {
  account: string
  action_type: string
  amounts: Record<string, number>
}

export interface LedgerConfig {
  completion_response_days: number
  payment_deadline_days: number
  mediator_period_days: number
  platform_fee_rate: number
}

export interface ApplyContext {
  now: Date
  config: LedgerConfig
  newId: () => string
  hash: (s: string) => string
}

export interface ApplyResult {
  state: LedgerState
  entries: LedgerEntryDraft[]
  summary: string
  /** Notices for parties. `hideAmount` lines are shown to the client without amounts (P23). */
  notices: { user_id: string; title: string; body?: string }[]
}

/**
 * The Escrow Ledger boundary (§2.1). MVP1 ships SimulatedLedger; a Midnight or Cardano
 * implementation replaces it without changing the GoodTrade service.
 */
export interface EscrowLedger {
  /** Validate an action and describe its effect, without changing anything. */
  preview(contractId: string, action: Action): Promise<{ summary: string; requiredSigners: string[] }>
  /** Apply a fully signed action, completely or not at all. */
  submit(contractId: string, action: Action, signers: string[], actionId: string | null): Promise<ApplyResult>
}

export class LedgerRejection extends Error {}
