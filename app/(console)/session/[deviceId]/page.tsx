"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileExplorer } from "@/components/console/file-explorer";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Ic } from "@/components/ui/icons";
import { useOpenSession } from "@/hooks/useOpenSession";
import { statusLabel } from "@/lib/console-nav";
import { fmtPing } from "@/lib/device-format";

export default function SessionDevicePage() {
  const params = useParams<{ deviceId: string }>();
  const deviceId = params.deviceId;
  const router = useRouter();
  const { devices, loading } = useFleetContext();
  const { fireToast } = useToast();
  const { rustdeskWebExternalUrl } = useOpenSession();

  const sel = devices.find((d) => d.id === deviceId) ?? null;
  const offlineWarned = useRef(false);

  const [filesOpen, setFilesOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [connectFlash, setConnectFlash] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const rdpRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewerSrc = rustdeskWebExternalUrl({
    id: sel?.rustdeskId,
    password: sel?.rustdeskPassword,
  });
  const viewerExternal = viewerSrc;

  function pushFerryCredentials() {
    const win = iframeRef.current?.contentWindow;
    if (!win || !sel?.rustdeskId) return;
    win.postMessage(
      {
        type: "hudl:connect",
        id: sel.rustdeskId,
        password: sel.rustdeskPassword || "",
      },
      window.location.origin,
    );
  }

  function startConnect() {
    if (!sel?.rustdeskId) {
      fireToast("Remote not ready. On that laptop: cd client; .\\run.ps1");
      return;
    }
    setFilesOpen(false);
    setConnectFlash(true);
    window.setTimeout(() => setConnectFlash(false), 420);
    setViewerLoading(true);
    setViewerOpen(true);
    fireToast("Connecting to remote desktop…");
  }

  function closeViewer() {
    setViewerOpen(false);
    setViewerLoading(false);
  }

  function confirmEndSession() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    closeViewer();
    setFilesOpen(false);
    setEndConfirmOpen(false);
    fireToast("Session ended.");
    router.push("/devices");
  }

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Ferry iframe reports session end — close viewer so Hudl doesn't stay "Connected".
  useEffect(() => {
    if (!viewerOpen) return;
    function onFerryMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "hudl:session-ended") return;
      setViewerOpen(false);
      setViewerLoading(false);
      fireToast(
        event.data.reason === "remote-ended"
          ? "Remote session ended."
          : "Disconnected.",
      );
    }
    window.addEventListener("message", onFerryMessage);
    return () => window.removeEventListener("message", onFerryMessage);
  }, [viewerOpen, fireToast]);

  useEffect(() => {
    offlineWarned.current = false;
    setFilesOpen(false);
    setViewerOpen(false);
    setViewerLoading(false);
    setConnectFlash(false);
    setEndConfirmOpen(false);
  }, [deviceId]);

  useEffect(() => {
    if (!sel || sel.status !== "offline" || offlineWarned.current) return;
    offlineWarned.current = true;
    fireToast(`${sel.name} is offline. Start the Hudl agent on that laptop — it shows up here on the next check-in.`);
  }, [sel, fireToast]);

  async function toggleFullscreen() {
    const el = rdpRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        fireToast("Fullscreen on. Press Esc to exit.");
      } else {
        await document.exitFullscreen();
      }
    } catch {
      fireToast("Fullscreen was blocked by the browser.");
    }
  }

  if (loading && !sel) {
    return (
      <section className="view active">
        <EmptyState
          icon="clock"
          title="Loading session…"
          body="Looking up this device in your fleet."
        />
      </section>
    );
  }

  if (!sel) {
    return (
      <section className="view active">
        <EmptyState
          icon="monitor"
          title="Device not found"
          body="That device id isn’t in your fleet. Pick a machine from My devices."
          action={
            <Link className="btn primary small" href="/devices">
              Go to My devices
            </Link>
          }
        />
      </section>
    );
  }

  if (sel.status === "offline") {
    return (
      <section className="view active">
        <EmptyState
          icon="power"
          title={`${sel.name} is offline`}
          body="Start the Hudl agent on that laptop — it shows up here on the next check-in."
          action={
            <Link className="btn primary small" href="/devices">
              Back to My devices
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="session-head">
        <div className="session-id">
          <div className="deviceicon"><Ic name={sel.icon} /></div>
          <div>
            <strong>{sel.name}</strong>
            <span>{sel.os} · {sel.hostname} · {sel.lanIp}</span>
          </div>
        </div>
        <div className="session-meta">
          <span className="m">Latency <b>{fmtPing(sel)}</b></span>
          <span className="m">Seen <b>{sel.lastSeen}</b></span>
          {sel.rustdeskId && <span className="m">Remote ID <b>{sel.rustdeskId}</b></span>}
          <span className={`chip ${sel.status === "online" ? "ok" : sel.status === "stale" ? "neutral" : "off"}`}>
            {statusLabel(sel.status)}
          </span>
          <button
            className={`btn primary small session-connect-btn${connectFlash ? " flash" : ""}${viewerOpen ? " live" : ""}`}
            type="button"
            disabled={!sel.rustdeskId || viewerLoading}
            onClick={() => (viewerOpen ? closeViewer() : startConnect())}
          >
            {viewerLoading ? (
              <>
                <span className="session-connect-spin" aria-hidden />
                Connecting…
              </>
            ) : viewerOpen ? (
              <>
                <Ic name="monitor" sm />
                Connected
              </>
            ) : (
              <>
                <Ic name="monitor" sm />
                Connect
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rdp" ref={rdpRef}>
        <div className="rdp-screen">
          {viewerOpen && !filesOpen && (
            <div className="session-viewer">
              <div className="session-viewer-bar">
                <span className="session-viewer-status">
                  <i className={viewerLoading ? "pending" : "live"} />
                  {viewerLoading ? "Opening remote desktop…" : (
                    <>
                      Live on <b>{sel.name}</b>
                      {sel.rustdeskId ? ` · ID ${sel.rustdeskId}` : ""}
                    </>
                  )}
                </span>
                <div className="session-viewer-acts">
                  {sel.rustdeskPassword && (
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(sel.rustdeskPassword || "").then(
                          () => fireToast("Password copied"),
                          () => fireToast(sel.rustdeskPassword || ""),
                        );
                      }}
                    >
                      Copy password
                    </button>
                  )}
                  {sel.rustdeskId && (
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(sel.rustdeskId || "").then(
                          () => fireToast("Remote ID copied"),
                          () => fireToast(sel.rustdeskId || ""),
                        );
                      }}
                    >
                      Copy ID
                    </button>
                  )}
                  <a
                    className="btn small"
                    href={viewerExternal}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in new tab
                  </a>
                  <button className="btn small" type="button" onClick={closeViewer}>
                    Close viewer
                  </button>
                </div>
              </div>
              <div className="session-viewer-body">
                {viewerLoading && (
                  <div className="session-viewer-loading" aria-live="polite">
                    <span className="session-connect-spin lg" aria-hidden />
                    <strong>Connecting to {sel.name}</strong>
                    <span>Loading the remote viewer…</span>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  className={`session-viewer-frame${viewerLoading ? " is-loading" : ""}`}
                  title={`Remote ${sel.name}`}
                  src={viewerSrc}
                  allow="clipboard-read; clipboard-write; fullscreen"
                  onLoad={() => {
                    setViewerLoading(false);
                    pushFerryCredentials();
                    window.setTimeout(pushFerryCredentials, 250);
                    window.setTimeout(pushFerryCredentials, 800);
                  }}
                />
              </div>
            </div>
          )}

          {!viewerOpen && !filesOpen && (
            <div className="session-stage">
              <div className={`session-stage-card${sel.rustdeskId && sel.rustdeskPassword ? " ready" : ""}`}>
                <div className="session-stage-ico" aria-hidden>
                  <Ic name="monitor" />
                </div>
                {sel.rustdeskId && sel.rustdeskPassword ? (
                  <>
                    <strong>Ready to control {sel.name}</strong>
                    <span>
                      Opens the remote desktop <em>inside this page</em> — no second app, no approve click on the laptop.
                    </span>
                    <button
                      className={`btn primary session-connect-cta${connectFlash ? " flash" : ""}`}
                      type="button"
                      disabled={viewerLoading}
                      onClick={startConnect}
                    >
                      {viewerLoading ? (
                        <>
                          <span className="session-connect-spin" aria-hidden />
                          Connecting…
                        </>
                      ) : (
                        <>
                          <Ic name="monitor" sm />
                          Connect now
                        </>
                      )}
                    </button>
                    <small className="session-stage-hint">Password is copied for you when available</small>
                  </>
                ) : sel.rustdeskId ? (
                  <>
                    <strong>ID known — password not synced yet</strong>
                    <span>
                      On the laptop run <code>cd client; .\run.ps1</code> once as Admin, wait one heartbeat, then Connect.
                    </span>
                    <button className="btn primary session-connect-cta" type="button" onClick={startConnect}>
                      <Ic name="monitor" sm />
                      Open viewer anyway
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Remote not set up on this laptop yet</strong>
                    <span>
                      On {sel.name}: <code>cd client; .\run.ps1</code> once (Admin). That one command installs RustDesk + starts the Hudl agent.
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {filesOpen && (
            <FileExplorer
              deviceId={sel.id}
              hostname={sel.hostname}
              onClose={() => setFilesOpen(false)}
              onToast={fireToast}
            />
          )}

        </div>

        <div className="rdp-controls">
          <button
            type="button"
            className={`ctrl${viewerOpen ? " on" : ""}${connectFlash ? " flash" : ""}`}
            disabled={!sel.rustdeskId || viewerLoading}
            onClick={() => (viewerOpen ? closeViewer() : startConnect())}
          >
            {viewerLoading ? (
              <>
                <span className="session-connect-spin" aria-hidden />
                Connecting…
              </>
            ) : (
              <>
                <Ic name="monitor" sm />
                {viewerOpen ? "Connected" : "Connect"}
              </>
            )}
          </button>
          <button
            type="button"
            className={filesOpen ? "ctrl on" : "ctrl"}
            onClick={() => {
              setFilesOpen((v) => !v);
              if (!filesOpen) setViewerOpen(false);
            }}
          >
            <Ic name="folder" sm />Files
          </button>
          <button type="button" className="ctrl" onClick={toggleFullscreen}>
            <Ic name="fullscreen" sm />{isFs ? "Exit FS" : "Fullscreen"}
          </button>
          <button
            type="button"
            className="btn danger small"
            style={{ marginLeft: "auto" }}
            onClick={() => setEndConfirmOpen(true)}
          >
            <Ic name="close" sm />End session
          </button>
        </div>
      </div>

      {endConfirmOpen
        && typeof document !== "undefined"
        && createPortal(
          <div
            className="ex-dialog-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEndConfirmOpen(false);
            }}
          >
            <div
              className="ex-dialog danger"
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-session-title"
            >
              <div className="ex-dialog-head">
                <strong id="end-session-title">End session?</strong>
                <span>
                  This closes the remote viewer and returns you to Devices
                  {sel ? ` — ${sel.name}` : ""}.
                </span>
              </div>
              <div className="ex-dialog-actions">
                <button
                  className="btn small"
                  type="button"
                  onClick={() => setEndConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn small danger"
                  type="button"
                  onClick={confirmEndSession}
                >
                  End session
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
