-- Gestor de cartera SNTE: un asesor de McBrokers que puede subir y repartir la cartera
-- sin tener los privilegios del administrador del CRM. Solo el administrador lo nombra.
alter table public.snte_asesores add column if not exists es_gestor boolean not null default false;

create or replace function public.snte_puede_gestionar() returns boolean
language sql stable security definer set search_path = public as $$
  select public.snte_es_admin()
      or exists (select 1 from public.snte_asesores where user_id = auth.uid() and activo and es_gestor)
$$;
revoke execute on function public.snte_puede_gestionar() from public, anon;
grant execute on function public.snte_puede_gestionar() to authenticated;

drop policy if exists snte_cartera_select on public.snte_cartera;
drop policy if exists snte_cartera_update on public.snte_cartera;
drop policy if exists snte_cartera_insert on public.snte_cartera;
drop policy if exists snte_cartera_delete on public.snte_cartera;
create policy snte_cartera_select on public.snte_cartera for select to authenticated
  using (asesor_id = public.snte_mi_asesor() or public.snte_puede_gestionar());
create policy snte_cartera_update on public.snte_cartera for update to authenticated
  using (asesor_id = public.snte_mi_asesor() or public.snte_puede_gestionar())
  with check (asesor_id = public.snte_mi_asesor() or public.snte_puede_gestionar());
create policy snte_cartera_insert on public.snte_cartera for insert to authenticated
  with check (public.snte_puede_gestionar());
create policy snte_cartera_delete on public.snte_cartera for delete to authenticated
  using (public.snte_puede_gestionar());

create or replace function public.snte_asignar(p_ids uuid[], p_asesor uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.snte_puede_gestionar() then raise exception 'permiso'; end if;
  update public.snte_cartera set asesor_id = p_asesor where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

drop function if exists public.snte_lista_asesores();
create function public.snte_lista_asesores() returns table (id uuid, nombre text, correo text, activo boolean, vinculado boolean, es_gestor boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.snte_puede_gestionar() then raise exception 'permiso'; end if;
  return query select a.id, a.nombre, a.correo, a.activo, (a.user_id is not null), a.es_gestor from public.snte_asesores a order by a.nombre;
end $$;

drop function if exists public.snte_mi_perfil();
create function public.snte_mi_perfil() returns table (id uuid, nombre text, correo text, es_gestor boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.nombre, a.correo, a.es_gestor from public.snte_asesores a where a.user_id = auth.uid() and a.activo limit 1
$$;

create or replace function public.snte_set_gestor(p_asesor uuid, p_valor boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.snte_es_admin() then raise exception 'permiso'; end if;
  update public.snte_asesores set es_gestor = p_valor where id = p_asesor;
end $$;

revoke execute on function public.snte_asignar(uuid[], uuid) from public, anon;
revoke execute on function public.snte_lista_asesores() from public, anon;
revoke execute on function public.snte_mi_perfil() from public, anon;
revoke execute on function public.snte_set_gestor(uuid, boolean) from public, anon;
grant execute on function public.snte_asignar(uuid[], uuid) to authenticated;
grant execute on function public.snte_lista_asesores() to authenticated;
grant execute on function public.snte_mi_perfil() to authenticated;
grant execute on function public.snte_set_gestor(uuid, boolean) to authenticated;
