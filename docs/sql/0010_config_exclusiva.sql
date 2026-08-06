-- =============================================================
-- 0010_config_exclusiva.sql — Centro de Configuração Industrial
-- Tudo escopado por empresa_id + maquina_id. Nada global.
-- Idempotente: pode ser executado várias vezes.
-- =============================================================

-- 1) Frota EA34..EA58 (exceto EA43) --------------------------------
insert into public.ea_maquinas (nome, linha, descricao, ativo)
select 'EA' || n, 'L-04 Envase', 'Máquina de envase EA' || n, true
from generate_series(34, 58) as n
where n <> 43
  and not exists (select 1 from public.ea_maquinas m where m.nome = 'EA' || n);

-- 2) Configuração genérica por categoria (jsonb) -------------------
-- Uma linha por (máquina, categoria). Permite adicionar novas
-- categorias/campos no futuro sem migration estrutural.
create table if not exists public.ea_config (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  categoria text not null,
  dados jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (maquina_id, categoria)
);
create index if not exists ea_config_maquina_idx on public.ea_config (maquina_id);
create index if not exists ea_config_categoria_idx on public.ea_config (categoria);

-- 3) Equipamentos industriais (hardware genérico) ------------------
create table if not exists public.ea_equipamentos (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  tipo text not null,                -- CLP, Inversor, IHM, Sensor, Encoder…
  nome text not null,
  fabricante text,
  modelo text,
  familia text,
  firmware text,
  versao text,
  numero_serie text,
  descricao text,
  status text default 'offline',
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists ea_equipamentos_maquina_idx on public.ea_equipamentos (maquina_id, tipo);

-- 4) Auditoria das configurações -----------------------------------
create table if not exists public.ea_auditoria (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  categoria text not null,
  acao text not null default 'update',
  dados jsonb,
  operador text,
  ts timestamptz not null default now()
);
create index if not exists ea_auditoria_maquina_idx on public.ea_auditoria (maquina_id, ts desc);

-- 5) Favoritos do Centro de Configuração ---------------------------
create table if not exists public.ea_config_favoritos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  categoria text not null,
  unique (user_id, categoria)
);

-- 6) Grants (Data API) ---------------------------------------------
grant select, insert, update, delete on public.ea_config to authenticated;
grant select, insert, update, delete on public.ea_equipamentos to authenticated;
grant select, insert on public.ea_auditoria to authenticated;
grant select, insert, update, delete on public.ea_config_favoritos to authenticated;
grant select on public.ea_config to anon;
grant select on public.ea_equipamentos to anon;
grant all on public.ea_config to service_role;
grant all on public.ea_equipamentos to service_role;
grant all on public.ea_auditoria to service_role;
grant all on public.ea_config_favoritos to service_role;

-- 7) RLS ------------------------------------------------------------
alter table public.ea_config enable row level security;
alter table public.ea_equipamentos enable row level security;
alter table public.ea_auditoria enable row level security;
alter table public.ea_config_favoritos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'ea_config' and policyname = 'ea_config_read') then
    create policy ea_config_read on public.ea_config for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ea_config' and policyname = 'ea_config_write') then
    create policy ea_config_write on public.ea_config for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ea_equipamentos' and policyname = 'ea_equip_read') then
    create policy ea_equip_read on public.ea_equipamentos for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ea_equipamentos' and policyname = 'ea_equip_write') then
    create policy ea_equip_write on public.ea_equipamentos for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ea_auditoria' and policyname = 'ea_aud_read') then
    create policy ea_aud_read on public.ea_auditoria for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ea_auditoria' and policyname = 'ea_aud_insert') then
    create policy ea_aud_insert on public.ea_auditoria for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ea_config_favoritos' and policyname = 'ea_fav_own') then
    create policy ea_fav_own on public.ea_config_favoritos for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- 8) View consolidada da configuração por máquina --------------------
create or replace view public.ea_config_maquina
with (security_invoker = on) as
select m.id as maquina_id,
       m.nome,
       coalesce(jsonb_object_agg(c.categoria, c.dados) filter (where c.categoria is not null), '{}'::jsonb) as config
from public.ea_maquinas m
left join public.ea_config c on c.maquina_id = m.id
group by m.id, m.nome;
