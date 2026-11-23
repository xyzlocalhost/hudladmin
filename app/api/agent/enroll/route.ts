import { NextRequest, NextResponse } from "next/server";
import { hashToken, newDeviceToken, safeEqual } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

type Body = {
  hostname?: string;
  name?: string;
  os?: string;
  agent_version?: string;
  lan_ip?: string | null;
};

async function resolveOwnerId(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const envOwner = process.env.HUDL_OWNER_USER_ID;
  if (envOwner) return envOwner;

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error(
      "No owner profile yet. Sign up once in the web app, or set HUDL_OWNER_USER_ID.",
    );
  }
  return data.id;
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const secret = process.env.AGENT_ENROLL_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "AGENT_ENROLL_SECRET not set" }, { status: 503 });
    }

    const provided = req.headers.get("x-hudl-enroll-secret") ?? "";
    if (!safeEqual(provided, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const hostname = (body.hostname ?? "").trim();
    if (!hostname) {
      return NextResponse.json({ error: "hostname required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const ownerId = await resolveOwnerId(admin);
    const token = newDeviceToken();
    const tokenHash = hashToken(token);
    const name = (body.name ?? hostname).trim() || hostname;

    const { data: existing } = await admin
      .from("devices")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("hostname", hostname)
      .maybeSingle();

    let deviceId: string;

    if (existing?.id) {
      deviceId = existing.id;
      const { error: upErr } = await admin
        .from("devices")
        .update({
          name,
          os: body.os ?? null,
          agent_version: body.agent_version ?? null,
          lan_ip: body.lan_ip ?? null,
          status: "online",
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", deviceId);
      if (upErr) throw upErr;

      const { error: tokErr } = await admin.from("device_tokens").upsert({
        device_id: deviceId,
        token_hash: tokenHash,
        last_used_at: new Date().toISOString(),
      });
      if (tokErr) throw tokErr;
    } else {
      const { data: created, error: insErr } = await admin
        .from("devices")
        .insert({
          owner_id: ownerId,
          name,
          hostname,
          os: body.os ?? null,
          agent_version: body.agent_version ?? null,
          lan_ip: body.lan_ip ?? null,
          status: "online",
          last_seen_at: new Date().toISOString(),
          role: "Fleet device",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      deviceId = created.id;

      const { error: tokErr } = await admin.from("device_tokens").insert({
        device_id: deviceId,
        token_hash: tokenHash,
        last_used_at: new Date().toISOString(),
      });
      if (tokErr) throw tokErr;

      await admin.from("activity_events").insert({
        owner_id: ownerId,
        device_id: deviceId,
        kind: "agent",
        title: "Device enrolled",
        detail: `${hostname} first check-in`,
      });

      await admin.from("alerts").insert({
        owner_id: ownerId,
        device_id: deviceId,
        kind: "online",
        title: `${name} enrolled`,
        body: "Agent checked in automatically after install. No pairing step.",
        unread: true,
      });
    }

    return NextResponse.json({ device_id: deviceId, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enroll failed";
    console.error("[enroll]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
