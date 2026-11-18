-- Round 2 (Decision Log D28): the contractor owns the plan, two-way intake with a budget question,
-- itemised estimate, candidate limits and client tools.

-- Workspace: client constraints (A2), budget answer (B2), private client note (F3),
-- and what the candidate limits need (E): who closed a workspace from which stage, and whether
-- it ever reached the quote stage (no swapping after that).
alter table public.negotiation_workspaces
  add column constraint_start date,
  add column constraint_end date,
  add column constraint_days text not null default '',
  add column constraint_access text not null default '',
  add column budget_min bigint check (budget_min is null or budget_min > 0),
  add column budget_max bigint check (budget_max is null or budget_max > 0),
  add column client_note text not null default '',
  add column moved_to_intake_at timestamptz,
  add column reached_quote_at timestamptz,
  add column closed_by uuid references public.users(id),
  add column closed_from_stage text,
  add constraint workspace_budget_order check (budget_min is null or budget_max is null or budget_min <= budget_max),
  add constraint workspace_constraint_dates check (constraint_start is null or constraint_end is null or constraint_start <= constraint_end);

-- Terms: the client accepts, rejects, or asks for a revision with a mandatory comment (A1).
alter table public.terms_versions drop constraint terms_versions_status_check;
alter table public.terms_versions add constraint terms_versions_status_check
  check (status in ('proposed','accepted','superseded','rejected','revision_requested'));
alter table public.terms_versions add column client_comment text;

-- Quote: scope of work, itemised estimate and the detail level the client sees (C).
alter table public.quotes
  add column scope_of_work text not null default '',
  add column detail_level text not null default 'sections' check (detail_level in ('sections','lines')),
  add column estimate jsonb; -- {sections:[{key,title}], lines:[{section,description,kind,quantity,unit,unit_price,amount,phase,note}]}

-- Candidate limits replace the multi-candidate fairness warning (E).
delete from public.app_settings where key = 'multi_candidate_threshold';
insert into public.app_settings (key, value, description) values
  ('max_candidates_in_negotiation', '3', 'Candidates per job past the introduction at a time (technical intake, terms, quote)'),
  ('max_candidate_swaps', '2', 'Times per job the client may close a candidate in the technical intake or terms and move another in')
on conflict (key) do nothing;
