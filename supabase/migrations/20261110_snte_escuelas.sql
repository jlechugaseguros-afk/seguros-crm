-- Cartera de escuelas (Espacio SNTE): se sube por asesor, igual que la cartera de clientes.
create table if not exists public.snte_escuelas (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid references public.snte_asesores(id) on delete set null,
  cct text,
  nombre text not null,
  nivel text,
  control text,
  turno text,
  municipio text,
  localidad text,
  direccion text,
  created_at timestamptz not null default now()
);
create index if not exists snte_escuelas_asesor_idx on public.snte_escuelas (asesor_id);
alter table public.snte_escuelas enable row level security;

revoke all on public.snte_escuelas from anon, authenticated;
grant select, insert, delete on public.snte_escuelas to authenticated;

drop policy if exists snte_escuelas_select on public.snte_escuelas;
drop policy if exists snte_escuelas_insert on public.snte_escuelas;
drop policy if exists snte_escuelas_delete on public.snte_escuelas;
create policy snte_escuelas_select on public.snte_escuelas for select to authenticated
  using (asesor_id = public.snte_mi_asesor() or public.snte_puede_gestionar());
create policy snte_escuelas_insert on public.snte_escuelas for insert to authenticated
  with check (public.snte_puede_gestionar());
create policy snte_escuelas_delete on public.snte_escuelas for delete to authenticated
  using (public.snte_puede_gestionar());
