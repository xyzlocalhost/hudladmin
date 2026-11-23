-- Command queue: owner console → agent (file explorer list/read/write, etc.)

create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('fs.roots', 'fs.list', 'fs.read', 'fs.write')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'error', 'expired')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);

create index if not exists device_commands_poll_idx
  on public.device_commands (device_id, status, created_at);

create index if not exists device_commands_owner_idx
  on public.device_commands (owner_id, created_at desc);

alter table public.device_commands enable row level security;

create policy "device_commands_select_own"
  on public.device_commands for select
  using (auth.uid() = owner_id);

create policy "device_commands_insert_own"
  on public.device_commands for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.devices d
      where d.id = device_id and d.owner_id = auth.uid()
    )
  );

-- Agent claims/completes via service role (no authenticated update policy)
