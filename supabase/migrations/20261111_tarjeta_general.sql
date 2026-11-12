-- Tarjeta digital "General" (plantilla Inbursa, todos los datos editables).
-- Tabla nueva y aparte de public_cards; no toca la tarjeta MCB.
create table if not exists public.public_cards_general (
  agent_id uuid primary key references auth.users(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.public_cards_general enable row level security;

create policy "cualquiera puede ver tarjetas generales" on public.public_cards_general
  for select to public using (true);
create policy "agente crea su tarjeta general" on public.public_cards_general
  for insert to authenticated with check (agent_id = auth.uid());
create policy "agente actualiza su tarjeta general" on public.public_cards_general
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
