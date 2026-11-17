-- Corrections after the MVP1 build (Decision Log D27)

-- OD5: a loan application gets an administrative check before it goes to a vote.
-- admin_check = waiting for the check; returned = the admin returned it (with a reason), no vote.
alter table public.loan_applications drop constraint loan_applications_status_check;
alter table public.loan_applications add constraint loan_applications_status_check
  check (status in ('submitted','admin_check','returned','community_voting','approved','rejected','active','repaid','defaulted'));
alter table public.loan_applications
  add column admin_checked_by uuid references public.users(id),
  add column admin_checked_at timestamptz,
  add column admin_check_note text;
