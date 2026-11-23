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
  const { launchRustDesk } = useOpenSession();

  const sel = devices.find((d) => d.id === deviceId) ?? null;
  const offlineWarned = useRef(false);

  const [clock, setClock] = useState("");
  const [fullControl, setFullControl] = useState(true);
  const [keyboardOn, setKeyboardOn] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [streamQuality, setStreamQuality] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const rdpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      let h = n.getHours();
      const m = String(n.getMinutes()).padStart(2, "0");
      const ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setClock(`${h}:${m} ${ap}`);
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

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
          {sel.rustdeskId && <span className="m">RustDesk <b>{sel.rustdeskId}</b></span>}
          <span className={`chip ${sel.status === "online" ? "ok" : sel.status === "stale" ? "neutral" : "off"}`}>
            {statusLabel(sel.status)}
          </span>
          <button className="btn primary small" type="button" onClick={() => launchRustDesk(sel)}>
            Open RustDesk
          </button>
        </div>
      </div>

      <div className="rdp" ref={rdpRef}>
        <div className="rdp-screen">
          <div className="desktop-icons">
            <div className="dicon"><div className="box"><Ic name="folder" /></div><span>Projects</span></div>
            <div className="dicon"><div className="box"><Ic name="doc" /></div><span>Docs</span></div>
            <div className="dicon"><div className="box"><Ic name="globe" /></div><span>Browser</span></div>
            <div className="dicon"><div className="box"><Ic name="terminal" /></div><span>Terminal</span></div>
          </div>

          <div className="win win1">
            <div className="win-bar">
              <i style={{ background: "#ff6058" }} /><i style={{ background: "#ffbd2e" }} /><i style={{ background: "#28c840" }} />
              <span className="t">Terminal — PowerShell</span>
            </div>
            <div className="body">
              <p><span className="c">PS {sel.hostname}&gt;</span> git status</p>
              <p style={{ color: "#aab6c6" }}>On branch main · clean</p>
              <p><span className="c">PS {sel.hostname}&gt;</span> git push origin main</p>
              <p style={{ color: "#8fe0b0" }}>Pushed. CI will deploy.</p>
              <p><span className="c">PS {sel.hostname}&gt;</span> <span style={{ color: "#e0a43b" }}>█</span></p>
            </div>
          </div>

          <div className="win win2">
            <div className="win-bar">
              <i style={{ background: "#ff6058" }} /><i style={{ background: "#ffbd2e" }} /><i style={{ background: "#28c840" }} />
              <span className="t">Cursor — agent</span>
            </div>
            <div className="body">
              <div className="row"><div className="sq" /><div style={{ flex: 1 }}><div className="wl" style={{ width: "78%" }} /></div></div>
              <div className="row"><div className="sq" /><div style={{ flex: 1 }}><div className="wl g" style={{ width: "58%" }} /></div></div>
              <div className="row"><div className="sq" /><div style={{ flex: 1 }}><div className="wl" style={{ width: "66%" }} /></div></div>
            </div>
          </div>

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
              Keyboard capture on — keys go to {sel.name}. Tap Keyboard again to release.
            </div>
          )}

          <div className="taskbar">
            <div className="tb-start"><Ic name="logo" /></div>
            <div className="tb-app" /><div className="tb-app" /><div className="tb-app" />
            <span className="tb-clock">{clock}</span>
          </div>
        </div>

        <div className="rdp-controls">
          <button
            type="button"
            className={fullControl ? "ctrl on" : "ctrl"}
            onClick={() => { setFullControl((v) => !v); fireToast(fullControl ? "View only." : "Full control on."); }}
          >
            <Ic name="menu" sm />Full control
          </button>
          <button
            type="button"
            className={keyboardOn ? "ctrl on" : "ctrl"}
            onClick={() => { setKeyboardOn((v) => !v); fireToast(keyboardOn ? "Keyboard capture off." : "Keyboard capture on."); }}
          >
            <Ic name="keyboard" sm />Keyboard
          </button>
          <button
            type="button"
            className={filesOpen ? "ctrl on" : "ctrl"}
            onClick={() => setFilesOpen((v) => !v)}
          >
            <Ic name="folder" sm />Files
          </button>
          <button
            type="button"
            className="ctrl"
            title="Stream quality for Hudl's own remote video channel (bandwidth vs clarity)."
            onClick={() => {
              const next = (streamQuality + 1) % streamModes.length;
              setStreamQuality(next);
              fireToast(`Stream quality → ${streamModes[next]} (Hudl encoder).`);
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
