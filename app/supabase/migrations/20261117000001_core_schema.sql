-- GoodCompany MVP1 — core data model (Build Spec v3.007 §3)
-- Monetary amounts are integers in minor units of the contract currency.
-- Enumerations are text columns with CHECK constraints so later sessions can extend them with a migration.

create extension if not exists pgcrypto;

-- Shared updated_at trigger -------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Configuration (§12)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3.1 Identity and profile
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  phone text,
  identity_level text check (identity_level in ('email_verified')),
  did text check (did is null), -- reserved for AVI; always null in MVP1 (P5, D22)
  role text not null default 'client' check (role in ('client','contractor','both','mediator','admin')),
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  account_type text not null default 'individual' check (account_type in ('individual','company')),
  display_name text not null,
  description text not null default '',
  expertise_tags text[] not null default '{}',
  region text not null default '',
  stats_completed_jobs int not null default 0,
  stats_satisfaction_rate numeric,
  stats_avg_response_time int,
  reputation_score_as_contractor numeric,
  reputation_score_as_client numeric, -- stored only; formula deferred (O25)
  completed_as_contractor int not null default 0,
  completed_as_client int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  media_urls text[] not null default '{}',
  linked_contract_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- identity_level(user): the single identity interface (§7.6)
create or replace function public.identity_level(uid uuid) returns text
language sql stable security definer set search_path = public, auth as $$
  select case when u.email_confirmed_at is not null then 'email_verified' end
  from auth.users u where u.id = uid
$$;

-- Mirror new auth users into public.users + profiles. Self-selected roles are limited to
-- client/contractor/both; mediator and admin are assigned by an admin only (P15).
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role', 'client');
begin
  if requested not in ('client','contractor','both') then
    requested := 'client';
  end if;
  insert into public.users (id, email, role, identity_level)
  values (new.id, lower(new.email), requested,
          case when new.email_confirmed_at is not null then 'email_verified' end);
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_updated() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  update public.users
     set identity_level = case when new.email_confirmed_at is not null then 'email_verified' end,
         email = lower(new.email)
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated after update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_auth_user_updated();

-- ---------------------------------------------------------------------------
-- 3.2 Contacts
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  linked_user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  company_name text,
  phone text,
  email text,
  status text not null default 'unlinked' check (status in ('unlinked','linked')),
  notes text,
  collaboration_preference text not null default 'none' check (collaboration_preference in ('none','prefer','avoid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.contact_group_memberships (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  group_id uuid not null references public.contact_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, group_id)
);

-- ---------------------------------------------------------------------------
-- 3.3 Jobs
-- ---------------------------------------------------------------------------
create table public.categories (
  key text primary key,
  name text not null
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id),
  title text not null,
  description text not null default '',
  category text not null references public.categories(key),
  region text not null default '',
  urgency text not null default 'medium' check (urgency in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','closed','dormant')),
  indicative_budget bigint check (indicative_budget is null or indicative_budget >= 0), -- never returned to a contractor
  selected_contractor_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3.4 Negotiation Workspace
-- ---------------------------------------------------------------------------
create table public.negotiation_workspaces (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  client_id uuid not null references public.users(id),
  contractor_id uuid not null references public.users(id),
  stage text not null default 'introduction'
    check (stage in ('introduction','technical_intake','terms','quote','contract_preview','closed')),
  outcome text not null default 'pending'
    check (outcome in ('pending','accepted','rejected','withdrawn','expired','closed_other_selected')),
  mediator_id uuid references public.users(id), -- assigned by an admin (P15)
  reached_beyond_introduction boolean not null default false, -- counts as a candidate for the multi-candidate rule (§7.9)
  last_activity_at timestamptz not null default now(),
  inactivity_notice_sent_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, contractor_id)
);

create table public.job_responses (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  contractor_id uuid not null references public.users(id),
  negotiation_workspace_id uuid not null references public.negotiation_workspaces(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, contractor_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.negotiation_workspaces(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technical_intake_answers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.negotiation_workspaces(id) on delete cascade,
  question_key text not null,
  question_text text not null,
  required boolean not null default false,
  answer text,
  asked_by uuid references public.users(id),
  answered_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, question_key)
);

create table public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.negotiation_workspaces(id),
  version_number int not null,
  working_hours text not null default '',
  communication_channel text not null default '',
  ownership_terms text not null default '',
  cancellation_terms text not null default '',
  warranty_period_days int not null default 30 check (warranty_period_days in (0,15,30,90)),
  holdback_percentage int not null default 10 check (holdback_percentage = 10),
  payment_phases jsonb not null, -- [{sequence, kind, percentage, description, evidence_required}]
  materials_budget_percentage numeric(5,2) check (materials_budget_percentage is null or (materials_budget_percentage >= 0 and materials_budget_percentage < 100)),
  fee_percentage numeric(5,2) not null, -- copied from platform_fee_rate when proposed, so the 100% sum is checkable
  execution_period_days int not null check (execution_period_days > 0),
  mediator_id uuid not null references public.users(id),
  mandatory_clauses jsonb not null,
  proposed_by uuid not null references public.users(id),
  status text not null default 'proposed' check (status in ('proposed','accepted','superseded','rejected')),
  accepted_by uuid references public.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, version_number)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.negotiation_workspaces(id),
  terms_version_id uuid not null references public.terms_versions(id),
  total_amount bigint not null check (total_amount > 0),
  currency text not null,
  materials_amount bigint check (materials_amount is null or materials_amount >= 0), -- informational figure (P20)
  phase_amounts jsonb not null, -- [{sequence, amount}]
  materials_budget_amount bigint not null default 0,
  fee_amount bigint not null,
  notes text not null default '',
  created_by uuid not null references public.users(id),
  status text not null default 'submitted' check (status in ('draft','submitted','accepted','rejected','withdrawn')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accepted terms versions and quotes are immutable (§10)
create or replace function public.forbid_change_when_accepted() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception '% rows cannot be deleted', tg_table_name;
  end if;
  if old.status = 'accepted' then
    raise exception 'accepted % rows are immutable', tg_table_name;
  end if;
  return new;
end $$;

create trigger terms_versions_immutable before update or delete on public.terms_versions
  for each row execute function public.forbid_change_when_accepted();
create trigger quotes_immutable before update or delete on public.quotes
  for each row execute function public.forbid_change_when_accepted();

-- ---------------------------------------------------------------------------
-- Signatures (§2.3): server-recorded attestations, created only after step-up auth
-- ---------------------------------------------------------------------------
create table public.step_up_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.attestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  subject_type text not null check (subject_type in ('contract_signature','escrow_action')),
  subject_id uuid not null,
  payload_hash text not null,
  step_up_grant_id uuid not null references public.step_up_grants(id),
  created_at timestamptz not null default now(),
  unique (user_id, subject_type, subject_id, payload_hash)
);

-- ---------------------------------------------------------------------------
-- 3.5 Contract, escrow and execution
-- ---------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid unique references public.negotiation_workspaces(id),
  job_id uuid not null references public.jobs(id),
  client_id uuid not null references public.users(id),
  contractor_id uuid not null references public.users(id),
  parent_contract_id uuid references public.contracts(id),
  terms_version_id uuid not null references public.terms_versions(id),
  quote_id uuid not null references public.quotes(id),
  snapshot jsonb not null,
  snapshot_hash text not null,
  mediator_id uuid not null references public.users(id),
  currency text not null,
  status text not null default 'awaiting_funding'
    check (status in ('awaiting_funding','active','completed','closed','ended_unfinished')),
  signed_at timestamptz not null default now(),
  activated_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  sequence int not null,
  kind text not null check (kind in ('advance','work','final')),
  description text not null,
  amount bigint not null check (amount >= 0),
  evidence_required text not null default '',
  status text not null default 'pending' check (status in ('pending','requested','disputed','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, sequence)
);

-- EscrowAccount: the contract data held by the (simulated) ledger. Written only by SimulatedLedger.
create table public.escrow_accounts (
  contract_id uuid primary key references public.contracts(id),
  currency text not null,
  principal_total bigint not null default 0,
  client_surplus bigint not null default 0,
  fee_rate numeric(6,4) not null,
  fee_reserved bigint not null default 0,
  fee_final bigint not null default 0,
  materials_budget bigint not null default 0,
  paid_to_suppliers bigint not null default 0,
  paid_to_contractor bigint not null default 0,
  refunded_to_client bigint not null default 0,
  fee_transferred bigint not null default 0,
  holdback_amount bigint not null default 0,
  warranty_start_date date,
  holdback_tranches jsonb not null default '[]',
  disputed_amount bigint not null default 0,
  mediator_id uuid references public.users(id),
  mediator_active boolean not null default false,
  snapshot_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prepared escrow actions (§5.4)
create table public.escrow_actions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  action_type text not null check (action_type in ('fund','claim_advance','pay_supplier','request_completion','approve',
    'claim_holdback_tranche','change_order','mutual_settlement','replace_mediator','object','escalate','settle',
    'activate_mediator','repair_agreement')),
  params jsonb not null default '{}',
  action_hash text not null,
  summary text not null,
  required_signers uuid[] not null,
  status text not null default 'awaiting_signatures'
    check (status in ('awaiting_signatures','submitted','applied','rejected','expired')),
  rejection_reason text,
  expires_at timestamptz not null,
  applied_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.completion_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  milestone_id uuid not null references public.milestones(id),
  evidence_text text not null default '',
  evidence_files jsonb not null default '[]',
  evidence_hash text not null,
  is_final boolean not null default false,
  requested_at timestamptz not null default now(),
  response_due_at timestamptz,
  payment_deadline_at timestamptz,
  awaiting_party text not null default 'client' check (awaiting_party in ('client','contractor')),
  last_party_action_at timestamptz not null default now(),
  repair_agreement_id uuid,
  status text not null default 'open' check (status in ('open','approved','objected','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index completion_requests_one_open on public.completion_requests (milestone_id) where status = 'open';

create table public.completion_request_messages (
  id uuid primary key default gen_random_uuid(),
  completion_request_id uuid not null references public.completion_requests(id),
  sender_id uuid not null references public.users(id),
  kind text not null check (kind in ('information_request','information_response')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials_status_updates (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  status text not null check (status in ('materials_ordered')),
  note text not null default '',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  requested_by uuid not null references public.users(id),
  description text not null,
  motivation text not null check (length(trim(motivation)) > 0),
  amount_delta bigint not null default 0,
  milestone_changes jsonb not null default '[]',
  response_note text,
  expires_at timestamptz not null,
  escrow_action_id uuid references public.escrow_actions(id),
  status text not null default 'proposed' check (status in ('proposed','effective','rejected','expired','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'rejected' or (response_note is not null and length(trim(response_note)) > 0))
);

create table public.change_order_messages (
  id uuid primary key default gen_random_uuid(),
  change_order_id uuid not null references public.change_orders(id),
  sender_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispute_cases (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  completion_request_id uuid references public.completion_requests(id),
  opened_by text not null check (opened_by in ('client','contractor','system')),
  trigger text not null check (trigger in ('objection','silence','payment_deadline')),
  reason text,
  reason_hash text,
  disputed_amount bigint not null default 0 check (disputed_amount >= 0),
  status text not null default 'between_parties'
    check (status in ('between_parties','mediator_active','advice_issued','settled','withdrawn')),
  mediator_activated_at timestamptz,
  mediator_due_at timestamptz,
  extensions jsonb not null default '[]',
  silence_investigation text,
  proposal text,
  advice_notice_at timestamptz,
  advice jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trigger <> 'objection' or (reason is not null and length(trim(reason)) > 0))
);

create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_case_id uuid not null references public.dispute_cases(id),
  sender_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.repair_agreements (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  dispute_case_id uuid not null references public.dispute_cases(id),
  description text not null,
  held_amount bigint not null check (held_amount >= 0),
  signed_by_client_at timestamptz,
  signed_by_contractor_at timestamptz,
  status text not null default 'proposed' check (status in ('proposed','effective','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  supplier_id uuid not null references public.users(id),
  amount bigint not null check (amount > 0),
  signed_by uuid not null references public.users(id),
  signed_at timestamptz not null,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','delivered','disputed')),
  escrow_action_id uuid references public.escrow_actions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.final_evaluations (
  contract_id uuid primary key references public.contracts(id),
  contractor_signed_at timestamptz,
  client_signed_at timestamptz,
  discrepancy_notes jsonb not null default '[]',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  reviewer_id uuid not null references public.users(id),
  reviewee_id uuid not null references public.users(id),
  reviewee_role text not null check (reviewee_role in ('client','contractor')),
  rating int not null check (rating between 1 and 5),
  motivation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, reviewer_id),
  check (rating > 3 or (motivation is not null and length(trim(motivation)) > 0))
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  contract_id uuid references public.contracts(id),
  related_sub_escrow_id uuid,
  direction text not null check (direction in ('issued','received')),
  kind text not null default 'invoice' check (kind in ('invoice','fee_statement')),
  amount bigint not null,
  currency text not null,
  status text not null default 'finalized' check (status in ('draft','finalized')),
  external_reference_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Append-only records: AuditLogEntry and LedgerEntry (§3.5, §10)
-- ---------------------------------------------------------------------------
create table public.audit_log_entries (
  id bigint generated always as identity primary key,
  contract_id uuid references public.contracts(id),
  workspace_id uuid references public.negotiation_workspaces(id),
  event_type text not null,
  actor_id uuid references public.users(id),
  payload jsonb not null default '{}',
  "timestamp" timestamptz not null default now()
);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  account text not null, -- e.g. escrow:<contract_id>, user:<id>, fee_collection, community_bank
  contract_id uuid references public.contracts(id),
  action_id uuid references public.escrow_actions(id),
  action_type text not null,
  signers uuid[] not null default '{}',
  amounts jsonb not null default '{}',
  resulting_balances jsonb not null default '{}',
  "timestamp" timestamptz not null default now()
);

-- Simulated balances (§2.2): demonstration money, created by an admin or seed function
create table public.simulated_balances (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3.6 Community Bank
-- ---------------------------------------------------------------------------
create table public.fee_batches (
  id uuid primary key default gen_random_uuid(),
  executed_at timestamptz not null default now(),
  fee_count int not null,
  total_amount bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FeeCollectionAccount: the collect-wallet. Balance = sum of pending items.
create table public.fee_collection_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id),
  amount bigint not null check (amount > 0),
  fee_batch_id uuid references public.fee_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reserves (
  type text primary key check (type in ('safety','credit','legal','innovation','organization')),
  balance bigint not null default 0,
  target_percentage numeric(5,2) not null default 0,
  min_threshold_percentage numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.users(id),
  purpose_category text not null check (purpose_category in ('equipment','inventory','transport','software')),
  purpose text not null,
  amount_requested bigint not null check (amount_requested > 0),
  repayment_term_months int not null check (repayment_term_months > 0),
  interest_rate numeric(6,4) not null,
  projected_income bigint,
  supplier_id uuid not null references public.users(id),
  required_votes int not null,
  audience_size int not null,
  voting_ends_at timestamptz,
  amount_repaid bigint not null default 0,
  status text not null default 'submitted'
    check (status in ('submitted','community_voting','approved','rejected','active','repaid','defaulted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('platform_fee','loan_repayment','interest','exit_proceeds','loan_disbursement','default_writeoff')),
  amount bigint not null,
  reserve_type text not null references public.reserves(type),
  related_contract_id uuid references public.contracts(id), -- never set for platform_fee (D10)
  related_loan_id uuid references public.loan_applications(id),
  fee_batch_id uuid references public.fee_batches(id),
  "timestamp" timestamptz not null default now(),
  check (source_type <> 'platform_fee' or related_contract_id is null)
);

create table public.vote_invitations (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id),
  voter_id uuid not null references public.users(id),
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  status text not null default 'pending' check (status in ('pending','responded','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_application_id, voter_id)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications(id),
  voter_id uuid not null references public.users(id),
  choice text not null check (choice in ('for','against')),
  created_at timestamptz not null default now(),
  unique (application_id, voter_id)
);

create table public.sub_escrows (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id),
  community_bank_reserve_type text not null references public.reserves(type),
  supplier_id uuid not null references public.users(id),
  amount bigint not null,
  status text not null default 'pending' check (status in ('pending','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_health_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  liquidity_utilization_ratio numeric,
  default_rate numeric,
  cash_flow bigint,
  reserve_level numeric,
  computed_score numeric,
  computed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notifications (§10, §11)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  dedupe_key text, -- lets idempotent system jobs avoid sending the same notice twice
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index on public.jobs (status, category);
create index on public.jobs (client_id);
create index on public.negotiation_workspaces (job_id);
create index on public.negotiation_workspaces (client_id);
create index on public.negotiation_workspaces (contractor_id);
create index on public.messages (workspace_id, created_at);
create index on public.terms_versions (workspace_id);
create index on public.quotes (workspace_id);
create index on public.contracts (client_id);
create index on public.contracts (contractor_id);
create index on public.audit_log_entries (contract_id);
create index on public.audit_log_entries (workspace_id);
create index on public.ledger_entries (contract_id);
create index on public.notifications (user_id, created_at desc);
create index on public.contacts (owner_id);

-- updated_at triggers
do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
