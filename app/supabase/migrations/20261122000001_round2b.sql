-- Round 2b (Decision Log D29): order status per line of "materials bought from third parties".
-- Replaces the contract-wide materials_ordered status (materials_status_updates is kept as history,
-- no longer written). The selling-price amount is for the contractor only; the client sees description
-- and status, never an amount paid or the route (O20).
create table public.contract_material_lines (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  position int not null,
  description text not null,
  quantity numeric(14,3) not null,
  unit text not null,
  amount bigint not null,
  status text not null default 'not_ordered' check (status in ('not_ordered','ordered','delivered')),
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (contract_id, position)
);
alter table public.contract_material_lines enable row level security;
alter table public.contract_material_lines force row level security;
grant select, insert, update on public.contract_material_lines to gc_app;
