-- Respaldos automáticos del CRM por agente y conteo simple de uso por pestaña.
-- Solo agrega tablas y funciones nuevas; no toca datos existentes.

-- ---------- Respaldos ----------
create table public.respaldos (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  origen text not null default 'automatico' check (origen in ('automatico', 'manual')),
  claves integer not null default 0,
  datos jsonb not null,
  created_at timestamptz not null default now()
);
create index respaldos_agente_idx on public.respaldos (agent_id, created_at desc);
alter table public.respaldos enable row level security;
revoke all on public.respaldos from anon, authenticated;
grant select, insert, delete on public.respaldos to authenticated;

create policy respaldos_select on public.respaldos for select to authenticated
  using (agent_id = auth.uid());
create policy respaldos_insert on public.respaldos for insert to authenticated
  with check (agent_id = auth.uid());
create policy respaldos_delete on public.respaldos for delete to authenticated
  using (agent_id = auth.uid());

-- Conserva solo los últimos N respaldos de cada agente (se llama después de guardar uno nuevo).
create or replace function public.respaldos_limpiar(p_conservar integer default 14) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.respaldos r
  where r.agent_id = auth.uid()
    and r.id not in (
      select id from public.respaldos where agent_id = auth.uid() order by created_at desc limit greatest(p_conservar, 1)
    );
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.respaldos_limpiar(integer) from public, anon;
grant execute on function public.respaldos_limpiar(integer) to authenticated;

-- ---------- Uso por pestaña ----------
create table public.uso_pestanas (
  agent_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  pestana text not null check (char_length(pestana) between 1 and 40),
  n integer not null default 0,
  primary key (agent_id, dia, pestana)
);
alter table public.uso_pestanas enable row level security;
revoke all on public.uso_pestanas from anon, authenticated;

-- Cada agente suma una apertura de pestaña para hoy (hora de Ciudad de México).
create or replace function public.registrar_uso_pestana(p_pestana text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_pestana is null or char_length(p_pestana) = 0 or char_length(p_pestana) > 40 then
    return;
  end if;
  insert into public.uso_pestanas (agent_id, dia, pestana, n)
  values (auth.uid(), (now() at time zone 'America/Mexico_City')::date, p_pestana, 1)
  on conflict (agent_id, dia, pestana) do update set n = public.uso_pestanas.n + 1;
end $$;
revoke execute on function public.registrar_uso_pestana(text) from public, anon;
grant execute on function public.registrar_uso_pestana(text) to authenticated;

-- Resumen para el administrador: aperturas, agentes distintos y último uso por pestaña.
create or replace function public.uso_pestanas_resumen(p_dias integer default 30)
returns table (pestana text, aperturas bigint, agentes bigint, ultimo_uso date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.snte_es_admin() then raise exception 'permiso'; end if;
  return query
    select u.pestana, sum(u.n)::bigint, count(distinct u.agent_id)::bigint, max(u.dia)
    from public.uso_pestanas u
    where u.dia >= (now() at time zone 'America/Mexico_City')::date - greatest(p_dias, 1)
    group by u.pestana
    order by sum(u.n) desc;
end $$;
revoke execute on function public.uso_pestanas_resumen(integer) from public, anon;
grant execute on function public.uso_pestanas_resumen(integer) to authenticated;
