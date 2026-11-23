"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileToolHost, OpenWithDialog, type OpenedFile } from "@/components/console/file-tool-host";
import { Ic } from "@/components/ui/icons";
import { defaultToolForFile, type FileToolId } from "@/lib/file-tools";
import { formatAgo } from "@/lib/format";
import {
  downloadBase64,
  fileToBase64,
  fsList,
  fsRead,
  fsRoots,
  fsWrite,
  FsClientError,
  joinWinPath,
  parentWinPath,
  pathCrumbs,
} from "@/lib/fs-client";
import { FS_MAX_TRANSFER_BYTES } from "@/lib/fs-types";
import type { FsEntryDto, FsShortcut } from "@/lib/fs-types";

type Props = {
  deviceId: string;
  hostname: string;
  onClose: () => void;
  onToast: (msg: string) => void;
};

type BusyKind = "idle" | "loading" | "upload" | "download" | "open" | "save";

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

export function FileExplorer({ deviceId, hostname, onClose, onToast }: Props) {
  const [path, setPath] = useState("");
  const [shortcuts, setShortcuts] = useState<FsShortcut[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [entries, setEntries] = useState<FsEntryDto[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyKind>("loading");
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
  const uploadRef = useRef<HTMLInputElement>(null);
  const reqGen = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
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
        if (gen === reqGen.current) setBusy("idle");
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
  const navLocked = busy === "upload" || busy === "download" || busy === "open" || busy === "save";

  function openDir(name: string) {
    setFlashName(name);
    window.setTimeout(() => setFlashName(null), 220);
    void loadList(joinWinPath(path, name));
    setQuery("");
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
      setFlashName(name);
      window.setTimeout(() => setFlashName(null), 400);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : "Could not open file");
    } finally {
      setBusy("idle");
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
    try {
      const file = await fsRead(deviceId, joinWinPath(path, entry.name));
      downloadBase64(file.name, file.contentBase64);
      setFlashName(name);
      window.setTimeout(() => setFlashName(null), 500);
      onToast(`Downloaded ${file.name}`);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : "Download failed");
    } finally {
      setBusy("idle");
    }
  }

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !path) return;
    if (file.size > FS_MAX_TRANSFER_BYTES) {
      onToast(`Max upload is ${Math.floor(FS_MAX_TRANSFER_BYTES / (1024 * 1024))} MB`);
      return;
    }
    setBusy("upload");
    try {
      const contentBase64 = await fileToBase64(file);
      await fsWrite(deviceId, path, file.name, contentBase64);
      onToast(`Uploaded ${file.name}`);
      setFlashName(file.name);
      window.setTimeout(() => setFlashName(null), 900);
      await loadList(path);
      setSelected(file.name);
    } catch (err) {
      onToast(err instanceof FsClientError ? err.message : "Upload failed");
      setBusy("idle");
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function handleSaveOpened(contentBase64: string) {
    if (!opened) throw new Error("No file open");
    setBusy("save");
    try {
      await fsWrite(deviceId, opened.folder, opened.name, contentBase64);
      setOpened((prev) => (prev ? { ...prev, contentBase64, size: Math.floor((contentBase64.length * 3) / 4) } : prev));
      setFlashName(opened.name);
      window.setTimeout(() => setFlashName(null), 700);
      void fsList(deviceId, opened.folder).then((result) => {
        if (result.path === path) setEntries(result.entries ?? []);
      });
    } catch (err) {
      throw err instanceof FsClientError ? err : new Error("Save failed");
    } finally {
      setBusy("idle");
    }
  }

  const sideItems: FsShortcut[] = [
    ...shortcuts,
    ...drives
      .filter((d) => !shortcuts.some((s) => s.path.replace(/\\+$/, "").toLowerCase() === d.replace(/\\+$/, "").toLowerCase()))
      .map((d) => ({ label: d.replace(/\\+$/, ""), path: d })),
  ];

  const statusLabel =
    busy === "loading"
      ? "Syncing folder…"
      : busy === "upload"
        ? "Uploading…"
        : busy === "download"
          ? "Downloading…"
          : busy === "open"
            ? "Opening…"
            : busy === "save"
              ? "Saving…"
              : error
                ? "Needs attention"
                : "Live";

  const transferBusy = busy === "upload" || busy === "download" || busy === "open" || busy === "save";

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

        <div className="explorer-list" ref={listRef}>
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
              const flash = flashName === e.name;
              return (
                <button
                  key={e.name}
                  type="button"
                  className={`exrow${on ? " on" : ""}${flash ? " flash" : ""}${e.type === "dir" ? " is-dir" : ""}`}
                  disabled={transferBusy}
                  title={entryTitle(e)}
                  onClick={() => setSelected(e.name)}
                  onDoubleClick={() => {
                    if (e.type === "dir") openDir(e.name);
                    else void fetchAndOpen(e.name);
                  }}
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

          {(busy === "upload" || busy === "download" || busy === "open" || busy === "save") && (
            <div className="explorer-busy" aria-live="polite">
              <div className="explorer-busy-card">
                <span className="explorer-spinner" />
                <strong>
                  {busy === "upload"
                    ? "Uploading to device…"
                    : busy === "download"
                      ? "Downloading…"
                      : busy === "open"
                        ? "Opening file…"
                        : "Saving to device…"}
                </strong>
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
            </span>
          </div>
          <span className="explorer-hint" title={path}>
            Double‑click to open · max {Math.floor(FS_MAX_TRANSFER_BYTES / (1024 * 1024))} MB
          </span>
        </div>
      </div>

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
