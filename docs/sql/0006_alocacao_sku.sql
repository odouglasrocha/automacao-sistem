-- =====================================================================
-- 0006_alocacao_sku.sql — Alocação de SKU × quantidade de máquinas EA
-- Relaciona o planejamento (tabela plano) com o Chão de Fábrica:
-- cada SKU recebe N máquinas EA e a produção real dessas EAs alimenta
-- o Progresso (UND) das Ordens de Produção.
-- Rode este arquivo no SQL Editor do Supabase.
-- =====================================================================

create table if not exists public.ea_alocacao_sku (
  id uuid primary key default gen_random_uuid(),
  data_plano date not null default current_date,
  cod_material_producao text not null,
  material_producao text not null,
  qtd_ea integer not null default 1 check (qtd_ea >= 0),
  maquinas text[] not null default '{}',
  observacao text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_plano, cod_material_producao)
);

create index if not exists ea_alocacao_sku_data_idx on public.ea_alocacao_sku (data_plano);

grant select, insert, update, delete on public.ea_alocacao_sku to authenticated;
grant select on public.ea_alocacao_sku to anon;
grant all on public.ea_alocacao_sku to service_role;

alter table public.ea_alocacao_sku enable row level security;

drop policy if exists "alocacao leitura" on public.ea_alocacao_sku;
create policy "alocacao leitura" on public.ea_alocacao_sku for select using (true);

drop policy if exists "alocacao escrita" on public.ea_alocacao_sku;
create policy "alocacao escrita" on public.ea_alocacao_sku for all
  to authenticated using (true) with check (true);
