-- =============================================================
-- ICS Foundation — Multi-tenant + RBAC + Auditoria
-- Rode este arquivo no SQL Editor do seu projeto Supabase
-- (https://pattfqziunpslpncgjsx.supabase.co) uma única vez.
-- Idempotente: pode ser reexecutado sem apagar dados.
-- =============================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('admin','supervisor','operador','visitante');
exception when duplicate_object then null; end $$;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  razao_social text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plantas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cidade text,
  uf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_plantas_empresa on public.plantas(empresa_id);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  planta_id uuid not null references public.plantas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_areas_planta on public.areas(planta_id);

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  planta_id uuid not null references public.plantas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_unidades_planta on public.unidades(planta_id);

create table if not exists public.setores (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_setores_unidade on public.setores(unidade_id);

create table if not exists public.linhas (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.setores(id) on delete cascade,
  nome text not null,
  capacidade_hora numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_linhas_setor on public.linhas(setor_id);

create table if not exists public.turnos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  hora_inicio text not null,
  hora_fim text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.calendarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid references public.calendarios(id) on delete cascade,
  descricao text not null,
  data date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  empresa_id uuid references public.empresas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role, empresa_id)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role);
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role='admin');
$$;

create or replace function public.user_empresas(_user_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct empresa_id from public.user_roles
  where user_id=_user_id and empresa_id is not null;
$$;

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tabela text not null,
  operacao text not null,
  registro_id text,
  antes jsonb,
  depois jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.fn_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria(user_id, tabela, operacao, registro_id, antes, depois)
  values (
    auth.uid(), tg_table_name, tg_op,
    coalesce((case when tg_op='DELETE' then old.id else new.id end)::text, null),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return case when tg_op='DELETE' then old else new end;
end $$;

do $$ declare t text; begin
  for t in select unnest(array[
    'empresas','plantas','unidades','setores','linhas','areas',
    'turnos','calendarios','feriados','user_roles'
  ]) loop
    execute format('drop trigger if exists trg_audit_%1$I on public.%1$I;', t);
    execute format('create trigger trg_audit_%1$I after insert or update or delete on public.%1$I for each row execute function public.fn_audit();', t);
  end loop;
end $$;

create or replace view public.v_user_roles
with (security_invoker=on) as
select ur.id, ur.user_id, ur.role, ur.empresa_id, p.email, p.nome
from public.user_roles ur
left join public.profiles p on p.id=ur.user_id;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.empresas    to authenticated;
grant select, insert, update, delete on public.plantas     to authenticated;
grant select, insert, update, delete on public.unidades    to authenticated;
grant select, insert, update, delete on public.setores     to authenticated;
grant select, insert, update, delete on public.linhas      to authenticated;
grant select, insert, update, delete on public.areas       to authenticated;
grant select, insert, update, delete on public.turnos      to authenticated;
grant select, insert, update, delete on public.calendarios to authenticated;
grant select, insert, update, delete on public.feriados    to authenticated;
grant select, insert, update, delete on public.profiles    to authenticated;
grant select, insert, update, delete on public.user_roles  to authenticated;
grant select on public.auditoria to authenticated;
grant select on public.v_user_roles to authenticated;
grant all on all tables in schema public to service_role;

alter table public.empresas    enable row level security;
alter table public.plantas     enable row level security;
alter table public.unidades    enable row level security;
alter table public.setores     enable row level security;
alter table public.linhas      enable row level security;
alter table public.areas       enable row level security;
alter table public.turnos      enable row level security;
alter table public.calendarios enable row level security;
alter table public.feriados    enable row level security;
alter table public.profiles    enable row level security;
alter table public.user_roles  enable row level security;
alter table public.auditoria   enable row level security;

do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies
           where schemaname='public' and tablename in
             ('empresas','plantas','unidades','setores','linhas','areas',
              'turnos','calendarios','feriados','profiles','user_roles','auditoria')
  loop execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename); end loop;
end $$;

create policy "profiles_self_select" on public.profiles for select
  to authenticated using (id=auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_self_update" on public.profiles for update
  to authenticated using (id=auth.uid()) with check (id=auth.uid());

create policy "user_roles_self_read" on public.user_roles for select
  to authenticated using (user_id=auth.uid() or public.is_admin(auth.uid()));
create policy "user_roles_admin_write" on public.user_roles for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "empresas_admin_all" on public.empresas for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "empresas_tenant_read" on public.empresas for select
  to authenticated using (id in (select public.user_empresas(auth.uid())));

create policy "plantas_admin_all" on public.plantas for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "plantas_tenant_rw" on public.plantas for all
  to authenticated
  using (empresa_id in (select public.user_empresas(auth.uid())))
  with check (empresa_id in (select public.user_empresas(auth.uid())));

create policy "areas_admin_all" on public.areas for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "unidades_admin_all" on public.unidades for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "setores_admin_all"  on public.setores  for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "linhas_admin_all"   on public.linhas   for all
  to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "areas_tenant_rw" on public.areas for all
  to authenticated
  using (planta_id in (select p.id from public.plantas p where p.empresa_id in (select public.user_empresas(auth.uid()))))
  with check (planta_id in (select p.id from public.plantas p where p.empresa_id in (select public.user_empresas(auth.uid()))));
create policy "unidades_tenant_rw" on public.unidades for all
  to authenticated
  using (planta_id in (select p.id from public.plantas p where p.empresa_id in (select public.user_empresas(auth.uid()))))
  with check (planta_id in (select p.id from public.plantas p where p.empresa_id in (select public.user_empresas(auth.uid()))));
create policy "setores_tenant_rw" on public.setores for all
  to authenticated
  using (unidade_id in (select u.id from public.unidades u join public.plantas p on p.id=u.planta_id where p.empresa_id in (select public.user_empresas(auth.uid()))))
  with check (unidade_id in (select u.id from public.unidades u join public.plantas p on p.id=u.planta_id where p.empresa_id in (select public.user_empresas(auth.uid()))));
create policy "linhas_tenant_rw" on public.linhas for all
  to authenticated
  using (setor_id in (select s.id from public.setores s join public.unidades u on u.id=s.unidade_id join public.plantas p on p.id=u.planta_id where p.empresa_id in (select public.user_empresas(auth.uid()))))
  with check (setor_id in (select s.id from public.setores s join public.unidades u on u.id=s.unidade_id join public.plantas p on p.id=u.planta_id where p.empresa_id in (select public.user_empresas(auth.uid()))));

create policy "turnos_read"      on public.turnos      for select to authenticated using (true);
create policy "calendarios_read" on public.calendarios for select to authenticated using (true);
create policy "feriados_read"    on public.feriados    for select to authenticated using (true);
create policy "turnos_admin_write"      on public.turnos      for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "calendarios_admin_write" on public.calendarios for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "feriados_admin_write"    on public.feriados    for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "auditoria_admin_read" on public.auditoria for select
  to authenticated using (public.is_admin(auth.uid()));

-- =============================================================
-- EA CONFIGS — Configuração de aquisição por ativo (Frota EA)
-- Cada usuário mantém suas próprias configs por asset_name.
-- =============================================================
create table if not exists public.ea_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_name text not null,
  enabled boolean not null default true,
  protocol text not null default 'OPC-UA',
  host text,
  port integer,
  endpoint text,
  username text,
  poll_ms integer not null default 1500,
  unit text not null default 'g',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_name)
);
create index if not exists idx_ea_configs_user on public.ea_configs(user_id);

grant select, insert, update, delete on public.ea_configs to authenticated;
grant all on public.ea_configs to service_role;

alter table public.ea_configs enable row level security;

do $$ declare r record; begin
  for r in select policyname from pg_policies
           where schemaname='public' and tablename='ea_configs'
  loop execute format('drop policy if exists %I on public.ea_configs;', r.policyname); end loop;
end $$;

create policy "ea_configs_owner_all" on public.ea_configs for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================
-- MÓDULOS DE CONFIGURAÇÕES — Integrações, Bancos, Parâmetros, Segurança
-- =============================================================
create table if not exists public.integracoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null,
  endpoint text,
  api_key_ref text,
  ativo boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bancos_dados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  engine text not null,
  host text,
  port integer,
  database_name text,
  username text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parametros_sistema (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor text,
  descricao text,
  categoria text not null default 'geral',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seguranca_config (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'default',
  mfa_obrigatorio boolean not null default false,
  session_timeout_min integer not null default 60,
  password_min_length integer not null default 8,
  criptografia text not null default 'AES-256',
  auditoria_ativa boolean not null default true,
  lgpd_retencao_dias integer not null default 365,
  observacoes text,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.integracoes        to authenticated;
grant select, insert, update, delete on public.bancos_dados       to authenticated;
grant select, insert, update, delete on public.parametros_sistema to authenticated;
grant select, insert, update, delete on public.seguranca_config   to authenticated;
grant all on public.integracoes, public.bancos_dados, public.parametros_sistema, public.seguranca_config to service_role;

alter table public.integracoes        enable row level security;
alter table public.bancos_dados       enable row level security;
alter table public.parametros_sistema enable row level security;
alter table public.seguranca_config   enable row level security;

do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies
           where schemaname='public' and tablename in
             ('integracoes','bancos_dados','parametros_sistema','seguranca_config')
  loop execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename); end loop;
end $$;

create policy "integracoes_read"       on public.integracoes        for select to authenticated using (true);
create policy "integracoes_admin"      on public.integracoes        for all    to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "bancos_read"            on public.bancos_dados       for select to authenticated using (true);
create policy "bancos_admin"           on public.bancos_dados       for all    to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "parametros_read"        on public.parametros_sistema for select to authenticated using (true);
create policy "parametros_admin"       on public.parametros_sistema for all    to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "seguranca_read"         on public.seguranca_config   for select to authenticated using (true);
create policy "seguranca_admin"        on public.seguranca_config   for all    to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- audit triggers para as novas tabelas
do $$ declare t text; begin
  for t in select unnest(array['integracoes','bancos_dados','parametros_sistema','seguranca_config']) loop
    execute format('drop trigger if exists trg_audit_%1$I on public.%1$I;', t);
    execute format('create trigger trg_audit_%1$I after insert or update or delete on public.%1$I for each row execute function public.fn_audit();', t);
  end loop;
end $$;

-- seed inicial da linha única de segurança
insert into public.seguranca_config (nome) values ('default') on conflict do nothing;

-- =============================================================
-- PASSO FINAL — promova o primeiro admin (substitua o e-mail):
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'seu-email@exemplo.com'
-- on conflict do nothing;
-- =============================================================