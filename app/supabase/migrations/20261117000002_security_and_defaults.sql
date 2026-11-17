-- GoodCompany MVP1 — permissions, row-level security, append-only records, configuration defaults

-- ---------------------------------------------------------------------------
-- Application role. The Nuxt server connects and switches to gc_app for every query.
-- It may read and write application tables, but never update or delete append-only records.
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'gc_app') then
    create role gc_app nologin bypassrls;
  end if;
end $$;
grant gc_app to postgres;
grant usage on schema public to gc_app;
grant select, insert, update, delete on all tables in schema public to gc_app;
grant usage, select on all sequences in schema public to gc_app;
grant execute on all functions in schema public to gc_app;

-- ---------------------------------------------------------------------------
-- Row-level security: every table has RLS on and no policy for anon/authenticated.
-- The anon key is public (the browser uses it for sign-in), so without this anyone could
-- read every table through PostgREST. All data access goes through the Nuxt server API,
-- which authorises each request (BUILD_NOTES: "Data access").
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke execute on function public.identity_level(uuid) from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Append-only: AuditLogEntry, LedgerEntry, attestations, ledger_transactions, votes.
-- Enforced twice: privileges (gc_app cannot UPDATE/DELETE/TRUNCATE) and a trigger that
-- also stops roles with broader privileges.
-- ---------------------------------------------------------------------------
create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op;
end $$;

do $$
declare t text;
begin
  foreach t in array array['audit_log_entries','ledger_entries','attestations','ledger_transactions','votes']
  loop
    execute format('revoke update, delete, truncate on public.%I from gc_app, anon, authenticated, service_role', t);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.forbid_mutation()', t || '_append_only', t);
    execute format('create trigger %I before truncate on public.%I for each statement execute function public.forbid_mutation()', t || '_no_truncate', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Configuration values (§12)
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('platform_fee_rate', '2', 'Platform fee, % of the contract amount'),
  ('fee_batch_interval_minutes', '60', 'Fee aggregation job interval'),
  ('fee_batch_min_count', '5', 'Minimum number of fees per batch'),
  ('organization_reserve_fraction', '1', 'Organisation reserve, % of the fee'),
  ('reserve_split', '{"safety":60,"credit":20,"legal":10,"innovation":10}', 'Community Bank reserve split (Illustrative Default)'),
  ('safety_reserve_threshold', '55', 'Safety reserve minimum, % of target'),
  ('completion_response_days', '14', 'Response window, final delivery only'),
  ('silence_days', '14', 'Silence trigger (b)'),
  ('payment_deadline_days', '30', 'Payment deadline trigger (c)'),
  ('mediator_period_days', '30', 'Mediator period from activation'),
  ('advice_notice_hours', '48', 'Notice before the advice'),
  ('warranty_period_options', '[0,15,30,90]', 'Allowed warranty periods'),
  ('warranty_period_default', '30', 'Default warranty period'),
  ('holdback_percentage', '10', 'Fixed holdback (P9, D25)'),
  ('change_order_expiry_max_days', '90', 'Change Order expiry cap'),
  ('workspace_inactivity_timeout_days', '21', 'Workspace inactivity expiry'),
  ('workspace_inactivity_notice_days', '3', 'Notice before inactivity expiry'),
  ('action_signature_ttl_hours', '72', 'Prepared escrow action lifetime'),
  ('rookie_reviews_required', '10', 'Completed contracts before a score is public'),
  ('mandatory_motivation_threshold', '3', 'Review motivation required at or below this rating'),
  ('review_motivation_min_length', '100', 'Minimum motivation length'),
  ('reliability_factor_floor', '0.5', 'Reliability factor floor'),
  ('reliability_factor_window', '20', 'Reliability factor window (contracts)'),
  ('required_votes_tiers', '[50,100,250,500]', 'Required votes by amount tier'),
  ('audience_multiplier', '3', 'Vote invitations per required vote'),
  ('community_loan_approval_threshold', '60', 'Majority needed, %'),
  ('community_vote_duration_days', '14', 'Voting window'),
  ('loan_interest_rate', '{"base":4,"step":0.25,"step_months":6,"after_months":12,"cap":3}', 'Loan interest derivation'),
  ('multi_candidate_threshold', '{"amount":500000,"candidates":5}', 'Multi-candidate fairness standard (minor units)'),
  ('mvp1_contract_currency', '"EUR"', 'Contract currency'),
  ('step_up_validity_minutes', '5', 'How long a step-up authentication stays usable (single use)'),
  ('default_mediator_id', 'null', 'Mediator assigned by the admin to new terms versions')
on conflict (key) do nothing;

insert into public.categories (key, name) values
  ('carpentry', 'Carpentry'),
  ('plumbing', 'Plumbing'),
  ('electrical', 'Electrical'),
  ('painting', 'Painting'),
  ('roofing', 'Roofing'),
  ('renovation', 'Renovation'),
  ('gardening', 'Gardening'),
  ('it_services', 'IT services'),
  ('design', 'Design'),
  ('other', 'Other')
on conflict (key) do nothing;

insert into public.reserves (type, target_percentage, min_threshold_percentage) values
  ('safety', 60, 55),
  ('credit', 20, null),
  ('legal', 10, null),
  ('innovation', 10, null),
  ('organization', 0, null)
on conflict (type) do nothing;
