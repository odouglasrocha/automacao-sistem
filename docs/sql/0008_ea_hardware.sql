-- =============================================================
-- 0008_ea_hardware.sql — Hardware industrial por máquina EA
-- CLP Allen-Bradley MicroLogix 1500 + Inversor WEG CFW08.
-- Tudo escopado por maquina_id — nenhuma configuração é global.
-- Idempotente: pode ser executado várias vezes.
-- =============================================================

-- 1) Colunas novas na configuração do controlador ------------------
alter table public.ea_clp_configuracao add column if not exists driver text default 'allen-bradley/micrologix-1500';
alter table public.ea_clp_configuracao add column if not exists scan_ms integer default 1000;
alter table public.ea_clp_configuracao add column if not exists versao text;
alter table public.ea_clp_configuracao add column if not exists status text default 'offline';

-- 2) Inversor de frequência (1:1 com a máquina) --------------------
create table if not exists public.ea_inversor (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null unique references public.ea_maquinas(id) on delete cascade,
  fabricante text not null default 'WEG',
  modelo text not null default 'CFW08',
  numero_serie text,
  firmware text,
  potencia_cv numeric,
  tensao_v numeric,
  corrente_a numeric,
  frequencia_nominal_hz numeric,
  protocolo text not null default 'Modbus RTU',
  porta_serial text,
  ip text,
  porta integer,
  endereco_modbus integer default 1,
  baud_rate integer default 9600,
  parity text default 'none',
  stop_bits integer default 1,
  timeout_ms integer default 1000,
  intervalo_leitura_ms integer default 1000,
  status text default 'offline',
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

-- 3) Status em tempo real do inversor (1:1) ------------------------
create table if not exists public.ea_inversor_status (
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

-- 4) Componentes de hardware adicionais (N por máquina) ------------
create table if not exists public.ea_hardware (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  tipo text not null,                -- clp | inversor | ihm | balanca | sensor | rede
  fabricante text,
  modelo text,
  numero_serie text,
  firmware text,
  descricao text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ea_hardware_maquina on public.ea_hardware (maquina_id, tipo);

-- 5) Histórico consolidado de leituras (dashboards, OEE) -----------
create table if not exists public.ea_historico (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references public.ea_maquinas(id) on delete cascade,
  origem text not null default 'clp',   -- clp | inversor
  chave text not null,
  valor_num numeric,
  valor_texto text,
  ts timestamptz not null default now()
);
create index if not exists idx_ea_historico_maquina on public.ea_historico (maquina_id, ts desc);

-- 6) GRANTS + RLS ---------------------------------------------------
do $$
declare t text;
  tabelas text[] := array['ea_inversor','ea_inversor_status','ea_hardware','ea_historico'];
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

-- 7) Registros 1:1 padrão para toda a frota ------------------------
insert into public.ea_inversor (maquina_id)
select m.id from public.ea_maquinas m
left join public.ea_inversor i on i.maquina_id = m.id
where i.id is null;

insert into public.ea_inversor_status (maquina_id, status)
select m.id, 'offline' from public.ea_maquinas m
left join public.ea_inversor_status s on s.maquina_id = m.id
where s.id is null;

update public.ea_clp_configuracao
   set familia = coalesce(familia, 'MicroLogix'),
       modelo  = coalesce(modelo, 'MicroLogix 1500'),
       driver  = coalesce(driver, 'allen-bradley/micrologix-1500');

-- 8) Realtime (WebSocket) para status/histórico --------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.ea_clp_status'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.ea_inversor_status'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.ea_clp_logs'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.ea_diagnostico'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.ea_historico'; exception when others then null; end;
end $$;