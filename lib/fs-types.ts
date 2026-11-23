export type FsEntryDto = {
  name: string;
  type: "dir" | "file";
  size?: number | null;
  sizeLabel?: string;
  /** ISO timestamp from the agent; UI formats as relative time. */
  modifiedAt?: string | null;
  /** @deprecated prefer modifiedAt */
  modified?: string;
};

export type FsShortcut = {
  label: string;
  path: string;
};

export type FsRootsResult = {
  drives: string[];
  shortcuts: FsShortcut[];
  home?: string;
};

export type FsListResult = {
  path: string;
  entries: FsEntryDto[];
};

export type FsReadResult = {
  path: string;
  name: string;
  size: number;
  contentBase64: string;
};

export type FsWriteResult = {
  path: string;
  name: string;
  size: number;
};

export type FsStageResult = {
  path: string;
  name: string;
  size: number;
  storagePath: string;
  downloadUrl?: string;
};

export type FsCommandKind =
  | "fs.roots"
  | "fs.list"
  | "fs.read"
  | "fs.write"
  | "fs.stage"
  | "fs.mkdir"
  | "fs.delete"
  | "fs.copy"
  | "fs.move";

/** Soft cap for in-app open / base64 preview. */
export const FS_MAX_TRANSFER_BYTES = 32 * 1024 * 1024;

/** Cap for staged downloads (binary → Storage → signed URL). */
export const FS_MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;
