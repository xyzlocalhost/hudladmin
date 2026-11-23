import type { SupabaseClient } from "@supabase/supabase-js";
import { FS_MAX_DOWNLOAD_BYTES, FS_MAX_TRANSFER_BYTES } from "@/lib/fs-types";

export const TRANSFER_BUCKET = "device-transfers";

/** Transfers are ephemeral staging — delete after consume / on failure. */
export const TRANSFER_TTL_MS = 60 * 60 * 1000; // 1 hour safety net

/** Ensure the private transfer bucket exists (idempotent). */
export async function ensureTransferBucket(admin: SupabaseClient) {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;
  if (buckets?.some((b) => b.id === TRANSFER_BUCKET || b.name === TRANSFER_BUCKET)) {
    return;
  }
  const { error: createErr } = await admin.storage.createBucket(TRANSFER_BUCKET, {
    public: false,
    fileSizeLimit: FS_MAX_DOWNLOAD_BYTES,
  });
  // Race: another process may have created it.
  if (createErr && !/already exists|duplicate/i.test(createErr.message)) {
    throw createErr;
  }
}

export async function createTransferSignedUrl(
  admin: SupabaseClient,
  objectPath: string,
  expiresIn = 900,
) {
  const { data, error } = await admin.storage
    .from(TRANSFER_BUCKET)
    .createSignedUrl(objectPath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export function transferObjectPath(deviceId: string, commandId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "file";
  return `${deviceId}/${commandId}/${safe}`;
}

export async function uploadTransferBytes(
  admin: SupabaseClient,
  objectPath: string,
  bytes: Buffer,
  contentType = "application/octet-stream",
) {
  await ensureTransferBucket(admin);
  const { error } = await admin.storage.from(TRANSFER_BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return objectPath;
}

export async function downloadTransferBase64(admin: SupabaseClient, objectPath: string) {
  const { data, error } = await admin.storage.from(TRANSFER_BUCKET).download(objectPath);
  if (error) throw error;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.toString("base64");
}

export async function deleteTransferObjects(admin: SupabaseClient, objectPaths: string[]) {
  const paths = [...new Set(objectPaths.filter((p) => typeof p === "string" && p.length > 0))];
  if (!paths.length) return;
  const { error } = await admin.storage.from(TRANSFER_BUCKET).remove(paths);
  if (error) {
    console.warn("[transfer] delete failed", paths, error.message);
  }
}

export function collectTransferPaths(
  ...blobs: Array<Record<string, unknown> | null | undefined>
): string[] {
  const out: string[] = [];
  for (const blob of blobs) {
    if (!blob || typeof blob !== "object") continue;
    const p = blob.storagePath;
    if (typeof p === "string" && p) out.push(p);
  }
  return out;
}

/** Delete staged objects for a command (payload and/or result). Best-effort. */
export async function purgeCommandTransfers(
  admin: SupabaseClient,
  payload?: Record<string, unknown> | null,
  result?: Record<string, unknown> | null,
) {
  await deleteTransferObjects(admin, collectTransferPaths(payload, result));
}

/**
 * If result carries contentBase64, park bytes in Storage and return a slim result.
 * Keeps device_commands.result small enough for PostgREST.
 */
export async function offloadResultContent(
  admin: SupabaseClient,
  deviceId: string,
  commandId: string,
  result: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const b64 = result.contentBase64;
  if (typeof b64 !== "string" || !b64) return result;

  const name = typeof result.name === "string" ? result.name : "file";
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > FS_MAX_TRANSFER_BYTES) {
    throw new Error(`File too large (max ${FS_MAX_TRANSFER_BYTES} bytes)`);
  }

  const objectPath = transferObjectPath(deviceId, commandId, name);
  await uploadTransferBytes(admin, objectPath, bytes);

  const { contentBase64: _drop, ...rest } = result;
  return { ...rest, storagePath: objectPath, size: bytes.length };
}

/**
 * Re-attach contentBase64 from Storage when the console needs it.
 * Deletes the staged object afterward so the bucket does not grow.
 */
export async function hydrateResultContent(
  admin: SupabaseClient,
  result: Record<string, unknown> | null | undefined,
  opts?: { deleteAfter?: boolean },
): Promise<Record<string, unknown> | null | undefined> {
  if (!result || typeof result !== "object") return result;
  if (typeof result.contentBase64 === "string") return result;
  const storagePath = result.storagePath;
  if (typeof storagePath !== "string" || !storagePath) return result;
  const contentBase64 = await downloadTransferBase64(admin, storagePath);
  if (opts?.deleteAfter !== false) {
    await deleteTransferObjects(admin, [storagePath]);
  }
  const { storagePath: _drop, ...rest } = result;
  return { ...rest, contentBase64 };
}

/**
 * Safety net: remove staged objects for finished commands older than TTL.
 * Called opportunistically from agent heartbeats.
 */
export async function purgeStaleTransfers(admin: SupabaseClient, limit = 40) {
  const cutoff = new Date(Date.now() - TRANSFER_TTL_MS).toISOString();
  const { data, error } = await admin
    .from("device_commands")
    .select("id, payload, result")
    .in("status", ["done", "error", "expired"])
    .lt("updated_at", cutoff)
    .or("payload->>storagePath.not.is.null,result->>storagePath.not.is.null")
    .limit(limit);

  if (error) {
    console.warn("[transfer] stale query", error.message);
    return;
  }
  if (!data?.length) return;

  const paths: string[] = [];
  for (const row of data) {
    paths.push(
      ...collectTransferPaths(
        row.payload as Record<string, unknown> | null,
        row.result as Record<string, unknown> | null,
      ),
    );
  }
  await deleteTransferObjects(admin, paths);

  // Clear path pointers so we don't re-delete forever.
  for (const row of data) {
    const payload = { ...(row.payload as Record<string, unknown> | null) };
    const result = { ...(row.result as Record<string, unknown> | null) };
    let changed = false;
    if (payload && "storagePath" in payload) {
      delete payload.storagePath;
      changed = true;
    }
    if (result && "storagePath" in result) {
      delete result.storagePath;
      changed = true;
    }
    if (!changed) continue;
    await admin
      .from("device_commands")
      .update({
        payload: Object.keys(payload).length ? payload : {},
        result: Object.keys(result).length ? result : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }
}
