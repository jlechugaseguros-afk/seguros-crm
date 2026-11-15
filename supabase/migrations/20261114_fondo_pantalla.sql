-- Fondo de pantalla / widget del CRM: enlace personal con token secreto por agente.
-- Solo agrega una tabla y funciones nuevas; no toca datos existentes.

create table public.fondo_tokens (
  agent_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.fondo_tokens enable row level security;
revoke all on public.fondo_tokens from anon, authenticated;
-- Sin políticas: nadie lee la tabla directo; todo pasa por las funciones de abajo.

-- Devuelve el token del agente que inició sesión (lo crea si no existe).
create or replace function public.fondo_token_obtener() returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'No hay sesión'; end if;
  select token into t from public.fondo_tokens where agent_id = auth.uid();
  if t is null then
    t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.fondo_tokens (agent_id, token) values (auth.uid(), t);
  end if;
  return t;
end $$;
revoke execute on function public.fondo_token_obtener() from public, anon;
grant execute on function public.fondo_token_obtener() to authenticated;

-- Genera un token nuevo (el enlace anterior deja de funcionar).
create or replace function public.fondo_token_regenerar() returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'No hay sesión'; end if;
  t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.fondo_tokens (agent_id, token) values (auth.uid(), t)
  on conflict (agent_id) do update set token = excluded.token, created_at = now();
  return t;
end $$;
revoke execute on function public.fondo_token_regenerar() from public, anon;
grant execute on function public.fondo_token_regenerar() to authenticated;

-- Datos que necesita el fondo, a partir del token. La usa la función /api/fondo de Vercel con la llave pública.
create or replace function public.fondo_datos(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid; r jsonb;
begin
  if p_token is null or char_length(p_token) < 32 then return null; end if;
  select agent_id into a from public.fondo_tokens where token = p_token;
  if a is null then return null; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into r
  from public.app_data
  where agent_id = a
    and key in ('clients', 'prospectos', 'activities', 'cobranza', 'cobranzaConfig', 'metasComisiones', 'porcentajesComision', 'agentProfile');
  return r;
end $$;
revoke execute on function public.fondo_datos(text) from public;
grant execute on function public.fondo_datos(text) to anon, authenticated;
