-- Session 3: evaluation, invoices, Community Bank details, system job runs

-- Community Bank: simulated seed money for reserves (admin, demonstration only)
alter table public.ledger_transactions drop constraint ledger_transactions_source_type_check;
alter table public.ledger_transactions add constraint ledger_transactions_source_type_check
  check (source_type in ('platform_fee','loan_repayment','interest','exit_proceeds','loan_disbursement','default_writeoff','simulated_seed'));

alter table public.loan_applications
  add column principal_outstanding bigint not null default 0,
  add column interest_paid bigint not null default 0,
  add column activated_at timestamptz,
  add column last_interest_at timestamptz,
  add column resolved_at timestamptz;

alter table public.sub_escrows add column released_at timestamptz;

-- Invoices: a sequence for a human-readable stable reference (OD8: see BUILD_NOTES)
create sequence public.invoice_number_seq;

-- System job runs (§10): log of every run, for the admin overview and idempotence checks
create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb,
  error text
);
create index on public.job_runs (job, started_at desc);

alter table public.job_runs enable row level security;
alter table public.job_runs force row level security;
revoke all on public.job_runs from anon, authenticated;
grant select, insert, update, delete on public.job_runs to gc_app;
grant usage, select on all sequences in schema public to gc_app;

-- Settings added in session 3
insert into public.app_settings (key, value, description) values
  ('mediator_due_notice_days', '3', 'Days before the mediator due date when Mediator and parties are reminded'),
  ('loan_purpose_categories', '["equipment","inventory","transport","software"]', 'Allowed loan purposes (never living expenses)')
on conflict (key) do nothing;
