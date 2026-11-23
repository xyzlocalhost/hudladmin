"use client";

import { useState, useEffect, ReactNode } from "react";

/* ---- icons ---- */
const icons: Record<string, ReactNode> = {
  overview: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  monitor: (<><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>),
  laptop: (<><rect x="4" y="3" width="16" height="12" rx="2" /><path d="M2 20h20" /></>),
  devices: (<><rect x="4" y="3" width="16" height="12" rx="2" /><path d="M2 20h20M9 15l-1 5M15 15l1 5" /></>),
  vault: (<><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" /><path d="M9.5 12l1.8 1.8L15 10" /></>),
  shield: (<path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" />),
  lock: (<><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>),
  activity: (<path d="M3 12h4l2 6 4-14 2 8h6" />),
  settings: (<><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 00-.14-1.4l2-1.5-2-3.4-2.3 1a7 7 0 00-2.4-1.4L13.8 2h-3.6l-.36 2.3a7 7 0 00-2.4 1.4l-2.3-1-2 3.4 2 1.5A7 7 0 005 12a7 7 0 00.14 1.4l-2 1.5 2 3.4 2.3-1a7 7 0 002.4 1.4l.36 2.3h3.6l.36-2.3a7 7 0 002.4-1.4l2.3 1 2-3.4-2-1.5A7 7 0 0019 12z" /></>),
  power: (<path d="M12 2v8M6.5 6.5a8 8 0 1011 0" />),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  bell: (<><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 003.4 0" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  logo: (<path d="M6 4v16M18 4v16M6 12h12" />),
  alert: (<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />),
  chevron: (<path d="M9 6l6 6-6 6" />),
  folder: (<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />),
  doc: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 000 18M12 3a14 14 0 010 18" /></>),
  menu: (<path d="M4 6h16M4 12h16M4 18h10" />),
  keyboard: (<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M8 13h8" /></>),
  clipboard: (<><rect x="9" y="3" width="6" height="4" rx="1" /><rect x="5" y="5" width="14" height="16" rx="2" /></>),
  fullscreen: (<path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />),
  close: (<path d="M18 6 6 18M6 6l12 12" />),
};

function Ic({ name, sm }: { name: string; sm?: boolean }) {
  return <svg className={sm ? "i i-sm" : "i"} viewBox="0 0 24 24">{icons[name]}</svg>;
}

/* ---- demo data ---- */
type Device = {
  id: string; name: string; os: string; icon: string;
  on: boolean; cpu: string; ram: string; up: string; ping: string;
};

const devices: Device[] = [
  { id: "home",   name: "Home PC",        os: "Windows 11 · Home network", icon: "monitor", on: true,  cpu: "12%", ram: "6.1 GB", up: "3d 4h",  ping: "41 ms" },
  { id: "work",   name: "Work Laptop",    os: "Ubuntu 24.04",              icon: "laptop",  on: true,  cpu: "28%", ram: "9.4 GB", up: "6h 12m", ping: "58 ms" },
  { id: "office", name: "Office Desktop", os: "Windows 11 · Office",       icon: "monitor", on: true,  cpu: "7%",  ram: "4.0 GB", up: "1d 2h",  ping: "33 ms" },
  { id: "studio", name: "Studio iMac",    os: "macOS Sonoma",              icon: "monitor", on: true,  cpu: "19%", ram: "11 GB",  up: "9h 40m", ping: "47 ms" },
  { id: "server", name: "Home Server",    os: "Debian 12 · headless",      icon: "monitor", on: false, cpu: "—",   ram: "—",      up: "—",      ping: "—" },
  { id: "spare",  name: "Spare Laptop",   os: "Windows 10",                icon: "laptop",  on: false, cpu: "—",   ram: "—",      up: "—",      ping: "—" },
];

const titles: Record<string, [string, string]> = {
  overview: ["Overview", "A quick look at your connected workspace."],
  devices: ["My devices", "Pick a computer to open a secure remote session."],
  session: ["Remote screen", "Live view of your trusted device. Demo screen only."],
  alerts: ["Alerts", "New devices, sessions and anything that needs your attention."],
  vault: ["Credential vault", "A protected place for logins you own."],
  activity: ["Activity logs", "Review important workspace and session events."],
  settings: ["Settings", "Manage authentication, device trust and session permissions."],
};

const navItems = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "devices", label: "My devices", icon: "devices" },
  { id: "session", label: "Remote screen", icon: "monitor" },
  { id: "vault", label: "Credential vault", icon: "vault" },
  { id: "alerts", label: "Alerts", icon: "bell" },
  { id: "activity", label: "Activity logs", icon: "activity" },
];

/* a control button that remembers its own on/off */
function Ctrl({ icon, label, on: initial }: { icon: string; label: string; on?: boolean }) {
  const [on, setOn] = useState(!!initial);
  return (
    <button className={on ? "ctrl on" : "ctrl"} onClick={() => setOn(!on)}>
      <Ic name={icon} sm />{label}
    </button>
  );
}

export default function HudlFront() {
  const [view, setView] = useState("overview");
  const [sel, setSel] = useState<Device>(devices[0]);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });
  const [clock, setClock] = useState("");

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

  function go(next: string) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function fireToast(msg: string) {
    setToast({ show: true, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  }
  function openSession(id: string) {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    setSel(d);
    go("session");
  }

  const [t0, t1] = titles[view];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo"><svg viewBox="0 0 24 24">{icons.logo}</svg></div>
          <div className="brandtext"><strong>HUDL FRONT</strong><small>REMOTE WORKSPACE</small></div>
        </div>
        <div className="navlabel">WORKSPACE</div>
        <nav className="nav">
          {navItems.map((n) => (
            <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => go(n.id)}>
              <Ic name={n.icon} /><span className="navtext">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="navlabel">PREFERENCES</div>
        <nav className="nav">
          <button className={view === "settings" ? "active" : ""} onClick={() => go("settings")}>
            <Ic name="settings" /><span className="navtext">Settings</span>
          </button>
        </nav>
        <div className="sidebottom">
          <div className="secure">
            <div className="shd"><Ic name="shield" sm />Secure workspace</div>
            <p>Dashboard is in demo mode. Pair a trusted device to enable live features.</p>
          </div>
          <div className="profile">
            <div className="avatar">O</div>
            <div><strong>Workspace owner</strong><small>Administrator</small></div>
          </div>
        </div>
      </aside>

      <main>
        <div className="top">
          <div>
            <div className="eyebrow">PERSONAL CONTROL CENTER</div>
            <h1>{t0}</h1>
            <p>{t1}</p>
          </div>
          <div className="actions">
            <span className="chip neutral">Demo environment</span>
            <button className="iconbtn" onClick={() => fireToast("You're all caught up.")}><Ic name="bell" sm /></button>
            <button className="btn primary" onClick={() => fireToast("Device pairing preview. Add your agent pairing API to enable this.")}><Ic name="plus" sm />Pair a device</button>
          </div>
        </div>

        {/* OVERVIEW */}
        {view === "overview" && (
          <section className="view active">
            <div className="grid stats">
              {[
                { label: "Devices online", icon: "power", num: "4", sub: "of 6 paired", to: "devices" },
                { label: "Active sessions", icon: "clock", num: "0", sub: "Tap to start one", to: "devices" },
                { label: "Saved logins", icon: "lock", num: "12", sub: "In your vault", to: "vault" },
                { label: "Alerts", icon: "bell", num: "2", sub: "New device waiting", to: "alerts" },
              ].map((s) => (
                <div className="card click" key={s.label} onClick={() => go(s.to)}>
                  <span className="go"><Ic name="chevron" sm /></span>
                  <div className="stathead"><span>{s.label}</span><div className="staticon"><Ic name={s.icon} sm /></div></div>
                  <div className="statnum">{s.num}</div>
                  <div className="sub">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="cardhead"><h2>Jump back in</h2><button className="btn small" onClick={() => go("devices")}>All devices</button></div>
              <div className="note"><Ic name="alert" sm />This is a demo build. Screens shown in a session are mock images, not a live machine.</div>
            </div>
          </section>
        )}

        {/* DEVICES */}
        {view === "devices" && (
          <section className="view active">
            <div className="grid devgrid">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className={d.on ? "devcard" : "devcard off"}
                  onClick={() => d.on && openSession(d.id)}
                >
                  <div className="devtop">
                    <div className="deviceicon"><Ic name={d.icon} /></div>
                    <div className="devmeta">
                      <strong>{d.name}</strong>
                      <span>{d.os}</span>
                      <div className={d.on ? "devstate on" : "devstate off"}>{d.on ? "Reachable now" : "Offline"}</div>
                    </div>
                  </div>
                  <div className="devstats">
                    <div className="ds"><b>{d.cpu}</b><small>CPU</small></div>
                    <div className="ds"><b>{d.ram}</b><small>RAM</small></div>
                    <div className="ds"><b>{d.up}</b><small>Uptime</small></div>
                  </div>
                  <div className="devfoot">
                    {d.on ? (
                      <button className="btn primary small" onClick={(e) => { e.stopPropagation(); openSession(d.id); }}>Connect</button>
                    ) : (
                      <button className="btn small" onClick={(e) => { e.stopPropagation(); fireToast("Wake signal sent. The machine will appear online once its agent checks in."); }}>Wake &amp; connect</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="note"><Ic name="alert" sm />Click any online computer to open a demo remote session. Offline machines can be sent a wake signal.</div>
          </section>
        )}

        {/* SESSION (mock remote desktop) */}
        {view === "session" && (
          <section className="view active">
            <div className="session-head">
              <div className="session-id">
                <div className="deviceicon"><Ic name={sel.icon} /></div>
                <div><strong>{sel.name}</strong><span>{sel.os}</span></div>
              </div>
              <div className="session-meta">
                <span className="m">Latency <b>{sel.ping}</b></span>
                <span className="m">Quality <b>Auto</b></span>
                <span className="chip ok">Live session</span>
              </div>
            </div>

            <div className="rdp">
              <div className="rdp-screen">
                <div className="rdp-badge">DEMO SCREEN · not a live machine</div>
                <div className="desktop-icons">
                  <div className="dicon"><div className="box"><Ic name="folder" /></div><span>Projects</span></div>
                  <div className="dicon"><div className="box"><Ic name="doc" /></div><span>Docs</span></div>
                  <div className="dicon"><div className="box"><Ic name="globe" /></div><span>Browser</span></div>
                </div>

                <div className="win win1">
                  <div className="win-bar"><i style={{ background: "#ff6058" }} /><i style={{ background: "#ffbd2e" }} /><i style={{ background: "#28c840" }} /><span className="t">Terminal — bash</span></div>
                  <div className="body">
                    <p><span className="c">bobo@pc</span>:~$ npm run dev</p>
                    <p>&gt; next dev</p>
                    <p style={{ color: "#aab6c6" }}>ready - started server on 0.0.0.0:3000</p>
                    <p><span className="c">bobo@pc</span>:~$ <span style={{ color: "#e0a43b" }}>█</span></p>
                  </div>
                </div>

                <div className="win win2">
                  <div className="win-bar"><i style={{ background: "#ff6058" }} /><i style={{ background: "#ffbd2e" }} /><i style={{ background: "#28c840" }} /><span className="t">File Explorer</span></div>
                  <div className="body">
                    <div className="row"><div className="sq" /><div style={{ flex: 1 }}><div className="wl" style={{ width: "70%" }} /></div></div>
                    <div className="row"><div className="sq" /><div style={{ flex: 1 }}><div className="wl g" style={{ width: "55%" }} /></div></div>
                    <div className="row"><div className="sq" /><div style={{ flex: 1 }}><div className="wl" style={{ width: "62%" }} /></div></div>
                  </div>
                </div>

                <div className="taskbar">
                  <div className="tb-start"><Ic name="logo" /></div>
                  <div className="tb-app" /><div className="tb-app" /><div className="tb-app" />
                  <span className="tb-clock">{clock}</span>
                </div>
              </div>

              <div className="rdp-controls">
                <Ctrl icon="menu" label="Full control" on />
                <Ctrl icon="keyboard" label="Keyboard" />
                <Ctrl icon="clipboard" label="Clipboard" />
                <Ctrl icon="folder" label="Files" />
                <button className="ctrl" onClick={() => fireToast("Fullscreen is available in the live build.")}><Ic name="fullscreen" sm />Fullscreen</button>
                <button className="btn danger small" style={{ marginLeft: "auto" }} onClick={() => { fireToast("Session ended."); go("devices"); }}><Ic name="close" sm />End session</button>
              </div>
            </div>
          </section>
        )}

        {/* ALERTS */}
        {view === "alerts" && (
          <section className="view active">
            <div className="card">
              <div className="cardhead"><h2>Alerts</h2><span className="chip neutral">2 new</span></div>
              <div className="alertlist">
                <div className="alert new">
                  <div className="evicon g"><Ic name="monitor" sm /></div>
                  <div className="atext"><strong>New device connected</strong><span>Studio iMac just paired and is online. Start a session to view it.</span></div>
                  <span className="atime">2m ago</span>
                  <button className="btn primary small" onClick={() => openSession("studio")}>Connect screen</button>
                </div>
                <div className="alert new">
                  <div className="evicon a"><Ic name="laptop" sm /></div>
                  <div className="atext"><strong>New device waiting to pair</strong><span>Spare Laptop is requesting access. Approve it to add it to your workspace.</span></div>
                  <span className="atime">18m ago</span>
                  <button className="btn small" onClick={() => fireToast("Device approved and added to your workspace.")}>Approve</button>
                </div>
                <div className="alert">
                  <div className="evicon"><Ic name="power" sm /></div>
                  <div className="atext"><strong>Device went offline</strong><span>Home Server stopped responding. You can send a wake signal.</span></div>
                  <span className="atime">1h ago</span>
                  <button className="btn small" onClick={() => fireToast("Wake signal sent. The machine will appear online once its agent checks in.")}>Wake</button>
                </div>
              </div>
              <div className="note"><Ic name="alert" sm />Demo alerts. In the live build these fire from your desktop agents when a device pairs, connects or drops.</div>
            </div>
          </section>
        )}

        {/* VAULT */}
        {view === "vault" && (
          <section className="view active">
            <div className="card">
              <div className="cardhead"><h2>Credential vault</h2><span className="chip">Locked preview</span></div>
              <div className="screen"><div className="screeninner"><div className="mico"><Ic name="lock" /></div><strong>Keep your credentials protected</strong><span>A secure vault backend is required before adding or retrieving logins you own.</span></div></div>
              <div className="note"><Ic name="alert" sm />Use strong encryption, a separate vault unlock step, MFA and audit logs. Store only logins you own.</div>
            </div>
          </section>
        )}

        {/* ACTIVITY */}
        {view === "activity" && (
          <section className="view active">
            <div className="card">
              <div className="cardhead"><h2>Activity logs</h2><span className="lbl">LATEST EVENTS</span></div>
              <div className="note" style={{ marginTop: 0 }}><Ic name="clock" sm />Session and workspace events will appear here once devices are live.</div>
            </div>
          </section>
        )}

        {/* SETTINGS */}
        {view === "settings" && (
          <section className="view active">
            <div className="card">
              <div className="cardhead"><h2>Workspace settings</h2></div>
              <div className="note" style={{ marginTop: 0 }}><Ic name="shield" sm />Authentication, trusted devices and session permissions are managed here.</div>
            </div>
          </section>
        )}

        <div className="foot">Hudl Front · Frontend concept · Demo data only</div>
      </main>

      <div className={toast.show ? "toast show" : "toast"}>
        <svg className="i i-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}
