import type {
  FsListResult,
  FsReadResult,
  FsRootsResult,
  FsWriteResult,
} from "@/lib/fs-types";

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
  return callFs<FsReadResult>(deviceId, { op: "read", path, waitMs: 45000 });
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
    waitMs: 45000,
  });
}

export function joinWinPath(base: string, name: string): string {
  if (!base) return name;
  const trimmed = base.replace(/[\\/]+$/, "");
  return `${trimmed}\\${name}`;
}

export function parentWinPath(path: string): string | null {
  const normalized = path.replace(/[\\/]+$/, "");
  // Drive root "C:" or "C:\"
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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
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
