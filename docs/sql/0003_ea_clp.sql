-- =============================================================
-- 0003_ea_clp.sql — Configuração do Painel da Máquina · Frota EA
-- Cada máquina EA possui configuração TOTALMENTE INDEPENDENTE.
-- Todas as tabelas se relacionam por maquina_id (nunca global).
-- Idempotente: pode ser executado várias vezes.
-- =============================================================

-- ------------------------------------------------------------------
-- 1) Máquinas da frota EA
-- ------------------------------------------------------------------
create table if not exists public.ea_maquinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  linha text,
  descricao text,
  localizacao text,
  fabricante_maquina text,
  ano_fabricacao integer,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 2) Catálogo dinâmico de modelos de CLP (Allen-Bradley + futuros)
--    Permite adicionar novos modelos SEM alteração de código.
-- ------------------------------------------------------------------
create table if not exists public.ea_clp_modelos (
  id uuid primary key default gen_random_uuid(),
  fabricante text not null default 'Allen-Bradley',
  familia text not null,
  modelo text not null,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (fabricante, familia, modelo)
);

-- ------------------------------------------------------------------
-- 3) Configuração do CLP — 1:1 com a máquina
-- ------------------------------------------------------------------
create table if not exists public.ea_clp_configuracao (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null unique references public.ea_maquinas(id) on delete cascade,
  fabricante text not null default 'Allen-Bradley',
  familia text,
  modelo text,
  numero_serie text,
  firmware text,
  revisao text,
  descricao text,
  slot integer default 0,
  rack integer default 0,
  chassis text,
  ativo boolean not null default true,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 4) Comunicação industrial — 1:1 com a máquina
-- ------------------------------------------------------------------
create table if not exists public.ea_comunicacao (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null unique references public.ea_maquinas(id) on delete cascade,
  protocolo text not null default 'EtherNet/IP',
  ip text,
  mascara text default '255.255.255.0',
  gateway text,
  dns text,
  porta integer not null default 44818,
  timeout_ms integer not null default 3000,
  intervalo_leitura_ms integer not null default 1000,
  heartbeat_ms integer not null default 5000,
  keep_alive boolean not null default true,
  reconexao_automatica boolean not null default true,
  modo text not null default 'simulacao',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 5) Tags — exclusivas por máquina (nunca compartilhadas)
-- ------------------------------------------------------------------
create table if not exists public.ea_clp_tags (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  nome text not null,
  descricao text,
  data_type text not null default 'DINT',
  categoria text,
  leitura boolean not null default true,
  escrita boolean not null default false,
  obrigatoria boolean not null default false,
  ativa boolean not null default true,
  escala numeric not null default 1,
  offset_valor numeric not null default 0,
  unidade text,
  endereco text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (maquina_id, nome)
);

-- ------------------------------------------------------------------
-- 6) Receitas — associadas somente à máquina selecionada
-- ------------------------------------------------------------------
create table if not exists public.ea_receitas (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  nome text not null,
  versao text default '1.0',
  produto text,
  descricao text,
  parametros jsonb not null default '{}'::jsonb,
  ativa boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (maquina_id, nome, versao)
);

-- ------------------------------------------------------------------
-- 7) Alarmes por máquina
-- ------------------------------------------------------------------
create table if not exists public.ea_alarmes (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  codigo text not null,
  descricao text,
  severidade text not null default 'warning',
  tag text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (maquina_id, codigo)
);

-- ------------------------------------------------------------------
-- 8) Histórico / logs por máquina
-- ------------------------------------------------------------------
create table if not exists public.ea_clp_logs (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  categoria text not null default 'conexao',
  evento text not null,
  detalhe text,
  operador text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  ts timestamptz not null default now()
);
create index if not exists idx_ea_clp_logs_maquina on public.ea_clp_logs (maquina_id, ts desc);

-- ------------------------------------------------------------------
-- 9) Status em tempo real — 1:1 com a máquina
-- ------------------------------------------------------------------
create table if not exists public.ea_clp_status (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null unique references public.ea_maquinas(id) on delete cascade,
  status text not null default 'offline',
  ultima_conexao timestamptz,
  ultimo_erro text,
  tempo_resposta_ms integer,
  firmware_detectado text,
  modelo_detectado text,
  fabricante_detectado text,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 10) Diagnóstico por máquina
-- ------------------------------------------------------------------
create table if not exists public.ea_diagnostico (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  tipo text not null,
  sucesso boolean not null default false,
  resultado text,
  tempo_resposta_ms integer,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  ts timestamptz not null default now()
);
create index if not exists idx_ea_diag_maquina on public.ea_diagnostico (maquina_id, ts desc);

-- ------------------------------------------------------------------
-- 11) Permissões por máquina (RBAC por ativo)
-- ------------------------------------------------------------------
create table if not exists public.ea_permissoes (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  perfil text not null,
  pode_ler boolean not null default true,
  pode_escrever boolean not null default false,
  pode_configurar boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  unique (maquina_id, perfil)
);

-- ------------------------------------------------------------------
-- GRANTS + RLS (evita "new row violates row-level security policy")
-- ------------------------------------------------------------------
do $$
declare t text;
  tabelas text[] := array[
    'ea_maquinas','ea_clp_modelos','ea_clp_configuracao','ea_comunicacao',
    'ea_clp_tags','ea_receitas','ea_alarmes','ea_clp_logs','ea_clp_status',
    'ea_diagnostico','ea_permissoes'
  ];
begin
  foreach t in array tabelas loop
    execute format('grant select, insert, update, delete on public.%1$I to authenticated;', t);
    execute format('grant all on public.%1$I to service_role;', t);
    execute format('alter table public.%1$I enable row level security;', t);
    execute format('drop policy if exists %1$I on public.%2$I;', t || '_rw', t);
    execute format($f$
      create policy %1$I on public.%2$I
        for all to authenticated
        using (true) with check (true);
    $f$, t || '_rw', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- SEED — Frota EA34..EA58 (exceto EA43)
-- ------------------------------------------------------------------
insert into public.ea_maquinas (nome, descricao)
select 'EA' || n, 'Máquina de envase EA' || n
from generate_series(34, 58) as n
where n <> 43
on conflict (nome) do nothing;

-- registros 1:1 padrão para cada máquina
insert into public.ea_comunicacao (maquina_id)
select m.id from public.ea_maquinas m
left join public.ea_comunicacao c on c.maquina_id = m.id
where c.id is null;

insert into public.ea_clp_configuracao (maquina_id)
select m.id from public.ea_maquinas m
left join public.ea_clp_configuracao k on k.maquina_id = m.id
where k.id is null;

insert into public.ea_clp_status (maquina_id, status)
select m.id, 'offline' from public.ea_maquinas m
left join public.ea_clp_status s on s.maquina_id = m.id
where s.id is null;

-- ------------------------------------------------------------------
-- SEED — catálogo de modelos Allen-Bradley
-- ------------------------------------------------------------------
insert into public.ea_clp_modelos (fabricante, familia, modelo) values
  ('Allen-Bradley','Micro800','Micro820'),
  ('Allen-Bradley','Micro800','Micro830'),
  ('Allen-Bradley','Micro800','Micro850'),
  ('Allen-Bradley','Micro800','Micro870'),
  ('Allen-Bradley','MicroLogix','1000'),
  ('Allen-Bradley','MicroLogix','1100'),
  ('Allen-Bradley','MicroLogix','1200'),
  ('Allen-Bradley','MicroLogix','1400'),
  ('Allen-Bradley','MicroLogix','1500'),
  ('Allen-Bradley','CompactLogix','1768-L43'),
  ('Allen-Bradley','CompactLogix','1768-L45'),
  ('Allen-Bradley','CompactLogix','1769-L16ER-BB1B'),
  ('Allen-Bradley','CompactLogix','1769-L18ER'),
  ('Allen-Bradley','CompactLogix','1769-L18ERM'),
  ('Allen-Bradley','CompactLogix','1769-L23E'),
  ('Allen-Bradley','CompactLogix','1769-L24ER-QB1B'),
  ('Allen-Bradley','CompactLogix','1769-L27ERM'),
  ('Allen-Bradley','CompactLogix','1769-L30ER'),
  ('Allen-Bradley','CompactLogix','1769-L30ERM'),
  ('Allen-Bradley','CompactLogix','1769-L33ER'),
  ('Allen-Bradley','CompactLogix','1769-L36ERM'),
  ('Allen-Bradley','CompactLogix','1769-L37ERM'),
  ('Allen-Bradley','CompactLogix 5380','5069-L306ER'),
  ('Allen-Bradley','CompactLogix 5380','5069-L310ER'),
  ('Allen-Bradley','CompactLogix 5380','5069-L320ER'),
  ('Allen-Bradley','CompactLogix 5380','5069-L330ER'),
  ('Allen-Bradley','CompactLogix 5380','5069-L340ER'),
  ('Allen-Bradley','CompactLogix 5380','5069-L350ER'),
  ('Allen-Bradley','CompactLogix 5380','5069-L380ER'),
  ('Allen-Bradley','ControlLogix','1756-L61'),
  ('Allen-Bradley','ControlLogix','1756-L62'),
  ('Allen-Bradley','ControlLogix','1756-L63'),
  ('Allen-Bradley','ControlLogix','1756-L71'),
  ('Allen-Bradley','ControlLogix','1756-L72'),
  ('Allen-Bradley','ControlLogix','1756-L73'),
  ('Allen-Bradley','ControlLogix','1756-L74'),
  ('Allen-Bradley','ControlLogix','1756-L75'),
  ('Allen-Bradley','ControlLogix','1756-L81E'),
  ('Allen-Bradley','ControlLogix','1756-L82E'),
  ('Allen-Bradley','ControlLogix','1756-L83E'),
  ('Allen-Bradley','ControlLogix','1756-L84E'),
  ('Allen-Bradley','ControlLogix','1756-L85E'),
  ('Allen-Bradley','GuardLogix','1756-L71S'),
  ('Allen-Bradley','GuardLogix','1756-L72S'),
  ('Allen-Bradley','GuardLogix','1756-L73S'),
  ('Allen-Bradley','GuardLogix','1756-L81ES'),
  ('Allen-Bradley','GuardLogix','1756-L82ES'),
  ('Allen-Bradley','GuardLogix','1756-L83ES'),
  ('Allen-Bradley','FlexLogix','1788-L43'),
  ('Allen-Bradley','FlexLogix','1788-L45'),
  ('Allen-Bradley','SoftLogix','5800'),
  ('Allen-Bradley','Emulator','Studio 5000 Emulator')
on conflict (fabricante, familia, modelo) do nothing;