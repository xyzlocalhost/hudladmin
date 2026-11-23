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

export type FsCommandKind = "fs.roots" | "fs.list" | "fs.read" | "fs.write";

/** Soft cap for open/upload over the command queue (base64). Media previews need headroom. */
export const FS_MAX_TRANSFER_BYTES = 32 * 1024 * 1024;
