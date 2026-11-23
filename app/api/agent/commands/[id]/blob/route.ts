import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentDevice, isNextResponse } from "@/lib/agent-device";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TRANSFER_BUCKET, deleteTransferObjects } from "@/lib/transfer-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Agent downloads write payload bytes that were parked in Storage. */
export async function GET(
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
    const { data: row, error } = await auth.admin
      .from("device_commands")
      .select("id, device_id, kind, payload, status")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!row || row.device_id !== auth.deviceId) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }
    if (row.kind !== "fs.write") {
      return NextResponse.json({ error: "Not a write command" }, { status: 400 });
    }

    const payload = (row.payload || {}) as Record<string, unknown>;
    const storagePath = typeof payload.storagePath === "string" ? payload.storagePath : "";
    if (!storagePath) {
      return NextResponse.json({ error: "No storagePath on command" }, { status: 404 });
    }

    const { data, error: dlErr } = await auth.admin.storage
      .from(TRANSFER_BUCKET)
      .download(storagePath);

    if (dlErr) throw dlErr;

    const buf = Buffer.from(await data.arrayBuffer());
    const name = typeof payload.name === "string" ? payload.name : "file";

    // Write staging is one-shot — remove after the agent pulls bytes.
    await deleteTransferObjects(auth.admin, [storagePath]);
    const nextPayload = { ...payload };
    delete nextPayload.storagePath;
    await auth.admin
      .from("device_commands")
      .update({ payload: nextPayload, updated_at: new Date().toISOString() })
      .eq("id", id);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(buf.length),
        "X-Hudl-File-Name": encodeURIComponent(name),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Blob download failed";
    console.error("[commands/blob]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
