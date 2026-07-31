-- ------------------------------------------------------------------
-- Operadores (vínculo por matrícula + nome)
-- ------------------------------------------------------------------
create table if not exists public.operadores (
  id uuid primary key default gen_random_uuid(),
  matricula text not null unique,
  nome text not null,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Correção: bases antigas podem ter criado `matricula` como uuid, o que faz
-- o Postgres recusar valores digitados como "40207929"
-- (invalid input syntax for type uuid). Converte para texto.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'operadores'
      and column_name = 'matricula' and data_type = 'uuid'
  ) then
    alter table public.operadores alter column matricula type text using matricula::text;
  end if;
end $$;

alter table public.operadores add column if not exists matricula text;
alter table public.operadores add column if not exists nome text;
alter table public.operadores add column if not exists ativo boolean not null default true;

grant select, insert, update, delete on public.operadores to authenticated;
grant all on public.operadores to service_role;

alter table public.operadores enable row level security;

drop policy if exists "operadores_select" on public.operadores;
create policy "operadores_select" on public.operadores
  for select to authenticated using (true);

drop policy if exists "operadores_insert" on public.operadores;
create policy "operadores_insert" on public.operadores
  for insert to authenticated with check (true);

drop policy if exists "operadores_update" on public.operadores;
create policy "operadores_update" on public.operadores
  for update to authenticated using (true) with check (true);