import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentDevice, isNextResponse } from "@/lib/agent-device";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { offloadResultContent } from "@/lib/transfer-store";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  ok?: boolean;
  result?: Record<string, unknown> | null;
  error?: string | null;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const auth = await authenticateAgentDevice(req);
    if (isNextResponse(auth)) return auth;

    const { id } = await ctx.params;
    const body = (await req.json()) as Body;
    const now = new Date().toISOString();
    const ok = body.ok !== false && !body.error;

    const { data: row, error: findErr } = await auth.admin
      .from("device_commands")
      .select("id, device_id, status")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!row || row.device_id !== auth.deviceId) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }
    if (row.status !== "running" && row.status !== "queued") {
      return NextResponse.json({ error: `Command already ${row.status}` }, { status: 409 });
    }

    let result: Record<string, unknown> | null = ok ? (body.result ?? {}) : null;
    if (ok && result && typeof result.contentBase64 === "string") {
      try {
        result = await offloadResultContent(auth.admin, auth.deviceId, id, result);
      } catch (offloadErr) {
        const msg = offloadErr instanceof Error ? offloadErr.message : "Transfer storage failed";
        console.error("[commands/complete] offload", offloadErr);
        const { error: failErr } = await auth.admin
          .from("device_commands")
          .update({
            status: "error",
            result: null,
            error: msg,
            completed_at: now,
            updated_at: now,
          })
          .eq("id", id);
        if (failErr) console.error("[commands/complete] mark error", failErr);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    const { error: upErr } = await auth.admin
      .from("device_commands")
      .update({
        status: ok ? "done" : "error",
        result: ok ? result : null,
        error: ok ? null : (body.error || "Command failed"),
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (upErr) {
      console.error("[commands/complete] update", upErr);
      throw new Error(upErr.message || "Complete failed");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Complete failed";
    console.error("[commands/complete]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
