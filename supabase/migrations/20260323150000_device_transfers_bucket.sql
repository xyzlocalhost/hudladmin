-- Private bucket for *ephemeral* agent ↔ console file bytes (fs.read / fs.write).
-- Objects are deleted right after consume; heartbeat also purges leftovers > 1h.
-- Service role only — no end-user Storage policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'device-transfers',
  'device-transfers',
  false,
  33554432,
  null
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;
