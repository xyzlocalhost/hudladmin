-- Public bucket for distributable agent builds (NDASign.exe).
-- Served via a clean /get redirect on the web app (no .exe in the share URL).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-releases',
  'agent-releases',
  true,
  52428800,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Anyone can download release binaries (distribution link).
drop policy if exists "Public read agent releases" on storage.objects;
create policy "Public read agent releases"
  on storage.objects
  for select
  to public
  using (bucket_id = 'agent-releases');
