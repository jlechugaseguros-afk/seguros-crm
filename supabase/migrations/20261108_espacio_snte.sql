-- Espacio SNTE (McBrokers): asesores, intentos de acceso y cartera asignada.
-- Solo estructura. Las claves de asesor se cargan directo en la base, nunca en el repositorio.

create table public.snte_asesores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  correo text not null unique,
  clave text not null,
  activo boolean not null default true,
  user_id uuid unique references auth.users(id) on delete set null,
  vinculado_en timestamptz,
  created_at timestamptz not null default now()
);
alter table public.snte_asesores enable row level security;
revoke all on public.snte_asesores from anon, authenticated;

create table public.snte_intentos (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);
alter table public.snte_intentos enable row level security;
revoke all on public.snte_intentos from anon, authenticated;
create index snte_intentos_user_idx on public.snte_intentos (user_id, created_at);

create table public.snte_cartera (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid references public.snte_asesores(id) on delete set null,
  nombre text not null,
  curp text,
  seccion text check (seccion is null or seccion in ('23','51')),
  turno text,
  telefono text,
  puesto text,
  ciudad text,
  escuela text,
  resultado text not null default 'Sin contactar',
  comentarios text,
  ultimo_contacto timestamptz,
  prospecto_id text,
  created_at timestamptz not null default now()
);
create index snte_cartera_asesor_idx on public.snte_cartera (asesor_id);
alter table public.snte_cartera enable row level security;

create or replace function public.snte_mi_asesor() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.snte_asesores where user_id = auth.uid() and activo limit 1
$$;

create or replace function public.snte_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'admin' and activo)
$$;

create or replace function public.snte_mi_perfil() returns table (id uuid, nombre text, correo text)
language sql stable security definer set search_path = public as $$
  select a.id, a.nombre, a.correo from public.snte_asesores a where a.user_id = auth.uid() and a.activo limit 1
$$;

create or replace function public.snte_lista_asesores() returns table (id uuid, nombre text, correo text, activo boolean, vinculado boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.snte_es_admin() then raise exception 'permiso'; end if;
  return query select a.id, a.nombre, a.correo, a.activo, (a.user_id is not null) from public.snte_asesores a order by a.nombre;
end $$;

create or replace function public.snte_asignar(p_ids uuid[], p_asesor uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.snte_es_admin() then raise exception 'permiso'; end if;
  update public.snte_cartera set asesor_id = p_asesor where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.snte_mi_asesor() from public, anon;
revoke execute on function public.snte_es_admin() from public, anon;
revoke execute on function public.snte_mi_perfil() from public, anon;
revoke execute on function public.snte_lista_asesores() from public, anon;
revoke execute on function public.snte_asignar(uuid[], uuid) from public, anon;
grant execute on function public.snte_mi_asesor() to authenticated;
grant execute on function public.snte_es_admin() to authenticated;
grant execute on function public.snte_mi_perfil() to authenticated;
grant execute on function public.snte_lista_asesores() to authenticated;
grant execute on function public.snte_asignar(uuid[], uuid) to authenticated;

revoke all on public.snte_cartera from anon, authenticated;
grant select, insert, delete on public.snte_cartera to authenticated;
grant update (resultado, comentarios, ultimo_contacto, prospecto_id) on public.snte_cartera to authenticated;

create policy snte_cartera_select on public.snte_cartera for select to authenticated
  using (asesor_id = public.snte_mi_asesor() or public.snte_es_admin());
create policy snte_cartera_update on public.snte_cartera for update to authenticated
  using (asesor_id = public.snte_mi_asesor() or public.snte_es_admin())
  with check (asesor_id = public.snte_mi_asesor() or public.snte_es_admin());
create policy snte_cartera_insert on public.snte_cartera for insert to authenticated
  with check (public.snte_es_admin());
create policy snte_cartera_delete on public.snte_cartera for delete to authenticated
  using (public.snte_es_admin());
