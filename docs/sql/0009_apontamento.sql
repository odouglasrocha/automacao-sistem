-- =====================================================================
-- 0009_apontamento.sql — Apontamento manual de produção por operador
-- Cada registro é lançado pelo operador da EA (somente máquinas em modo
-- Produção) e soma ao Progresso (UND) das Ordens de Produção.
-- Depende de 0004_operadores.sql e 0006_alocacao_sku.sql.
-- Rode este arquivo no SQL Editor do Supabase.
-- =====================================================================

create table if not exists public.ea_apontamento (
  id uuid primary key default gen_random_uuid(),
  data_plano date not null default current_date,
  maquina text not null,
  maquina_id uuid,
  cod_material_producao text,
  material_producao text,
  -- quantidade apontada manualmente pelo operador
  quantidade numeric not null check (quantidade > 0),
  -- 'und' (unidades) ou 'cx' (caixas/fardos, convertidas por materials.ts)
  unidade text not null default 'und' check (unidade in ('und', 'cx')),
  und numeric not null default 0,
  turno smallint,
  operador_matricula text not null,
  operador_nome text not null,
  observacao text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists ea_apontamento_data_idx on public.ea_apontamento (data_plano);
create index if not exists ea_apontamento_maquina_idx on public.ea_apontamento (data_plano, maquina);

grant select, insert, update, delete on public.ea_apontamento to authenticated;
grant select on public.ea_apontamento to anon;
grant all on public.ea_apontamento to service_role;

alter table public.ea_apontamento enable row level security;

drop policy if exists "apontamento leitura" on public.ea_apontamento;
create policy "apontamento leitura" on public.ea_apontamento for select using (true);

drop policy if exists "apontamento escrita" on public.ea_apontamento;
create policy "apontamento escrita" on public.ea_apontamento for all
  to authenticated using (true) with check (true);
