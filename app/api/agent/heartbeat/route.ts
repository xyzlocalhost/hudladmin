import { NextRequest, NextResponse } from "next/server";
import { hashToken, safeEqual } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { purgeStaleTransfers } from "@/lib/transfer-store";

export const runtime = "nodejs";

type Body = {
  cpu?: number | null;
  ram_used_gb?: number | null;
  ram_total_gb?: number | null;
  battery?: number | null;
  uptime_seconds?: number | null;
  ping_ms?: number | null;
  lan_ip?: string | null;
  os?: string | null;
  agent_version?: string | null;
  rustdesk_id?: string | null;
  name?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const deviceId = req.headers.get("x-hudl-device-id") ?? "";
    const token = req.headers.get("x-hudl-device-token") ?? "";
    if (!deviceId || !token) {
      return NextResponse.json({ error: "Missing device credentials" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: tokRow, error: tokErr } = await admin
      .from("device_tokens")
      .select("token_hash, device_id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (tokErr) throw tokErr;
    if (!tokRow?.token_hash || !safeEqual(tokRow.token_hash, hashToken(token))) {
      return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const now = new Date().toISOString();

    const { data: before } = await admin
      .from("devices")
      .select("status, battery, owner_id, name")
      .eq("id", deviceId)
      .single();

    const patch: Record<string, unknown> = {
      status: "online",
      last_seen_at: now,
      updated_at: now,
      cpu: body.cpu ?? null,
      ram_used_gb: body.ram_used_gb ?? null,
      ram_total_gb: body.ram_total_gb ?? null,
      battery: body.battery ?? null,
      uptime_seconds: body.uptime_seconds ?? null,
      ping_ms: body.ping_ms ?? null,
      lan_ip: body.lan_ip ?? null,
    };
    if (body.os) patch.os = body.os;
    if (body.agent_version) patch.agent_version = body.agent_version;
    if (body.rustdesk_id) patch.rustdesk_id = body.rustdesk_id;
    if (body.name) patch.name = body.name;

    const { error: upErr } = await admin.from("devices").update(patch).eq("id", deviceId);

    if (upErr) throw upErr;

    await admin
      .from("device_tokens")
      .update({ last_used_at: now })
      .eq("device_id", deviceId);

    await admin.rpc("refresh_device_statuses");

    if (before?.owner_id) {
      if (before.status === "offline" || before.status === "stale") {
        await admin.from("alerts").insert({
          owner_id: before.owner_id,
          device_id: deviceId,
          kind: "online",
          title: `${before.name} is back`,
          body: "Agent checked in again and is reachable.",
          unread: true,
        });
        await admin.from("activity_events").insert({
          owner_id: before.owner_id,
          device_id: deviceId,
          kind: "agent",
          title: "Agent check-in",
          detail: "Device returned online",
        });
      }

      if (
        body.battery != null &&
        body.battery <= 20 &&
        (before.battery == null || before.battery > 20)
      ) {
        await admin.from("alerts").insert({
          owner_id: before.owner_id,
          device_id: deviceId,
          kind: "battery",
          title: `Low battery on ${before.name}`,
          body: `${body.battery}% reported. Plug in if you need it reachable.`,
          unread: true,
        });
      }
    }

    // Opportunistic GC so failed/abandoned transfers don't fill the bucket.
    if (Math.random() < 0.15) {
      void purgeStaleTransfers(admin).catch((err) =>
        console.warn("[heartbeat] transfer purge", err),
      );
    }

    return NextResponse.json({ ok: true, at: now });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Heartbeat failed";
    console.error("[heartbeat]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
