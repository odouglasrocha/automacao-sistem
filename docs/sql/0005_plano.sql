-- =====================================================================
-- 0005_plano.sql — Planejamento de produção (upload de planilha .xlsx)
-- Rode este arquivo no SQL Editor do Supabase.
-- =====================================================================

create table if not exists public.plano (
  id uuid primary key default gen_random_uuid(),
  cod_material_producao text not null,
  material_producao text not null,
  plano_caixas_fardos numeric not null default 0,
  tons numeric not null default 0,
  linha text,
  data_plano date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plano_data_idx on public.plano (data_plano);

grant select, insert, update, delete on public.plano to authenticated;
grant select on public.plano to anon;
grant all on public.plano to service_role;

alter table public.plano enable row level security;

drop policy if exists "plano leitura" on public.plano;
create policy "plano leitura" on public.plano for select using (true);

drop policy if exists "plano escrita" on public.plano;
create policy "plano escrita" on public.plano for all
  to authenticated using (true) with check (true);
