"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileExplorer } from "@/components/console/file-explorer";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Ic } from "@/components/ui/icons";
import { useOpenSession } from "@/hooks/useOpenSession";
import { statusLabel, streamModes } from "@/lib/console-nav";
import { fmtPing } from "@/lib/device-format";

export default function SessionDevicePage() {
  const params = useParams<{ deviceId: string }>();
  const deviceId = params.deviceId;
  const router = useRouter();
  const { devices, loading } = useFleetContext();
  const { fireToast } = useToast();
  const { rustdeskWebViewerUrl } = useOpenSession();

  const sel = devices.find((d) => d.id === deviceId) ?? null;
  const offlineWarned = useRef(false);

  const [fullControl, setFullControl] = useState(true);
  const [keyboardOn, setKeyboardOn] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [streamQuality, setStreamQuality] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const rdpRef = useRef<HTMLDivElement>(null);
  const viewerBase = rustdeskWebViewerUrl();

  function startConnect() {
    if (!sel?.rustdeskId) {
      fireToast("Remote not ready. On that laptop: cd client; .\\run.ps1");
      return;
    }
    setFilesOpen(false);
    setViewerOpen(true);
    if (sel.rustdeskPassword && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(sel.rustdeskPassword).then(
        () => fireToast("Password copied — paste it in the viewer if asked."),
        () => fireToast("Viewer open — use the password from the laptop setup if asked."),
      );
    } else {
      fireToast("Viewer open in this panel.");
    }
  }

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    offlineWarned.current = false;
    setFullControl(true);
    setKeyboardOn(false);
    setFilesOpen(false);
    setViewerOpen(false);
    setStreamQuality(0);
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
          <span className="m">Stream <b>{streamModes[streamQuality]}</b></span>
          <span className="m">Seen <b>{sel.lastSeen}</b></span>
          {sel.rustdeskId && <span className="m">Remote ID <b>{sel.rustdeskId}</b></span>}
          <span className={`chip ${sel.status === "online" ? "ok" : sel.status === "stale" ? "neutral" : "off"}`}>
            {statusLabel(sel.status)}
          </span>
          <button
            className="btn primary small"
            type="button"
            disabled={!sel.rustdeskId}
            onClick={startConnect}
          >
            Connect
          </button>
        </div>
      </div>

      <div className="rdp" ref={rdpRef}>
        <div className="rdp-screen">
          {viewerOpen && !filesOpen && (
            <div className="session-viewer">
              <div className="session-viewer-bar">
                <span>
                  Controlling <b>{sel.name}</b>
                  {sel.rustdeskId ? ` · ID ${sel.rustdeskId}` : ""}
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
                  <button className="btn small" type="button" onClick={() => setViewerOpen(false)}>
                    Close viewer
                  </button>
                </div>
              </div>
              <iframe
                className="session-viewer-frame"
                title={`Remote ${sel.name}`}
                src={`${viewerBase}/`}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          )}

          {!viewerOpen && !filesOpen && (
            <div className="session-stage">
              <div className="session-stage-card">
                <Ic name="monitor" />
                {sel.rustdeskId && sel.rustdeskPassword ? (
                  <>
                    <strong>Ready to control {sel.name}</strong>
                    <span>
                      Connect opens the remote desktop <em>inside this page</em> (no second app on your phone/PC).
                      The laptop already has unattended access — no approve click there.
                    </span>
                    <button className="btn primary" type="button" onClick={startConnect}>
                      Connect now
                    </button>
                  </>
                ) : sel.rustdeskId ? (
                  <>
                    <strong>ID known — password not synced yet</strong>
                    <span>
                      On the laptop run <code>cd client; .\run.ps1</code> once as Admin, wait one heartbeat, then Connect.
                    </span>
                    <button className="btn primary" type="button" onClick={startConnect}>
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

          {keyboardOn && (
            <div className="kb-hint">
              <Ic name="keyboard" sm />
              Use the in-page Connect viewer for keyboard/mouse on the remote desktop.
            </div>
          )}
        </div>

        <div className="rdp-controls">
          <button
            type="button"
            className={viewerOpen ? "ctrl on" : "ctrl"}
            disabled={!sel.rustdeskId}
            onClick={() => (viewerOpen ? setViewerOpen(false) : startConnect())}
          >
            <Ic name="monitor" sm />Connect
          </button>
          <button
            type="button"
            className={fullControl ? "ctrl on" : "ctrl"}
            onClick={() => { setFullControl((v) => !v); fireToast(fullControl ? "View only (when stream is live)." : "Full control preferred."); }}
          >
            <Ic name="menu" sm />Full control
          </button>
          <button
            type="button"
            className={keyboardOn ? "ctrl on" : "ctrl"}
            onClick={() => { setKeyboardOn((v) => !v); fireToast(keyboardOn ? "Keyboard hint off." : "Keyboard hint on."); }}
          >
            <Ic name="keyboard" sm />Keyboard
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
          <button
            type="button"
            className="ctrl"
            title="Placeholder for a future Hudl-native encoder."
            onClick={() => {
              const next = (streamQuality + 1) % streamModes.length;
              setStreamQuality(next);
              fireToast(`Stream preference → ${streamModes[next]} (used when native stream ships).`);
            }}
          >
            <Ic name="quality" sm />Stream · {streamModes[streamQuality]}
          </button>
          <button type="button" className="ctrl" onClick={toggleFullscreen}>
            <Ic name="fullscreen" sm />{isFs ? "Exit FS" : "Fullscreen"}
          </button>
          <button
            type="button"
            className="btn danger small"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              fireToast("Session ended.");
              router.push("/devices");
            }}
          >
            <Ic name="close" sm />End session
          </button>
        </div>
      </div>
    </section>
  );
}
