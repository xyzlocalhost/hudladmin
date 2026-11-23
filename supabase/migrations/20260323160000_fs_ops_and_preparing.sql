-- Expand file-command kinds + preparing status (upload bytes before agent can claim).

alter table public.device_commands
  drop constraint if exists device_commands_kind_check;

alter table public.device_commands
  drop constraint if exists device_commands_status_check;

alter table public.device_commands
  add constraint device_commands_kind_check
  check (kind in (
    'fs.roots', 'fs.list', 'fs.read', 'fs.write', 'fs.stage',
    'fs.mkdir', 'fs.delete', 'fs.copy', 'fs.move'
  ));

alter table public.device_commands
  add constraint device_commands_status_check
  check (status in ('preparing', 'queued', 'running', 'done', 'error', 'expired'));

-- Allow larger staged downloads in the ephemeral transfers bucket.
update storage.buckets
set file_size_limit = 536870912
where id = 'device-transfers';
