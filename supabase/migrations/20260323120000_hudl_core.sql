-- Hudl fleet core schema: owner profiles, devices, heartbeats, alerts, activity, vault.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Devices
-- ---------------------------------------------------------------------------
create type public.device_status as enum ('online', 'stale', 'offline');

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  hostname text not null,
  os text,
  agent_version text,
  lan_ip text,
  status public.device_status not null default 'offline',
  last_seen_at timestamptz,
  rustdesk_id text,
  cpu numeric(5,1),
  ram_used_gb numeric(8,2),
  ram_total_gb numeric(8,2),
  battery numeric(5,1),
  ping_ms integer,
  uptime_seconds bigint,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devices_owner_id_idx on public.devices (owner_id);
create index if not exists devices_last_seen_at_idx on public.devices (last_seen_at desc);
create unique index if not exists devices_owner_hostname_uidx on public.devices (owner_id, hostname);

alter table public.devices enable row level security;

create policy "devices_select_own"
  on public.devices for select
  using (auth.uid() = owner_id);

create policy "devices_update_own"
  on public.devices for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "devices_delete_own"
  on public.devices for delete
  using (auth.uid() = owner_id);

-- inserts happen via service role (agent enroll), not direct user insert

-- ---------------------------------------------------------------------------
-- Device tokens (hashed). Plain token never stored.
-- ---------------------------------------------------------------------------
create table if not exists public.device_tokens (
  device_id uuid primary key references public.devices (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.device_tokens enable row level security;
-- no policies for authenticated: only service role

-- ---------------------------------------------------------------------------
-- Alerts
-- ---------------------------------------------------------------------------
create type public.alert_kind as enum (
  'online', 'offline', 'stale', 'battery', 'session', 'disk', 'agent', 'vault', 'connect'
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  kind public.alert_kind not null,
  title text not null,
  body text not null,
  unread boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists alerts_owner_created_idx on public.alerts (owner_id, created_at desc);

alter table public.alerts enable row level security;

create policy "alerts_select_own"
  on public.alerts for select
  using (auth.uid() = owner_id);

create policy "alerts_update_own"
  on public.alerts for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Activity
-- ---------------------------------------------------------------------------
create type public.activity_kind as enum ('session', 'agent', 'vault', 'files', 'system');

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  kind public.activity_kind not null,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_owner_created_idx on public.activity_events (owner_id, created_at desc);

alter table public.activity_events enable row level security;

create policy "activity_select_own"
  on public.activity_events for select
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Vault (ciphertext only — encrypt client-side or via app layer)
-- ---------------------------------------------------------------------------
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  label text not null,
  username text,
  url text,
  ciphertext text not null,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vault_owner_idx on public.vault_items (owner_id);

alter table public.vault_items enable row level security;

create policy "vault_select_own"
  on public.vault_items for select
  using (auth.uid() = owner_id);

create policy "vault_insert_own"
  on public.vault_items for insert
  with check (auth.uid() = owner_id);

create policy "vault_update_own"
  on public.vault_items for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "vault_delete_own"
  on public.vault_items for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Status refresh: online < 45s, stale < 3m, else offline
-- ---------------------------------------------------------------------------
create or replace function public.refresh_device_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devices d
  set
    status = case
      when d.last_seen_at is null then 'offline'::public.device_status
      when d.last_seen_at > now() - interval '45 seconds' then 'online'::public.device_status
      when d.last_seen_at > now() - interval '3 minutes' then 'stale'::public.device_status
      else 'offline'::public.device_status
    end,
    updated_at = now()
  where d.status is distinct from case
    when d.last_seen_at is null then 'offline'::public.device_status
    when d.last_seen_at > now() - interval '45 seconds' then 'online'::public.device_status
    when d.last_seen_at > now() - interval '3 minutes' then 'stale'::public.device_status
    else 'offline'::public.device_status
  end;
end;
$$;

revoke all on function public.refresh_device_statuses() from public;
grant execute on function public.refresh_device_statuses() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime (ignore if already members)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.devices;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.alerts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.activity_events;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Owner bootstrap helper: first auth user becomes default enroll target
-- (API uses OWNER_USER_ID env; this view is informational)
-- ---------------------------------------------------------------------------
create or replace view public.owner_bootstrap
with (security_invoker = true)
as
  select id, display_name, created_at
  from public.profiles
  order by created_at asc
  limit 1;
