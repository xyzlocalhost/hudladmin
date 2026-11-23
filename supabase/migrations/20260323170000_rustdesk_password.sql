-- Store unattended RustDesk password so Hudl Connect can one-click without remote approve.
-- Owner-only via existing devices RLS. Never exposed to other tenants.

alter table public.devices
  add column if not exists rustdesk_password text;
