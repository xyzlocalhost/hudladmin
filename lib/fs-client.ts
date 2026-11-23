import type {
  FsListResult,
  FsReadResult,
  FsRootsResult,
  FsStageResult,
  FsWriteResult,
} from "@/lib/fs-types";
import { FS_MAX_DOWNLOAD_BYTES, FS_MAX_TRANSFER_BYTES } from "@/lib/fs-types";

export class FsClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function callFs<T>(
  deviceId: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`/api/devices/${deviceId}/fs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FsClientError(
      (data && (data.error as string)) || `FS request failed (${res.status})`,
      res.status,
    );
  }
  return data.result as T;
}

export function fsRoots(deviceId: string) {
  return callFs<FsRootsResult>(deviceId, { op: "roots" });
}

export function fsList(deviceId: string, path: string) {
  return callFs<FsListResult>(deviceId, { op: "list", path });
}

export function fsRead(deviceId: string, path: string) {
  return callFs<FsReadResult>(deviceId, { op: "read", path, waitMs: 55000 });
}

export function fsDownload(deviceId: string, path: string) {
  return callFs<FsStageResult>(deviceId, { op: "download", path, waitMs: 120000 });
}

export function fsWrite(
  deviceId: string,
  path: string,
  name: string,
  contentBase64: string,
) {
  return callFs<FsWriteResult>(deviceId, {
    op: "write",
    path,
    name,
    contentBase64,
    waitMs: 90000,
  });
}

export function fsMkdir(deviceId: string, path: string, name: string) {
  return callFs<{ path: string; name: string }>(deviceId, {
    op: "mkdir",
    path,
    name,
  });
}

export function fsDelete(deviceId: string, path: string) {
  return callFs<{ deleted: boolean }>(deviceId, { op: "delete", path });
}

export function fsCopy(deviceId: string, path: string, destPath: string, name?: string) {
  return callFs<{ path: string }>(deviceId, {
    op: "copy",
    path,
    destPath,
    ...(name ? { name } : {}),
  });
}

export function fsMove(deviceId: string, path: string, destPath: string, name?: string) {
  return callFs<{ path: string }>(deviceId, {
    op: "move",
    path,
    destPath,
    ...(name ? { name } : {}),
  });
}

export function joinWinPath(base: string, name: string): string {
  if (!base) return name;
  const trimmed = base.replace(/[\\/]+$/, "");
  return `${trimmed}\\${name}`;
}

export function parentWinPath(path: string): string | null {
  const normalized = path.replace(/[\\/]+$/, "");
  if (/^[A-Za-z]:$/i.test(normalized)) return null;
  if (/^[A-Za-z]:$/i.test(normalized.slice(0, -1)) && normalized.length <= 3) return null;
  const idx = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));
  if (idx <= 0) return null;
  const parent = normalized.slice(0, idx);
  if (/^[A-Za-z]:$/i.test(parent)) return `${parent}\\`;
  return parent || null;
}

export function pathCrumbs(path: string): { label: string; path: string }[] {
  const raw = path.replace(/\//g, "\\").replace(/\\+$/, "");
  if (!raw) return [];
  const m = raw.match(/^([A-Za-z]:)(.*)$/);
  if (!m) return [{ label: path, path }];
  const drive = m[1];
  const rest = m[2].replace(/^\\/, "");
  const crumbs: { label: string; path: string }[] = [
    { label: drive, path: `${drive}\\` },
  ];
  if (!rest) return crumbs;
  let acc = drive;
  for (const seg of rest.split("\\").filter(Boolean)) {
    acc = `${acc}\\${seg}`;
    crumbs.push({ label: seg, path: acc });
  }
  return crumbs;
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "text/plain": "txt",
  "application/pdf": "pdf",
};

/** Pick a Windows-safe filename for a clipboard/OS File. */
export function nameForLocalFile(file: File, index = 0): string {
  const raw = (file.name || "").trim();
  const looksGeneric =
    !raw
    || raw === "blob"
    || /^image\.(png|jpe?g|webp|gif)$/i.test(raw)
    || raw === "download";
  if (!looksGeneric) {
    return raw.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180);
  }
  const ext = MIME_EXT[file.type] || (raw.includes(".") ? raw.split(".").pop() : "bin") || "bin";
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "")
    .replace("T", "-");
  const suffix = index > 0 ? `-${index + 1}` : "";
  return `Pasted-${stamp}${suffix}.${ext}`;
}

/** Avoid colliding with names already in the folder listing. */
export function uniqueEntryName(wanted: string, existing: Iterable<string>): string {
  const taken = new Set([...existing].map((n) => n.toLowerCase()));
  if (!taken.has(wanted.toLowerCase())) return wanted;
  const dot = wanted.lastIndexOf(".");
  const hasExt = dot > 0 && dot < wanted.length - 1;
  const base = hasExt ? wanted.slice(0, dot) : wanted;
  const ext = hasExt ? wanted.slice(dot) : "";
  for (let i = 1; i < 1000; i++) {
    const next = `${base} (${i})${ext}`;
    if (!taken.has(next.toLowerCase())) return next;
  }
  return `${base}-${Date.now()}${ext}`;
}

/**
 * Files / images from a browser paste (Ctrl+V) or drop.
 * Screenshots often arrive as image/* items without a real filename.
 */
export function filesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const out: File[] = [];
  const seen = new Set<string>();

  const push = (file: File | null, index: number) => {
    if (!file || file.size <= 0) return;
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    const name = nameForLocalFile(file, index);
    out.push(name === file.name ? file : new File([file], name, { type: file.type }));
  };

  if (data.files?.length) {
    Array.from(data.files).forEach((f, i) => push(f, i));
  }

  if (out.length === 0 && data.items?.length) {
    let i = 0;
    for (const item of Array.from(data.items)) {
      if (item.kind !== "file") continue;
      push(item.getAsFile(), i++);
    }
  }

  return out;
}

/** Async Clipboard API (context-menu Paste when no paste event). */
export async function filesFromSystemClipboard(): Promise<File[]> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) return [];
  try {
    const items = await navigator.clipboard.read();
    const out: File[] = [];
    let i = 0;
    for (const item of items) {
      const type =
        item.types.find((t) => t.startsWith("image/"))
        || item.types.find((t) => t.startsWith("application/"))
        || item.types.find((t) => t !== "text/plain" && t !== "text/html")
        || null;
      if (!type || type === "text/plain" || type === "text/html") continue;
      try {
        const blob = await item.getType(type);
        if (!blob || blob.size <= 0) continue;
        const name = nameForLocalFile(new File([blob], "", { type: blob.type || type }), i++);
        out.push(new File([blob], name, { type: blob.type || type }));
      } catch {
        /* type not readable */
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size <= 0) {
      reject(new Error("File is empty (0 bytes)"));
      return;
    }
    if (file.size > FS_MAX_TRANSFER_BYTES) {
      reject(
        new Error(
          `Upload max is ${Math.floor(FS_MAX_TRANSFER_BYTES / (1024 * 1024))} MB for now`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      const b64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!b64) {
        reject(new Error("Could not read file contents"));
        return;
      }
      resolve(b64);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function downloadBase64(name: string, contentBase64: string) {
  const bin = atob(contentBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Progressive browser download via signed URL (Windows-style stream to disk). */
export function downloadFromUrl(name: string, url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export { FS_MAX_DOWNLOAD_BYTES, FS_MAX_TRANSFER_BYTES };
