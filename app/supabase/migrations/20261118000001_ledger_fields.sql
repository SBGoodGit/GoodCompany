-- Session 2: fields the SimulatedLedger needs (Build Spec v3 §3.5, §4, §8)

alter table public.escrow_accounts
  add column materials_released bigint not null default 0,   -- unspent materials budget paid to the contractor at the final payout (P21)
  add column client_surplus_settled bigint not null default 0, -- client surplus already returned to the client
  add column repair_held bigint not null default 0,          -- amounts held under effective repair agreements (§4.5)
  add column fee_kept bigint not null default 0;             -- fee actually moved to the collect-wallet

alter table public.change_orders
  add column new_materials_budget bigint check (new_materials_budget is null or new_materials_budget >= 0); -- the budget changes only through a Change Order

alter table public.completion_requests
  add column requested_amount bigint not null default 0;     -- what an approval would release, computed by the ledger

alter table public.dispute_cases
  add column scope text not null default 'request'
    check (scope in ('request','request_partial','warranty')),
  add column last_party_activity_at timestamptz not null default now();

-- Nested contracts (§4.5): a new workspace on the same job, linked to the parent contract.
alter table public.negotiation_workspaces
  add column parent_contract_id uuid references public.contracts(id);
alter table public.negotiation_workspaces drop constraint negotiation_workspaces_job_id_contractor_id_key;
create unique index negotiation_workspaces_one_per_candidate
  on public.negotiation_workspaces (job_id, contractor_id) where parent_contract_id is null;

alter table public.attestations drop constraint attestations_subject_type_check;
alter table public.attestations add constraint attestations_subject_type_check
  check (subject_type in ('contract_signature','escrow_action'));

create index on public.escrow_actions (contract_id, status);
create index on public.dispute_cases (contract_id);
create index on public.completion_requests (contract_id);

grant select, insert, update, delete on all tables in schema public to gc_app;
revoke update, delete, truncate on public.ledger_entries, public.audit_log_entries, public.attestations from gc_app;
