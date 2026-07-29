-- =============================================================
-- 0002_owner_rls.sql — Evita "new row violates row-level security"
-- Adiciona coluna created_by (default auth.uid()) e políticas de
-- "dono" (owner) para permitir que qualquer usuário AUTENTICADO
-- crie, edite e remova seus próprios registros nas tabelas de
-- configuração/tenant — sem depender de ser admin.
-- Idempotente: pode ser executado várias vezes.
-- =============================================================

do $$
declare
  t text;
  tabelas text[] := array[
    'empresas','plantas','unidades','setores','linhas','areas',
    'turnos','calendarios','feriados',
    'integracoes','bancos_dados','parametros_sistema'
  ];
begin
  foreach t in array tabelas loop
    -- 1) cria coluna created_by se ainda não existir
    execute format($f$
      alter table public.%1$I
        add column if not exists created_by uuid
        references auth.users(id) on delete set null
        default auth.uid();
    $f$, t);

    -- 2) backfill: registros antigos sem owner recebem o usuário atual
    execute format('update public.%1$I set created_by = coalesce(created_by, auth.uid());', t);

    -- 3) remove policy antiga homônima e recria a policy de "dono"
    execute format('drop policy if exists %1$I on public.%2$I;', t || '_owner_write', t);
    execute format($f$
      create policy %1$I on public.%2$I
        for all
        to authenticated
        using (created_by = auth.uid() or public.is_admin(auth.uid()))
        with check (created_by = auth.uid() or public.is_admin(auth.uid()));
    $f$, t || '_owner_write', t);

    -- 4) garante SELECT amplo p/ authenticated (o admin_all já cobre; owner_write cobre writes).
    --    Para tabelas tenant-scoped as políticas existentes continuam válidas.
  end loop;
end $$;

-- Observação: as políticas admin_all e tenant_rw existentes continuam
-- ativas — o Postgres aplica RLS como OR entre policies do mesmo comando,
-- então basta uma delas autorizar o write.