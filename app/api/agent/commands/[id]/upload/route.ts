import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentDevice, isNextResponse } from "@/lib/agent-device";
import { FS_MAX_DOWNLOAD_BYTES } from "@/lib/fs-types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { transferObjectPath, uploadTransferBytes } from "@/lib/transfer-store";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Agent streams raw file bytes for fs.stage (large downloads).
 * Avoids base64-in-JSON which blows up for big media.
 */
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
    const { data: row, error } = await auth.admin
      .from("device_commands")
      .select("id, device_id, kind, status")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!row || row.device_id !== auth.deviceId) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }
    if (row.kind !== "fs.stage" && row.kind !== "fs.read") {
      return NextResponse.json({ error: "Not a stageable command" }, { status: 400 });
    }
    if (row.status !== "running" && row.status !== "queued") {
      return NextResponse.json({ error: `Command already ${row.status}` }, { status: 409 });
    }

    const lenHeader = req.headers.get("content-length");
    const contentLength = lenHeader ? Number(lenHeader) : NaN;
    if (Number.isFinite(contentLength) && contentLength > FS_MAX_DOWNLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${FS_MAX_DOWNLOAD_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const fileName = decodeURIComponent(req.headers.get("x-hudl-file-name") || "file");
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json({ error: "Empty upload body" }, { status: 400 });
    }
    if (buf.length > FS_MAX_DOWNLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${FS_MAX_DOWNLOAD_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const objectPath = transferObjectPath(auth.deviceId, id, fileName);
    await uploadTransferBytes(auth.admin, objectPath, buf);

    return NextResponse.json({
      ok: true,
      storagePath: objectPath,
      size: buf.length,
      name: fileName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[commands/upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
