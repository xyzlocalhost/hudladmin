import { NextRequest, NextResponse } from "next/server";
import type { FsCommandKind } from "@/lib/fs-types";
import { FS_MAX_TRANSFER_BYTES } from "@/lib/fs-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createTransferSignedUrl,
  hydrateResultContent,
  purgeCommandTransfers,
  transferObjectPath,
  uploadTransferBytes,
} from "@/lib/transfer-store";

export const runtime = "nodejs";
export const maxDuration = 120;

type Op =
  | "roots"
  | "list"
  | "read"
  | "write"
  | "download"
  | "mkdir"
  | "delete"
  | "copy"
  | "move";

type Body = {
  op: Op;
  path?: string;
  name?: string;
  destPath?: string;
  contentBase64?: string;
  waitMs?: number;
};

const KIND: Record<Op, FsCommandKind> = {
  roots: "fs.roots",
  list: "fs.list",
  read: "fs.read",
  write: "fs.write",
  download: "fs.stage",
  mkdir: "fs.mkdir",
  delete: "fs.delete",
  copy: "fs.copy",
  move: "fs.move",
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

    const needsPath = ["list", "read", "download", "delete", "copy", "move", "write", "mkdir"].includes(body.op);
    if (needsPath && !body.path?.trim()) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }
    if ((body.op === "mkdir" || body.op === "write") && !body.name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    if ((body.op === "copy" || body.op === "move") && !body.destPath?.trim()) {
      return NextResponse.json({ error: "destPath required" }, { status: 400 });
    }
    if (body.op === "write") {
      if (!body.contentBase64) {
        return NextResponse.json({ error: "contentBase64 required" }, { status: 400 });
      }
      const approx = Math.floor((body.contentBase64.length * 3) / 4);
      if (approx <= 0) {
        return NextResponse.json({ error: "Upload is empty (0 bytes)" }, { status: 400 });
      }
      if (approx > FS_MAX_TRANSFER_BYTES) {
        return NextResponse.json(
          { error: `Upload too large for this path (max ${Math.floor(FS_MAX_TRANSFER_BYTES / (1024 * 1024))} MB). Try a smaller file for now.` },
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
    if (body.destPath) payload.destPath = body.destPath.trim();

    const admin = createAdminClient();

    // Writes: prepare storage BEFORE queueing so the agent never sees an empty payload.
    const initialStatus = body.op === "write" ? "preparing" : "queued";

    const { data: cmd, error: insErr } = await admin
      .from("device_commands")
      .insert({
        device_id: deviceId,
        owner_id: user.id,
        kind,
        payload,
        status: initialStatus,
      })
      .select("id")
      .single();

    if (insErr) {
      const msg = insErr.message || "";
      if (/device_commands_kind_check|violates check constraint/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Database is missing newer file commands (fs.mkdir etc). Apply migration 20260323160000_fs_ops_and_preparing, then restart the Hudl agent.",
          },
          { status: 500 },
        );
      }
      if (/device_commands_status_check/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Database is missing the preparing status. Apply migration 20260323160000_fs_ops_and_preparing.",
          },
          { status: 500 },
        );
      }
      throw insErr;
    }

    if (body.op === "write" && body.contentBase64 && body.name) {
      try {
        const bytes = Buffer.from(body.contentBase64, "base64");
        if (bytes.length === 0) {
          await admin.from("device_commands").delete().eq("id", cmd.id);
          return NextResponse.json({ error: "Upload is empty (0 bytes)" }, { status: 400 });
        }
        const objectPath = transferObjectPath(deviceId, cmd.id, body.name.trim());
        await uploadTransferBytes(admin, objectPath, bytes);
        const { error: payErr } = await admin
          .from("device_commands")
          .update({
            payload: {
              ...payload,
              name: body.name.trim(),
              storagePath: objectPath,
              size: bytes.length,
            },
            status: "queued",
            updated_at: new Date().toISOString(),
          })
          .eq("id", cmd.id);
        if (payErr) throw payErr;
      } catch (err) {
        await purgeCommandTransfers(admin, payload, null);
        await admin.from("device_commands").delete().eq("id", cmd.id);
        throw err;
      }
    }

    const waitMs = Math.min(
      Math.max(Number(body.waitMs) || (body.op === "download" ? 90000 : 25000), 3000),
      120000,
    );
    const deadline = Date.now() + waitMs;

    while (Date.now() < deadline) {
      const { data: row, error } = await admin
        .from("device_commands")
        .select("id, status, result, error, payload")
        .eq("id", cmd.id)
        .single();

      if (error) throw error;

      if (row.status === "done") {
        const activityTitle =
          body.op === "read"
            ? "Opened file"
            : body.op === "download"
              ? "Downloaded file"
              : body.op === "write"
                ? "Uploaded file"
                : body.op === "mkdir"
                  ? "Created folder"
                  : body.op === "delete"
                    ? "Deleted"
                    : body.op === "copy"
                      ? "Copied"
                      : body.op === "move"
                        ? "Moved"
                        : null;

        if (activityTitle) {
          await admin.from("activity_events").insert({
            owner_id: user.id,
            device_id: deviceId,
            kind: "files",
            title: activityTitle,
            detail:
              body.op === "write"
                ? `${body.name} → ${body.path}`
                : body.op === "copy" || body.op === "move"
                  ? `${body.path} → ${body.destPath}`
                  : String(body.path ?? body.name ?? ""),
          });
        }

        let result = row.result as Record<string, unknown> | null;

        if (body.op === "download") {
          const storagePath =
            result && typeof result.storagePath === "string" ? result.storagePath : "";
          if (!storagePath) {
            return NextResponse.json(
              { id: row.id, status: "error", error: "Download staging missing storage path" },
              { status: 502 },
            );
          }
          const downloadUrl = await createTransferSignedUrl(admin, storagePath, 900);
          // Keep object until TTL/GC so the browser can stream it.
          return NextResponse.json({
            id: row.id,
            status: "done",
            result: {
              ...(result || {}),
              downloadUrl,
              name: result?.name || body.path?.split(/[/\\]/).pop(),
              size: result?.size,
            },
          });
        }

        try {
          if (body.op === "read") {
            result = (await hydrateResultContent(admin, result, { deleteAfter: true })) ?? result;
            if (result && "storagePath" in result) {
              const slim = { ...result };
              delete slim.storagePath;
              await admin
                .from("device_commands")
                .update({ result: slim, updated_at: new Date().toISOString() })
                .eq("id", cmd.id);
              result = slim;
            }
          } else if (body.op === "write") {
            await purgeCommandTransfers(
              admin,
              (row.payload as Record<string, unknown> | null) ?? null,
              null,
            );
          }
        } catch (hydrateErr) {
          console.error("[devices/fs] hydrate", hydrateErr);
          await purgeCommandTransfers(
            admin,
            (row.payload as Record<string, unknown> | null) ?? null,
            (row.result as Record<string, unknown> | null) ?? null,
          );
          return NextResponse.json(
            {
              id: row.id,
              status: "error",
              error: hydrateErr instanceof Error ? hydrateErr.message : "Could not load file bytes",
            },
            { status: 502 },
          );
        }

        return NextResponse.json({ id: row.id, status: "done", result });
      }

      if (row.status === "error" || row.status === "expired") {
        await purgeCommandTransfers(
          admin,
          (row.payload as Record<string, unknown> | null) ?? null,
          (row.result as Record<string, unknown> | null) ?? null,
        );
        return NextResponse.json(
          { id: row.id, status: row.status, error: row.error || "Command failed" },
          { status: 502 },
        );
      }

      await sleep(400);
    }

    const { data: timedOut } = await admin
      .from("device_commands")
      .select("payload, result")
      .eq("id", cmd.id)
      .maybeSingle();

    await admin
      .from("device_commands")
      .update({ status: "expired", error: "Timed out waiting for agent", updated_at: new Date().toISOString() })
      .eq("id", cmd.id)
      .in("status", ["preparing", "queued", "running"]);

    await purgeCommandTransfers(
      admin,
      (timedOut?.payload as Record<string, unknown> | null) ?? null,
      (timedOut?.result as Record<string, unknown> | null) ?? null,
    );

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
