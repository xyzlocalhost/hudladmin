import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentDevice, isNextResponse } from "@/lib/agent-device";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

/** Agent claims up to N queued commands for this device. */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const auth = await authenticateAgentDevice(req);
    if (isNextResponse(auth)) return auth;

    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 10);
    const now = new Date().toISOString();

    const { data: queued, error: qErr } = await auth.admin
      .from("device_commands")
      .select("id, kind, payload, created_at")
      .eq("device_id", auth.deviceId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (qErr) throw qErr;
    if (!queued?.length) {
      return NextResponse.json({ commands: [] });
    }

    const ids = queued.map((c) => c.id);
    const { error: upErr } = await auth.admin
      .from("device_commands")
      .update({ status: "running", claimed_at: now, updated_at: now })
      .in("id", ids)
      .eq("status", "queued");

    if (upErr) throw upErr;

    return NextResponse.json({ commands: queued });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Poll failed";
    console.error("[commands/poll]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
