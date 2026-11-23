# Hudl Front

Personal control center for securely reaching your own devices, with a vault for logins you save yourself. This is the dashboard front end (demo data only).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Structure

- `app/layout.tsx` - root layout, loads Poppins via next/font
- `app/globals.css` - all styling (warm graphite + gold theme)
- `app/page.tsx` - the dashboard (client component, demo data)

## Making it real

The three plug points are commented in `app/page.tsx`:

- `pairDevice` -> `POST /api/pair`, returns a one-time code from your desktop agent
- `openSession` -> starts a RustDesk session for the paired device
- `unlockVault` -> authenticates against your Vaultwarden backend

Recommended backing engines:

- Remote screen + control: self-hosted RustDesk relay + its desktop agent
- Credential vault: self-hosted Vaultwarden (never roll your own password crypto)
- Dashboard + API routes + auth: this Next.js app
