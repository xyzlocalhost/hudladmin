"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { FileToolHost, OpenWithDialog, type OpenedFile } from "@/components/console/file-tool-host";
import { Ic } from "@/components/ui/icons";
import { defaultToolForFile, type FileToolId } from "@/lib/file-tools";
import { formatAgo } from "@/lib/format";
import {
  downloadBase64,
  downloadFromUrl,
  fileToBase64,
  filesFromDataTransfer,
  filesFromSystemClipboard,
  fsCopy,
  fsDelete,
  fsDownload,
  fsList,
  fsMkdir,
  fsMove,
  fsRead,
  fsRoots,
  fsWrite,
  FsClientError,
  joinWinPath,
  parentWinPath,
  pathCrumbs,
  uniqueEntryName,
} from "@/lib/fs-client";
import { FS_MAX_TRANSFER_BYTES } from "@/lib/fs-types";
import type { FsEntryDto, FsShortcut } from "@/lib/fs-types";

type Props = {
  deviceId: string;
  hostname: string;
  onClose: () => void;
  onToast: (msg: string) => void;
};

type BusyKind = "idle" | "loading" | "upload" | "download" | "open" | "save" | "mutate";

type ClipboardItem = {
  mode: "copy" | "cut";
  path: string;
  name: string;
  type: "file" | "dir";
};

type CtxMenu = {
  x: number;
  y: number;
  entry: FsEntryDto | null;
};

type NameDialog = {
  mode: "mkdir" | "delete";
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  /** Prefilled input for mkdir; ignored for delete. */
  initial?: string;
  /** Target entry for delete. */
  entry?: FsEntryDto;
};

function entryModified(e: FsEntryDto): string {
  if (e.modifiedAt) return formatAgo(e.modifiedAt);
  if (e.modified) return e.modified;
  return "—";
}

function entryTitle(e: FsEntryDto): string {
  const when = e.modifiedAt
    ? new Date(e.modifiedAt).toLocaleString()
    : e.modified || "";
  const size = e.type === "file" && e.sizeLabel ? ` · ${e.sizeLabel}` : "";
  return `${e.name}${size}${when ? ` · ${when}` : ""}`;
}

/** Place menu at cursor; flip up/left if it would leave the viewport. */
function placeMenu(cursorX: number, cursorY: number, w: number, h: number) {
  const pad = 10;
  let x = cursorX;
  let y = cursorY;
  if (x + w > window.innerWidth - pad) x = Math.max(pad, cursorX - w);
  if (y + h > window.innerHeight - pad) y = Math.max(pad, cursorY - h);
  if (x < pad) x = pad;
  if (y < pad) y = pad;
  return { x, y };
}

export function FileExplorer({ deviceId, hostname, onClose, onToast }: Props) {
  const [path, setPath] = useState("");
  const [shortcuts, setShortcuts] = useState<FsShortcut[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [entries, setEntries] = useState<FsEntryDto[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyKind>("loading");
  const [busyNote, setBusyNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flashName, setFlashName] = useState<string | null>(null);
  const [opened, setOpened] = useState<OpenedFile | null>(null);
  const [openWithName, setOpenWithName] = useState<string | null>(null);
  const [pendingBytes, setPendingBytes] = useState<{
    name: string;
    path: string;
    folder: string;
    size: number;
    contentBase64: string;
  } | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
  const [dialogValue, setDialogValue] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const reqGen = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCursorRef = useRef({ x: 0, y: 0 });
  const pathRef = useRef(path);
  pathRef.current = path;

  const loadList = useCallback(
    async (nextPath: string) => {
      const gen = ++reqGen.current;
      const current = pathRef.current;
      const sameFolder =
        current.replace(/\\+$/, "").toLowerCase() === nextPath.replace(/\\+$/, "").toLowerCase();
      // Skeleton only when navigating away — refresh keeps the current list.
      const showSkeleton = !sameFolder;

      setBusy("loading");
      setBusyNote("");
      setError(null);
      setSelected(null);
      if (showSkeleton) {
        setEntries([]);
        setPath(nextPath);
        listRef.current?.scrollTo({ top: 0 });
      }
      try {
        const result = await fsList(deviceId, nextPath);
        if (gen !== reqGen.current) return;
        setPath(result.path);
        setEntries(result.entries ?? []);
      } catch (err) {
        if (gen !== reqGen.current) return;
        const msg = err instanceof FsClientError ? err.message : "Could not list folder";
        setError(msg);
        if (showSkeleton) setEntries([]);
        onToast(msg);
      } finally {
        if (gen === reqGen.current) {
          setBusy("idle");
          setBusyNote("");
        }
      }
    },
    [deviceId, onToast],
  );

  // Boot once per device — must NOT re-run when path changes (that snapped users back home).
  useEffect(() => {
    let alive = true;
    async function boot() {
      const gen = ++reqGen.current;
      setBusy("loading");
      setError(null);
      try {
        const roots = await fsRoots(deviceId);
        if (!alive || gen !== reqGen.current) return;
        setShortcuts(roots.shortcuts ?? []);
        setDrives(roots.drives ?? []);
        const start =
          roots.shortcuts?.find((s) => s.label === "Desktop")?.path
          || roots.home
          || roots.shortcuts?.[0]?.path
          || roots.drives?.[0]
          || "";
        if (!start) {
          setError("No drives found on this device.");
          setBusy("idle");
          return;
        }
        await loadList(start);
      } catch (err) {
        if (!alive || gen !== reqGen.current) return;
        const msg = err instanceof FsClientError ? err.message : "Could not reach agent filesystem";
        setError(msg);
        setBusy("idle");
        onToast(msg);
      }
    }
    void boot();
    return () => {
      alive = false;
      reqGen.current += 1;
    };
  }, [deviceId, loadList, onToast]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [ctxMenu]);

  useLayoutEffect(() => {
    if (!ctxMenu || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const next = placeMenu(menuCursorRef.current.x, menuCursorRef.current.y, rect.width, rect.height);
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
    el.style.visibility = "visible";
  }, [ctxMenu]);

  useEffect(() => {
    if (!nameDialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNameDialog(null);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => dialogInputRef.current?.focus(), 20);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [nameDialog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, query]);

  const crumbs = useMemo(() => (path ? pathCrumbs(path) : []), [path]);
  const parent = path ? parentWinPath(path) : null;
  const selectedEntry = entries.find((e) => e.name === selected) ?? null;
  const isBusy = busy !== "idle";
  const isLoading = busy === "loading";
  /** Folder nav stays clickable while listing loads so users can jump elsewhere. */
  const navLocked =
    busy === "upload"
    || busy === "download"
    || busy === "open"
    || busy === "save"
    || busy === "mutate";
  const transferBusy = navLocked;

  function flash(name: string, ms = 500) {
    setFlashName(name);
    window.setTimeout(() => setFlashName(null), ms);
  }

  function openDir(name: string) {
    flash(name, 220);
    void loadList(joinWinPath(path, name));
    setQuery("");
  }

  function openCtxMenu(e: ReactMouseEvent, entry: FsEntryDto | null) {
    e.preventDefault();
    e.stopPropagation();
    if (navLocked) return;
    if (entry) setSelected(entry.name);
    menuCursorRef.current = { x: e.clientX, y: e.clientY };
    // Paint at cursor first; layout effect clamps after measure (portaled to body).
    setCtxMenu({ x: e.clientX, y: e.clientY, entry });
  }

  function submitNameDialog() {
    if (!nameDialog) return;
    if (nameDialog.mode === "mkdir") {
      void createFolder(dialogValue);
      return;
    }
    if (nameDialog.entry) void confirmDelete(nameDialog.entry);
  }

  function launchTool(
    meta: { name: string; path: string; folder: string; size: number; contentBase64: string },
    tool: FileToolId,
  ) {
    if (tool === "download") {
      downloadBase64(meta.name, meta.contentBase64);
      onToast(`Downloaded ${meta.name}`);
      setPendingBytes(null);
      setOpenWithName(null);
      return;
    }
    setOpened({ ...meta, tool });
    setPendingBytes(null);
    setOpenWithName(null);
  }

  async function fetchAndOpen(name: string, forcedTool?: FileToolId) {
    if (busy !== "idle") return;
    const entry = entries.find((e) => e.name === name);
    if (!entry || entry.type !== "file") return;

    setSelected(name);
    setBusy("open");
    setBusyNote("");
    try {
      const file = await fsRead(deviceId, joinWinPath(path, entry.name));
      const meta = {
        name: file.name,
        path: file.path,
        folder: path,
        size: file.size,
        contentBase64: file.contentBase64,
      };
      const tool = forcedTool || defaultToolForFile(file.name);
      if (!tool) {
        setPendingBytes(meta);
        setOpenWithName(file.name);
        setBusy("idle");
        return;
      }
      launchTool(meta, tool);
      flash(name, 400);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : "Could not open file");
    } finally {
      setBusy("idle");
      setBusyNote("");
    }
  }

  async function handleDownload(targetName?: string) {
    const name = targetName || selected;
    if (!name || isBusy) return;
    const entry = entries.find((e) => e.name === name);
    if (!entry || entry.type !== "file") {
      onToast("Select a file to download.");
      return;
    }
    setSelected(name);
    setBusy("download");
    setBusyNote("Preparing download…");
    try {
      const staged = await fsDownload(deviceId, joinWinPath(path, entry.name));
      const url = staged.downloadUrl;
      if (!url) throw new FsClientError("Download URL missing", 500);
      downloadFromUrl(staged.name || entry.name, url);
      flash(name);
      onToast(`Downloaded ${staged.name || entry.name}`);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : "Download failed");
    } finally {
      setBusy("idle");
      setBusyNote("");
    }
  }

  async function uploadLocalFiles(rawFiles: File[], source: "upload" | "paste" = "upload") {
    if (!path || isBusy || rawFiles.length === 0) return;
    const existing = entries.map((e) => e.name);
    const files: { file: File; name: string }[] = [];
    for (const file of rawFiles) {
      if (file.size <= 0) continue;
      if (file.size > FS_MAX_TRANSFER_BYTES) {
        onToast(
          `"${file.name || "File"}" is over ${Math.floor(FS_MAX_TRANSFER_BYTES / (1024 * 1024))} MB`,
        );
        continue;
      }
      const name = uniqueEntryName(file.name || "pasted.bin", existing);
      existing.push(name);
      files.push({
        file: name === file.name ? file : new File([file], name, { type: file.type }),
        name,
      });
    }
    if (files.length === 0) {
      onToast(source === "paste" ? "Clipboard has nothing to paste here" : "Nothing to upload");
      return;
    }

    setCtxMenu(null);
    setBusy("upload");
    setBusyNote(files.length > 1 ? `Uploading 1 of ${files.length}…` : "");
    let lastName = files[0].name;
    try {
      for (let i = 0; i < files.length; i++) {
        const { file, name } = files[i];
        lastName = name;
        if (files.length > 1) setBusyNote(`Uploading ${i + 1} of ${files.length}…`);
        const contentBase64 = await fileToBase64(file);
        await fsWrite(deviceId, path, name, contentBase64);
        flash(name, 700);
      }
      onToast(
        files.length === 1
          ? `${source === "paste" ? "Pasted" : "Uploaded"} ${files[0].name}`
          : `${source === "paste" ? "Pasted" : "Uploaded"} ${files.length} files`,
      );
      await loadList(path);
      setSelected(lastName);
    } catch (err) {
      const msg =
        err instanceof FsClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
      onToast(msg);
      setBusy("idle");
      setBusyNote("");
      if (path) void loadList(path);
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    await uploadLocalFiles(Array.from(fileList), "upload");
  }

  function openNewFolderDialog() {
    if (!path || isBusy) return;
    setCtxMenu(null);
    setDialogValue("");
    setNameDialog({
      mode: "mkdir",
      title: "New folder",
      body: "Create a folder in the current location.",
      confirmLabel: "Create",
      initial: "",
    });
  }

  async function createFolder(nameRaw: string) {
    if (!path || isBusy) return;
    const name = nameRaw.trim();
    if (!name) {
      onToast("Folder name required");
      return;
    }
    if (/[\\/:*?"<>|]/.test(name)) {
      onToast("Invalid folder name");
      return;
    }
    setNameDialog(null);
    setBusy("mutate");
    setBusyNote("Creating folder…");
    try {
      await fsMkdir(deviceId, path, name);
      onToast(`Created ${name}`);
      flash(name, 700);
      await loadList(path);
      setSelected(name);
    } catch (err) {
      const msg = err instanceof FsClientError ? err.message : "Could not create folder";
      onToast(
        /unknown command kind:\s*fs\.mkdir/i.test(msg)
          ? "Agent is outdated — restart the Hudl agent on that laptop, then try again."
          : msg,
      );
      setBusy("idle");
      setBusyNote("");
    }
  }

  function clearClipboard(announce = false) {
    setClipboard((prev) => {
      if (announce && prev?.mode === "cut") onToast("Cut cancelled");
      return null;
    });
  }

  function handleCutCopy(mode: "copy" | "cut", entry?: FsEntryDto | null) {
    const target = entry || selectedEntry;
    if (!target || !path) return;
    setClipboard({
      mode,
      path: joinWinPath(path, target.name),
      name: target.name,
      type: target.type,
    });
    setSelected(target.name);
    setCtxMenu(null);
    onToast(
      mode === "cut"
        ? `Cut ${target.name} — paste in another folder to move it`
        : `Copied ${target.name} — paste to duplicate on this device`,
    );
  }

  /** Remote cut/copy buffer only (same device). */
  async function handleRemotePaste() {
    if (!clipboard || !path || isBusy) return;
    setCtxMenu(null);
    const moving = clipboard.mode === "cut";
    setBusy("mutate");
    setBusyNote(moving ? "Moving…" : "Copying…");
    try {
      if (moving) {
        await fsMove(deviceId, clipboard.path, path);
        setClipboard(null);
        onToast(`Moved ${clipboard.name}`);
      } else {
        await fsCopy(deviceId, clipboard.path, path);
        onToast(`Copied ${clipboard.name}`);
      }
      flash(clipboard.name, 700);
      await loadList(path);
      setSelected(clipboard.name);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : moving ? "Move failed" : "Copy failed");
      setBusy("idle");
      setBusyNote("");
    }
  }

  /**
   * Prefer this PC’s clipboard (images/files), else remote cut/copy buffer.
   * Works in the Files panel — remote Keyboard mode is not required.
   */
  async function handlePaste(data?: DataTransfer | null) {
    if (!path || isBusy) return;
    const fromEvent = filesFromDataTransfer(data);
    if (fromEvent.length > 0) {
      await uploadLocalFiles(fromEvent, "paste");
      return;
    }
    if (!data) {
      const fromOs = await filesFromSystemClipboard();
      if (fromOs.length > 0) {
        await uploadLocalFiles(fromOs, "paste");
        return;
      }
    }
    if (clipboard) {
      await handleRemotePaste();
      return;
    }
    setCtxMenu(null);
    onToast("Nothing to paste — copy a file on this PC or Cut/Copy on the remote first");
  }

  const pasteGateRef = useRef({
    isBusy: false,
    nameDialog: null as NameDialog | null,
    opened: null as OpenedFile | null,
    openWithName: null as string | null,
    selectedEntry: null as FsEntryDto | null,
    clipboard: null as ClipboardItem | null,
    ctxMenu: null as CtxMenu | null,
    handlePaste,
    handleCutCopy,
    clearClipboard,
  });
  pasteGateRef.current = {
    isBusy,
    nameDialog,
    opened,
    openWithName,
    selectedEntry,
    clipboard,
    ctxMenu,
    handlePaste,
    handleCutCopy,
    clearClipboard,
  };

  // Ctrl/Cmd+C/X/V + Esc (cancel cut) while Files is open.
  useEffect(() => {
    const typingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return Boolean(el?.closest?.("input, textarea, select, [contenteditable='true']"));
    };

    const onPaste = (e: ClipboardEvent) => {
      const g = pasteGateRef.current;
      if (typingTarget(e.target) || g.nameDialog || g.opened || g.openWithName || g.isBusy) return;
      e.preventDefault();
      void g.handlePaste(e.clipboardData);
    };

    const onKey = (e: KeyboardEvent) => {
      const g = pasteGateRef.current;
      if (typingTarget(e.target) || g.nameDialog || g.opened || g.openWithName) return;

      if (e.key === "Escape") {
        // Menu/dialog handlers own Escape first; only cancel cut when nothing else is open.
        if (g.ctxMenu || g.nameDialog) return;
        if (g.clipboard?.mode === "cut") {
          e.preventDefault();
          g.clearClipboard(true);
        }
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "v") {
        // Browser fires `paste` with clipboardData — more reliable than clipboard.read().
        return;
      }
      if (key === "c") {
        if (!g.selectedEntry || g.isBusy) return;
        e.preventDefault();
        g.handleCutCopy("copy", g.selectedEntry);
        return;
      }
      if (key === "x") {
        if (!g.selectedEntry || g.isBusy) return;
        e.preventDefault();
        g.handleCutCopy("cut", g.selectedEntry);
      }
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function openDeleteDialog(entry?: FsEntryDto | null) {
    const target = entry || selectedEntry;
    if (!target || !path || isBusy) return;
    setCtxMenu(null);
    const kind = target.type === "dir" ? "folder" : "file";
    setDialogValue("");
    setNameDialog({
      mode: "delete",
      title: `Delete ${kind}?`,
      body: `“${target.name}” will be removed from the device. This can’t be undone from Hudl.`,
      confirmLabel: "Delete",
      danger: true,
      entry: target,
    });
  }

  async function confirmDelete(target: FsEntryDto) {
    if (!path || isBusy) return;
    setNameDialog(null);
    setBusy("mutate");
    setBusyNote("Deleting…");
    try {
      await fsDelete(deviceId, joinWinPath(path, target.name));
      if (clipboard?.path === joinWinPath(path, target.name)) setClipboard(null);
      onToast(`Deleted ${target.name}`);
      await loadList(path);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : "Delete failed");
      setBusy("idle");
      setBusyNote("");
    }
  }

  async function handleSaveOpened(contentBase64: string) {
    if (!opened) throw new Error("No file open");
    setBusy("save");
    setBusyNote("");
    try {
      await fsWrite(deviceId, opened.folder, opened.name, contentBase64);
      setOpened((prev) => (prev ? { ...prev, contentBase64, size: Math.floor((contentBase64.length * 3) / 4) } : prev));
      flash(opened.name, 700);
      void fsList(deviceId, opened.folder).then((result) => {
        if (result.path === path) setEntries(result.entries ?? []);
      });
    } catch (err) {
      throw err instanceof FsClientError ? err : new Error("Save failed");
    } finally {
      setBusy("idle");
      setBusyNote("");
    }
  }

  const sideItems: FsShortcut[] = [
    ...shortcuts,
    ...drives
      .filter((d) => !shortcuts.some((s) => s.path.replace(/\\+$/, "").toLowerCase() === d.replace(/\\+$/, "").toLowerCase()))
      .map((d) => ({ label: d.replace(/\\+$/, ""), path: d })),
  ];

  const overlayLabel =
    busy === "upload"
      ? "Uploading to device…"
      : busy === "download"
        ? busyNote || "Preparing download…"
        : busy === "open"
          ? "Opening file…"
          : busy === "save"
            ? "Saving to device…"
            : busy === "mutate"
              ? busyNote || "Working…"
              : "";

  const statusLabel =
    busy === "loading"
      ? "Syncing folder…"
      : busy === "upload"
        ? "Uploading…"
        : busy === "download"
          ? "Preparing download…"
          : busy === "open"
            ? "Opening…"
            : busy === "save"
              ? "Saving…"
              : busy === "mutate"
                ? busyNote || "Working…"
                : error
                  ? "Needs attention"
                  : "Live";

  return (
    <div className={`explorer${isBusy ? " is-busy" : ""}`} role="dialog" aria-label={`Files on ${hostname}`}>
      <div className="explorer-side">
        <div className="explorer-side-head">
          <div className="explorer-side-title">Places</div>
          <span className="explorer-host" title={hostname}>{hostname}</span>
        </div>
        <div className="explorer-side-scroll">
          {sideItems.map((q) => {
            const on =
              path.replace(/\\+$/, "").toLowerCase() === q.path.replace(/\\+$/, "").toLowerCase();
            return (
              <button
                key={`${q.label}-${q.path}`}
                type="button"
                className={on ? "on" : ""}
                title={q.path}
                onClick={() => {
                  setQuery("");
                  void loadList(q.path);
                }}
                disabled={navLocked}
              >
                <Ic name={q.label.length <= 3 && q.label.includes(":") ? "disk" : "folder"} sm />
                <span className="explorer-side-label">{q.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="explorer-main">
        <div className="explorer-bar">
          <div className="explorer-nav">
            <button
              className="iconbtn sm"
              type="button"
              title="Up one folder"
              onClick={() => parent && void loadList(parent)}
              disabled={!parent || navLocked}
            >
              <Ic name="chevronUp" sm />
            </button>
            <button
              className="iconbtn sm"
              type="button"
              title="Home"
              onClick={() => {
                const home = shortcuts.find((s) => s.label === "Home")?.path || shortcuts[0]?.path;
                if (home) void loadList(home);
              }}
              disabled={navLocked}
            >
              <Ic name="home" sm />
            </button>
            <button
              className="iconbtn sm"
              type="button"
              title="Refresh"
              onClick={() => path && void loadList(path)}
              disabled={!path || navLocked}
            >
              <Ic name="refresh" sm />
            </button>
          </div>

          <div className="crumbs" title={path}>
            {crumbs.map((c, i) => (
              <span key={c.path} className="crumb-piece">
                {i > 0 && <span className="crumb-sep">/</span>}
                <button
                  type="button"
                  onClick={() => void loadList(c.path)}
                  disabled={navLocked}
                  title={c.path}
                >
                  {c.label}
                </button>
              </span>
            ))}
          </div>

          <div className="explorer-tools">
            <div className="searchbox sm explorer-search">
              <Ic name="search" sm />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                disabled={isLoading || navLocked}
                aria-label="Filter folder"
              />
            </div>
            <input
              ref={uploadRef}
              type="file"
              hidden
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <button
              className="btn small explorer-action"
              type="button"
              disabled={navLocked || isLoading || !path}
              onClick={openNewFolderDialog}
            >
              <Ic name="folder" sm />
              New folder
            </button>
            <button
              className="btn small explorer-action"
              type="button"
              disabled={navLocked || isLoading || !path}
              onClick={() => uploadRef.current?.click()}
            >
              <Ic name="upload" sm />
              Upload
            </button>
            <button
              className="btn small explorer-action"
              type="button"
              disabled={navLocked || isLoading || selectedEntry?.type !== "file"}
              onClick={() => selected && void fetchAndOpen(selected)}
            >
              <Ic name="eye" sm />
              Open
            </button>
            <button
              className="btn primary small explorer-action"
              type="button"
              disabled={navLocked || isLoading || selectedEntry?.type !== "file"}
              onClick={() => void handleDownload()}
            >
              <Ic name="download" sm />
              Download
            </button>
            <button className="iconbtn sm" type="button" title="Close" onClick={onClose}>
              <Ic name="close" sm />
            </button>
          </div>
        </div>

        <div className="explorer-table-head">
          <span>Name</span>
          <span>Size</span>
          <span>Modified</span>
        </div>

        <div
          className="explorer-list"
          ref={listRef}
          onContextMenu={(e) => {
            if ((e.target as HTMLElement).closest?.(".exrow")) return;
            openCtxMenu(e, null);
          }}
        >
          {isLoading && entries.length === 0 && (
            <div className="explorer-skel" aria-busy="true" aria-label="Loading folder">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="explorer-skel-row" style={{ animationDelay: `${i * 45}ms` }}>
                  <span /><span /><span />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="explorer-empty">
              <Ic name="alert" />
              <strong>Couldn’t open this folder</strong>
              <span>{error}</span>
              <button
                className="btn small"
                type="button"
                onClick={() => {
                  if (path) void loadList(path);
                  else {
                    const start =
                      shortcuts.find((s) => s.label === "Desktop")?.path
                      || shortcuts.find((s) => s.label === "Home")?.path
                      || drives[0]
                      || "";
                    if (start) void loadList(start);
                  }
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!error && !(isLoading && entries.length === 0) && filtered.length === 0 && (
            <div className="explorer-empty">
              <Ic name="folder" />
              <strong>{query ? "No matches" : "Empty folder"}</strong>
              <span>
                {query
                  ? `Nothing here matches “${query}”.`
                  : "Drop a file with Upload, or pick another place on the left."}
              </span>
            </div>
          )}

          {!error &&
            !(isLoading && entries.length === 0) &&
            filtered.map((e) => {
              const on = selected === e.name;
              const flashOn = flashName === e.name;
              const cutAway =
                clipboard?.mode === "cut"
                && clipboard.path.toLowerCase() === joinWinPath(path, e.name).toLowerCase();
              return (
                <button
                  key={e.name}
                  type="button"
                  className={`exrow${on ? " on" : ""}${flashOn ? " flash" : ""}${e.type === "dir" ? " is-dir" : ""}${cutAway ? " is-cut" : ""}`}
                  disabled={transferBusy}
                  title={entryTitle(e)}
                  onClick={() => setSelected(e.name)}
                  onDoubleClick={() => {
                    if (e.type === "dir") openDir(e.name);
                    else void fetchAndOpen(e.name);
                  }}
                  onContextMenu={(ev) => openCtxMenu(ev, e)}
                >
                  <span className="exname">
                    <span className={`exico ${e.type}`}>
                      <Ic name={e.type === "dir" ? "folder" : "doc"} sm />
                    </span>
                    <span className="exlabel">{e.name}</span>
                  </span>
                  <span className="exsize">{e.type === "dir" ? "—" : e.sizeLabel || "—"}</span>
                  <span className="exwhen">{entryModified(e)}</span>
                </button>
              );
            })}

          {transferBusy && (
            <div className="explorer-busy" aria-live="polite">
              <div className="explorer-busy-card">
                <span className="explorer-spinner" />
                <strong>{overlayLabel}</strong>
                <span>Keep this panel open until it finishes.</span>
              </div>
            </div>
          )}
        </div>

        <div className="explorer-foot">
          <div className="explorer-foot-left">
            <span className={`explorer-pill${error ? " warn" : isBusy ? " busy" : " ok"}`}>
              <i />
              {statusLabel}
            </span>
            <span className="explorer-count">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
              {selectedEntry ? ` · ${selectedEntry.name}` : ""}
              {clipboard ? ` · ${clipboard.mode === "cut" ? "Cut" : "Copied"} ${clipboard.name}` : ""}
            </span>
          </div>
          <span className="explorer-hint" title={path}>
            Ctrl+V paste from this PC · Esc cancels cut · Right‑click for more
          </span>
        </div>
      </div>

      {ctxMenu
        && typeof document !== "undefined"
        && createPortal(
          <div
            ref={menuRef}
            className="ex-menu"
            role="menu"
            style={{ left: ctxMenu.x, top: ctxMenu.y, visibility: "hidden" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {ctxMenu.entry ? (
              <>
                {ctxMenu.entry.type === "file" ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const name = ctxMenu.entry!.name;
                      setCtxMenu(null);
                      void fetchAndOpen(name);
                    }}
                  >
                    <Ic name="eye" sm />
                    <span>Open</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const name = ctxMenu.entry!.name;
                      setCtxMenu(null);
                      openDir(name);
                    }}
                  >
                    <Ic name="folder" sm />
                    <span>Open folder</span>
                  </button>
                )}
                {ctxMenu.entry.type === "file" && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const name = ctxMenu.entry!.name;
                      setCtxMenu(null);
                      void handleDownload(name);
                    }}
                  >
                    <Ic name="download" sm />
                    <span>Download</span>
                  </button>
                )}
                <div className="ex-menu-sep" />
                <button type="button" role="menuitem" onClick={() => handleCutCopy("cut", ctxMenu.entry)}>
                  <Ic name="cut" sm />
                  <span>Cut</span>
                </button>
                <button type="button" role="menuitem" onClick={() => handleCutCopy("copy", ctxMenu.entry)}>
                  <Ic name="copy" sm />
                  <span>Copy</span>
                </button>
                {clipboard?.mode === "cut" && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCtxMenu(null);
                      clearClipboard(true);
                    }}
                  >
                    <Ic name="close" sm />
                    <span>Undo cut</span>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="ex-menu-danger"
                  onClick={() => openDeleteDialog(ctxMenu.entry)}
                >
                  <Ic name="alert" sm />
                  <span>Delete</span>
                </button>
                <div className="ex-menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCtxMenu(null);
                    if (path) void loadList(path);
                  }}
                >
                  <Ic name="refresh" sm />
                  <span>Refresh</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!path}
                  onClick={openNewFolderDialog}
                >
                  <Ic name="folder" sm />
                  <span>New folder</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!path || isBusy}
                  onClick={() => void handlePaste()}
                >
                  <Ic name="upload" sm />
                  <span>
                    Paste
                    {clipboard ? ` “${clipboard.name}”` : " from this PC"}
                  </span>
                </button>
                {clipboard?.mode === "cut" && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCtxMenu(null);
                      clearClipboard(true);
                    }}
                  >
                    <Ic name="close" sm />
                    <span>Undo cut</span>
                  </button>
                )}
                <div className="ex-menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCtxMenu(null);
                    if (path) void loadList(path);
                  }}
                >
                  <Ic name="refresh" sm />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!path}
                  onClick={() => {
                    setCtxMenu(null);
                    uploadRef.current?.click();
                  }}
                >
                  <Ic name="upload" sm />
                  <span>Upload</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

      {nameDialog
        && typeof document !== "undefined"
        && createPortal(
          <div
            className="ex-dialog-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setNameDialog(null);
            }}
          >
            <div
              className={`ex-dialog${nameDialog.danger ? " danger" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ex-dialog-title"
            >
              <div className="ex-dialog-head">
                <strong id="ex-dialog-title">{nameDialog.title}</strong>
                {nameDialog.body ? <span>{nameDialog.body}</span> : null}
              </div>
              {nameDialog.mode === "mkdir" && (
                <label className="ex-dialog-field">
                  <span>Folder name</span>
                  <input
                    ref={dialogInputRef}
                    value={dialogValue}
                    onChange={(e) => setDialogValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitNameDialog();
                      }
                    }}
                    placeholder="New folder"
                    maxLength={120}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              )}
              <div className="ex-dialog-actions">
                <button className="btn small" type="button" onClick={() => setNameDialog(null)}>
                  Cancel
                </button>
                <button
                  className={`btn small${nameDialog.danger ? " danger" : " primary"}`}
                  type="button"
                  disabled={nameDialog.mode === "mkdir" && !dialogValue.trim()}
                  onClick={submitNameDialog}
                >
                  {nameDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {opened && (
        <FileToolHost
          file={opened}
          saving={busy === "save"}
          onClose={() => setOpened(null)}
          onToast={onToast}
          onDownload={() => {
            downloadBase64(opened.name, opened.contentBase64);
            onToast(`Downloaded ${opened.name}`);
          }}
          onSwitchTool={(tool) => setOpened((prev) => (prev ? { ...prev, tool } : prev))}
          onSave={handleSaveOpened}
        />
      )}

      {openWithName && pendingBytes && (
        <OpenWithDialog
          name={openWithName}
          onCancel={() => {
            setOpenWithName(null);
            setPendingBytes(null);
          }}
          onPick={(tool) => launchTool(pendingBytes, tool)}
        />
      )}
    </div>
  );
}
