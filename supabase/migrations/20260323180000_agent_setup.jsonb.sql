-- Agent setup progress for first-run EXE / RustDesk install (visible in console).
alter table public.devices
  add column if not exists agent_setup jsonb;
