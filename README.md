# Hudl web

Personal fleet console. Live device heartbeats via Supabase; remote control via RustDesk (Phase 2).

## Setup

1. Create a Supabase project.
2. Apply SQL migrations in [`supabase/migrations/`](supabase/migrations/) (core + `device_commands` for file explorer). SQL editor or `supabase db push` after `supabase link`.
3. Copy [`.env.example`](.env.example) → `.env.local` and fill **publishable** + **secret** keys (not legacy anon/service_role).
4. Enable Email auth in Supabase (disable confirm email for fastest local setup if you want).
5. Install and run:

```bash
yarn
yarn dev
```

6. Create the owner user in Supabase Auth (Dashboard → Authentication → Users), then sign in on `/login`.
7. Note your user UUID if you want `HUDL_OWNER_USER_ID`.

Without Supabase env vars the UI runs on **mock fleet** data (no login gate).

## Agent API

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/agent/enroll` | header `x-hudl-enroll-secret: $AGENT_ENROLL_SECRET` |
| POST | `/api/agent/heartbeat` | headers `x-hudl-device-id`, `x-hudl-device-token` |
| POST | `/api/agent/commands/poll` | device headers — agent claims queued FS commands |
| POST | `/api/agent/commands/:id/complete` | device headers — agent posts result |
| POST | `/api/devices/:id/fs` | owner session — `roots` / `list` / `read` / `write` (waits for agent) |

Remote **Files** in a session uses the command queue (agent polls every ~2s). Built-in openers: Notepad, images, PDF, **WebM/MP4 video**, audio. **Open/preview ≤32 MB**; **Download ≤512 MB** via binary stage + signed URL (browser streams to disk). Also: new folder, delete, copy/cut/paste (right‑click). Staging bucket `device-transfers` is ephemeral (delete-after-use + 1h sweep).

See [`../client/README.md`](../client/README.md) for the Windows Python agent.

## Remote Connect (in browser)

1. On each laptop (Admin once): `cd client; .\run.ps1` — one command for RustDesk + agent.
2. Apply migration `20260323170000_rustdesk_password.sql`.
3. Open AWS SG inbound: `8080/tcp`, `21118/tcp`, `21119/tcp` (plus existing 21115–21117).
4. In Hudl session, **Connect** embeds the Ferry web viewer (`NEXT_PUBLIC_RUSTDESK_WEB_URL`, default `http://16.16.254.57:8080`) — no second app on your phone/PC.
