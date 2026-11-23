import { NextRequest, NextResponse } from "next/server";
import type { FsCommandKind } from "@/lib/fs-types";
import { FS_MAX_TRANSFER_BYTES } from "@/lib/fs-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  op: "roots" | "list" | "read" | "write";
  path?: string;
  name?: string;
  contentBase64?: string;
  waitMs?: number;
};

const KIND: Record<Body["op"], FsCommandKind> = {
  roots: "fs.roots",
  list: "fs.list",
  read: "fs.read",
  write: "fs.write",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const { deviceId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    if (!body?.op || !(body.op in KIND)) {
      return NextResponse.json({ error: "Invalid op" }, { status: 400 });
    }

    if ((body.op === "list" || body.op === "read") && !body.path?.trim()) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }
    if (body.op === "write") {
      if (!body.path?.trim() || !body.name?.trim() || !body.contentBase64) {
        return NextResponse.json({ error: "path, name, and contentBase64 required" }, { status: 400 });
      }
      const approx = Math.floor((body.contentBase64.length * 3) / 4);
      if (approx > FS_MAX_TRANSFER_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${FS_MAX_TRANSFER_BYTES} bytes)` },
          { status: 413 },
        );
      }
    }

    const { data: device, error: devErr } = await supabase
      .from("devices")
      .select("id, owner_id, status, name")
      .eq("id", deviceId)
      .maybeSingle();

    if (devErr) throw devErr;
    if (!device || device.owner_id !== user.id) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    if (device.status === "offline") {
      return NextResponse.json(
        { error: `${device.name} is offline. Start the Hudl agent on that laptop.` },
        { status: 409 },
      );
    }

    const kind = KIND[body.op];
    const payload: Record<string, unknown> = {};
    if (body.path) payload.path = body.path.trim();
    if (body.name) payload.name = body.name.trim();
    if (body.contentBase64) payload.contentBase64 = body.contentBase64;

    const { data: cmd, error: insErr } = await supabase
      .from("device_commands")
      .insert({
        device_id: deviceId,
        owner_id: user.id,
        kind,
        payload,
        status: "queued",
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    const waitMs = Math.min(Math.max(Number(body.waitMs) || 25000, 3000), 55000);
    const deadline = Date.now() + waitMs;
    const admin = createAdminClient();

    while (Date.now() < deadline) {
      const { data: row, error } = await admin
        .from("device_commands")
        .select("id, status, result, error")
        .eq("id", cmd.id)
        .single();

      if (error) throw error;

      if (row.status === "done") {
        if (body.op === "read" || body.op === "write") {
          await admin.from("activity_events").insert({
            owner_id: user.id,
            device_id: deviceId,
            kind: "files",
            title: body.op === "read" ? "Downloaded file" : "Uploaded file",
            detail:
              body.op === "write"
                ? `${body.name} → ${body.path}`
                : String(body.path ?? ""),
          });
        }
        return NextResponse.json({ id: row.id, status: "done", result: row.result });
      }

      if (row.status === "error" || row.status === "expired") {
        return NextResponse.json(
          { id: row.id, status: row.status, error: row.error || "Command failed" },
          { status: 502 },
        );
      }

      await sleep(400);
    }

    await admin
      .from("device_commands")
      .update({ status: "expired", error: "Timed out waiting for agent", updated_at: new Date().toISOString() })
      .eq("id", cmd.id)
      .in("status", ["queued", "running"]);

    return NextResponse.json(
      {
        id: cmd.id,
        status: "expired",
        error: "Agent did not pick up the command in time. Is the agent running?",
      },
      { status: 504 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "FS command failed";
    console.error("[devices/fs]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
