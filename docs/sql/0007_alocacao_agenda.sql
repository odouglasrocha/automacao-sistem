-- =====================================================================
-- 0007_alocacao_agenda.sql — Agenda de produção por EA
-- Permite mais de um planejamento na mesma EA quando o tempo estimado
-- de produção cabe nas 24h do dia (3 turnos).
-- Rode este arquivo no SQL Editor do Supabase.
-- =====================================================================

alter table public.ea_alocacao_sku
  add column if not exists ordem integer not null default 1,
  add column if not exists horas_estimadas numeric not null default 0;

create index if not exists ea_alocacao_sku_ordem_idx
  on public.ea_alocacao_sku (data_plano, ordem);
