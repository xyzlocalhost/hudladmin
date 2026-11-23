"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Ic } from "@/components/ui/icons";
import {
  FILE_TOOLS,
  VIEWER_TOOL_IDS,
  base64ToObjectUrl,
  decodeTextBase64,
  encodeTextBase64,
  formatBytes,
  mimeForFile,
  toolsForFile,
  type FileToolId,
} from "@/lib/file-tools";

export type OpenedFile = {
  name: string;
  path: string;
  folder: string;
  size: number;
  contentBase64: string;
  tool: FileToolId;
};

type Props = {
  file: OpenedFile;
  saving?: boolean;
  onClose: () => void;
  onSave: (contentBase64: string) => Promise<void>;
  onDownload: () => void;
  onSwitchTool: (tool: FileToolId) => void;
  onToast: (msg: string) => void;
};

export function FileToolHost({
  file,
  saving,
  onClose,
  onSave,
  onDownload,
  onSwitchTool,
  onToast,
}: Props) {
  const tool = FILE_TOOLS[file.tool];

  if (file.tool === "notepad") {
    return (
      <NotepadTool
        file={file}
        saving={saving}
        onClose={onClose}
        onSave={onSave}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
        onToast={onToast}
      />
    );
  }

  if (file.tool === "image") {
    return (
      <ImageTool
        file={file}
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  if (file.tool === "pdf") {
    return (
      <PdfTool
        file={file}
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
        onToast={onToast}
      />
    );
  }

  if (file.tool === "video") {
    return (
      <VideoTool
        file={file}
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
        onToast={onToast}
      />
    );
  }

  if (file.tool === "audio") {
    return (
      <AudioTool
        file={file}
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
      />
    );
  }

  return (
    <div className="ft-shell">
      <ToolChrome
        title={file.name}
        subtitle={tool?.label || "Tool"}
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
      />
      <div className="ft-empty">Unsupported tool.</div>
    </div>
  );
}

function ToolChrome({
  title,
  subtitle,
  dirty,
  saving,
  onClose,
  onDownload,
  onSave,
  onSwitchTool,
  extra,
}: {
  title: string;
  subtitle: string;
  dirty?: boolean;
  saving?: boolean;
  onClose: () => void;
  onDownload: () => void;
  onSave?: () => void;
  onSwitchTool: (tool: FileToolId) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="ft-bar">
      <div className="ft-id">
        <div className="ft-ico"><Ic name="doc" sm /></div>
        <div className="ft-meta">
          <strong title={title}>{title}{dirty ? " •" : ""}</strong>
          <span>{subtitle}{dirty ? " · unsaved" : ""}{saving ? " · saving…" : ""}</span>
        </div>
      </div>
      <div className="ft-acts">
        {extra}
        {onSave && (
          <button className="btn primary small" type="button" disabled={!dirty || saving} onClick={onSave}>
            Save to device
          </button>
        )}
        <button className="btn small" type="button" onClick={onDownload}>
          <Ic name="download" sm /> Download
        </button>
        <details className="ft-openwith">
          <summary className="btn small">Open with</summary>
          <div className="ft-openwith-menu">
            {VIEWER_TOOL_IDS.map((id) => (
              <button key={id} type="button" onClick={() => onSwitchTool(id)}>
                <Ic name={FILE_TOOLS[id].icon} sm />
                <span>
                  <b>{FILE_TOOLS[id].label}</b>
                  <small>{FILE_TOOLS[id].description}</small>
                </span>
              </button>
            ))}
          </div>
        </details>
        <button className="iconbtn sm" type="button" title="Close" onClick={onClose}>
          <Ic name="close" sm />
        </button>
      </div>
    </div>
  );
}

function NotepadTool({
  file,
  saving,
  onClose,
  onSave,
  onDownload,
  onSwitchTool,
  onToast,
}: Props) {
  const initial = useMemo(() => decodeTextBase64(file.contentBase64), [file.contentBase64, file.path]);
  const [text, setText] = useState(initial);
  const dirty = text !== initial;

  useEffect(() => {
    setText(initial);
  }, [initial]);

  return (
    <div className="ft-shell">
      <ToolChrome
        title={file.name}
        subtitle="Notepad"
        dirty={dirty}
        saving={saving}
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
        onSave={() => {
          void onSave(encodeTextBase64(text)).then(
            () => onToast(`Saved ${file.name} on device`),
            (err: unknown) => onToast(err instanceof Error ? err.message : "Save failed"),
          );
        }}
      />
      <textarea
        className="ft-notepad"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        wrap="off"
        aria-label={`Edit ${file.name}`}
      />
      <div className="ft-status">
        <span>{text.length.toLocaleString()} chars</span>
        <span>{dirty ? "Unsaved changes · Save writes to the laptop" : "In sync with device"}</span>
      </div>
    </div>
  );
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.25;

function ImageTool({
  file,
  onClose,
  onDownload,
  onSwitchTool,
}: Omit<Props, "onSave" | "onToast" | "saving">) {
  const [zoom, setZoom] = useState(1);
  const url = useMemo(
    () => base64ToObjectUrl(file.contentBase64, mimeForFile(file.name)),
    [file.contentBase64, file.name],
  );

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    setZoom(1);
  }, [file.path]);

  function bumpZoom(delta: number) {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));
  }

  return (
    <div className="ft-shell">
      <ToolChrome
        title={file.name}
        subtitle="Image viewer"
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
        extra={
          <>
            <div className="ft-zoom">
              <button
                className="iconbtn sm"
                type="button"
                title="Zoom out"
                disabled={zoom <= ZOOM_MIN}
                onClick={() => bumpZoom(-ZOOM_STEP)}
              >
                <span className="ft-zoom-glyph" aria-hidden>−</span>
              </button>
              <button
                className="ft-zoom-label"
                type="button"
                title="Reset zoom"
                onClick={() => setZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                className="iconbtn sm"
                type="button"
                title="Zoom in"
                disabled={zoom >= ZOOM_MAX}
                onClick={() => bumpZoom(ZOOM_STEP)}
              >
                <span className="ft-zoom-glyph" aria-hidden>+</span>
              </button>
            </div>
            <button
              className="btn small"
              type="button"
              onClick={() => onSwitchTool("notepad")}
              title="Open SVG/source as text"
            >
              As text
            </button>
          </>
        }
      />
      <div
        className="ft-image-stage"
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          bumpZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={file.name}
          style={{
            maxWidth: `${zoom * 100}%`,
            maxHeight: `${zoom * 100}%`,
          }}
        />
      </div>
      <div className="ft-status">
        <span>{formatBytes(file.size)}</span>
        <span>− / + to zoom · click % to reset · Ctrl+scroll also works</span>
      </div>
    </div>
  );
}

function PdfTool({
  file,
  onClose,
  onDownload,
  onSwitchTool,
  onToast,
}: Omit<Props, "onSave" | "saving">) {
  const url = useMemo(
    () => base64ToObjectUrl(file.contentBase64, "application/pdf"),
    [file.contentBase64],
  );

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="ft-shell">
      <ToolChrome
        title={file.name}
        subtitle="PDF reader"
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
      />
      <iframe className="ft-pdf" src={url} title={file.name} />
      <div className="ft-status">
        <span>{formatBytes(file.size)}</span>
        <button
          className="btn small"
          type="button"
          onClick={() => {
            window.open(url, "_blank", "noopener,noreferrer");
            onToast("Opened PDF in a new tab");
          }}
        >
          Open in tab
        </button>
      </div>
    </div>
  );
}

function VideoTool({
  file,
  onClose,
  onDownload,
  onSwitchTool,
  onToast,
}: Omit<Props, "onSave" | "saving">) {
  const mime = mimeForFile(file.name);
  const url = useMemo(
    () => base64ToObjectUrl(file.contentBase64, mime === "application/octet-stream" ? "video/webm" : mime),
    [file.contentBase64, mime],
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    setFailed(false);
  }, [file.path]);

  return (
    <div className="ft-shell">
      <ToolChrome
        title={file.name}
        subtitle="Video player"
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
      />
      <div className="ft-media-stage">
        {failed ? (
          <div className="ft-media-fallback">
            <Ic name="alert" />
            <strong>This browser can’t play this codec</strong>
            <span>WebM/MP4 usually work. Try Download, or open with another tool.</span>
            <button className="btn small" type="button" onClick={onDownload}>Download instead</button>
          </div>
        ) : (
          <video
            className="ft-video"
            src={url}
            controls
            playsInline
            preload="metadata"
            onError={() => {
              setFailed(true);
              onToast("Couldn’t play this video in the browser");
            }}
          >
            <track kind="captions" />
          </video>
        )}
      </div>
      <div className="ft-status">
        <span>{formatBytes(file.size)} · {mime}</span>
        <span>WebM, MP4, and other browser-supported video</span>
      </div>
    </div>
  );
}

function AudioTool({
  file,
  onClose,
  onDownload,
  onSwitchTool,
}: Omit<Props, "onSave" | "onToast" | "saving">) {
  const mime = mimeForFile(file.name);
  const url = useMemo(
    () => base64ToObjectUrl(file.contentBase64, mime === "application/octet-stream" ? "audio/mpeg" : mime),
    [file.contentBase64, mime],
  );

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="ft-shell">
      <ToolChrome
        title={file.name}
        subtitle="Audio player"
        onClose={onClose}
        onDownload={onDownload}
        onSwitchTool={onSwitchTool}
      />
      <div className="ft-media-stage ft-audio-stage">
        <div className="ft-audio-card">
          <div className="ft-audio-art"><Ic name="activity" /></div>
          <div className="ft-audio-meta">
            <strong title={file.name}>{file.name}</strong>
            <span>{formatBytes(file.size)} · {mime}</span>
          </div>
          <audio className="ft-audio" src={url} controls preload="metadata" />
        </div>
      </div>
      <div className="ft-status">
        <span>MP3, WAV, FLAC, M4A, OGG, Opus…</span>
        <span>Playback stays in this Hudl session</span>
      </div>
    </div>
  );
}

export function OpenWithDialog({
  name,
  onPick,
  onCancel,
}: {
  name: string;
  onPick: (tool: FileToolId) => void;
  onCancel: () => void;
}) {
  const options = toolsForFile(name);

  return (
    <div className="ft-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="ft-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Open ${name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ft-dialog-head">
          <div>
            <strong>Open with</strong>
            <span title={name}>{name}</span>
          </div>
          <button className="iconbtn sm" type="button" onClick={onCancel}>
            <Ic name="close" sm />
          </button>
        </div>
        <p className="ft-dialog-copy">
          No default app for this type yet. Pick a tool — video/audio players, Notepad, or download.
        </p>
        <div className="ft-dialog-list">
          {options.map((id) => {
            const t = FILE_TOOLS[id];
            return (
              <button key={id} type="button" className="ft-dialog-item" onClick={() => onPick(id)}>
                <span className="ft-dialog-ico"><Ic name={t.icon} sm /></span>
                <span className="ft-dialog-text">
                  <b>{t.label}</b>
                  <small>{t.description}</small>
                </span>
                <Ic name="chevron" sm />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
