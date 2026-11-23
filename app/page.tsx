"use client";

import { useState, useEffect, useRef, useMemo, ReactNode } from "react";

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
  power: (<path d="M12 2v8M6.5 6.5a8 8 0 1011 0" />),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  bell: (<><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 003.4 0" /></>),
  logo: (<path d="M6 4v16M18 4v16M6 12h12" />),
  alert: (<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />),
  chevron: (<path d="M9 6l6 6-6 6" />),
  chevronUp: (<path d="M18 15l-6-6-6 6" />),
  folder: (<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />),
  doc: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 000 18M12 3a14 14 0 010 18" /></>),
  menu: (<path d="M4 6h16M4 12h16M4 18h10" />),
  keyboard: (<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M8 13h8" /></>),
  clipboard: (<><rect x="9" y="3" width="6" height="4" rx="1" /><rect x="5" y="5" width="14" height="16" rx="2" /></>),
  fullscreen: (<path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />),
  close: (<path d="M18 6 6 18M6 6l12 12" />),
  eye: (<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>),
  copy: (<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>),
  battery: (<><rect x="2" y="7" width="18" height="10" rx="2" /><path d="M20 10v4M7 11h4" /></>),
  signal: (<path d="M2 20h4V10H2zM10 20h4V4h-4zM18 20h4v-8h-4z" />),
  terminal: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M12 15h5" /></>),
  quality: (<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.3 7.1 18.2l.9-5.5-4-3.9L9.5 8z" />),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" /></>),
  upload: (<path d="M12 16V4M7 9l5-5 5 5M4 20h16" />),
  download: (<path d="M12 4v12M7 11l5 5 5-5M4 20h16" />),
  home: (<path d="M3 11l9-8 9 8M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />),
  refresh: (<path d="M21 12a9 9 0 11-3-6.7M21 4v6h-6" />),
  disk: (<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>),
  filter: (<path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />),
};

function Ic({ name, sm }: { name: string; sm?: boolean }) {
  return <svg className={sm ? "i i-sm" : "i"} viewBox="0 0 24 24">{icons[name]}</svg>;
}

/* ---- domain types ---- */
type DeviceStatus = "online" | "stale" | "offline";

type Device = {
  id: string;
  name: string;
  hostname: string;
  os: string;
  icon: string;
  status: DeviceStatus;
  role: string;
  cpu: number | null;
  ramUsedGb: number | null;
  ramTotalGb: number | null;
  battery: number | null;
  uptime: string;
  pingMs: number | null;
  lastSeen: string;
  agentVersion: string;
  lanIp: string;
};

type VaultItem = {
  id: string;
  label: string;
  username: string;
  password: string;
  url: string;
  deviceId: string;
  tags: string[];
  updated: string;
};

type AlertKind =
  | "online"
  | "offline"
  | "stale"
  | "battery"
  | "session"
  | "disk"
  | "agent"
  | "vault"
  | "connect";

type AlertItem = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  time: string;
  deviceId?: string;
  unread?: boolean;
};

type ActivityKind = "session" | "agent" | "vault" | "files" | "system";

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  icon: string;
  title: string;
  detail: string;
  deviceId?: string;
  time: string;
};

type FsEntry = {
  name: string;
  type: "dir" | "file";
  size?: string;
  modified: string;
  children?: FsEntry[];
};

const devices: Device[] = [
  { id: "school", name: "School ThinkPad", hostname: "SCHOOL-TP14", os: "Windows 11 Pro", icon: "laptop", status: "online", role: "School assignments", cpu: 18, ramUsedGb: 7.2, ramTotalGb: 16, battery: 64, uptime: "1d 6h", pingMs: 38, lastSeen: "just now", agentVersion: "0.1.0", lanIp: "192.168.1.41" },
  { id: "co1", name: "Acme Workbook", hostname: "ACME-DEV-07", os: "Windows 11 Pro", icon: "laptop", status: "online", role: "Company A · engineering", cpu: 42, ramUsedGb: 11.4, ramTotalGb: 32, battery: 81, uptime: "9h 20m", pingMs: 44, lastSeen: "4s ago", agentVersion: "0.1.0", lanIp: "192.168.1.52" },
  { id: "co2", name: "Northwind Dell", hostname: "NW-LAT-03", os: "Windows 11 Enterprise", icon: "laptop", status: "online", role: "Company B · support", cpu: 9, ramUsedGb: 5.1, ramTotalGb: 16, battery: 52, uptime: "5h 8m", pingMs: 51, lastSeen: "9s ago", agentVersion: "0.1.0", lanIp: "192.168.1.63" },
  { id: "co3", name: "Orbit Surface", hostname: "ORBIT-SF9", os: "Windows 11 Home", icon: "laptop", status: "stale", role: "Company C · ops", cpu: 23, ramUsedGb: 8.0, ramTotalGb: 16, battery: 22, uptime: "2d 1h", pingMs: 120, lastSeen: "2m ago", agentVersion: "0.1.0", lanIp: "192.168.1.74" },
  { id: "home", name: "Home Desk", hostname: "HOME-DESK", os: "Windows 11 Pro", icon: "monitor", status: "online", role: "Personal · Cursor / CI", cpu: 31, ramUsedGb: 14.2, ramTotalGb: 32, battery: null, uptime: "4d 11h", pingMs: 29, lastSeen: "just now", agentVersion: "0.1.0", lanIp: "192.168.1.17" },
  { id: "travel", name: "Travel Yoga", hostname: "TRAVEL-YOGA", os: "Windows 11 Home", icon: "laptop", status: "offline", role: "On the go · lid closed", cpu: null, ramUsedGb: null, ramTotalGb: 16, battery: null, uptime: "—", pingMs: null, lastSeen: "3h ago", agentVersion: "0.1.0", lanIp: "—" },
  { id: "lab", name: "Lab Spare", hostname: "LAB-SPARE", os: "Windows 10 Pro", icon: "laptop", status: "offline", role: "Spare · under the table", cpu: null, ramUsedGb: null, ramTotalGb: 8, battery: null, uptime: "—", pingMs: null, lastSeen: "Yesterday", agentVersion: "0.0.9", lanIp: "—" },
  { id: "media", name: "Media Mini", hostname: "MEDIA-MINI", os: "Windows 11 Pro", icon: "monitor", status: "online", role: "Render / downloads", cpu: 55, ramUsedGb: 10.8, ramTotalGb: 16, battery: null, uptime: "12d 3h", pingMs: 35, lastSeen: "6s ago", agentVersion: "0.1.0", lanIp: "192.168.1.88" },
  { id: "backup", name: "Backup Box", hostname: "BACKUP-BOX", os: "Windows 10 Pro", icon: "monitor", status: "stale", role: "Nightly archives", cpu: 4, ramUsedGb: 3.2, ramTotalGb: 8, battery: null, uptime: "30d", pingMs: 95, lastSeen: "1m ago", agentVersion: "0.1.0", lanIp: "192.168.1.90" },
  { id: "ai", name: "AI Rig", hostname: "AI-RIG-01", os: "Windows 11 Pro", icon: "monitor", status: "online", role: "Local models · heavy jobs", cpu: 67, ramUsedGb: 28.4, ramTotalGb: 64, battery: null, uptime: "2d 9h", pingMs: 27, lastSeen: "just now", agentVersion: "0.1.0", lanIp: "192.168.1.99" },
];

const deviceName = (id?: string) => devices.find((d) => d.id === id)?.name ?? "Unknown device";

function buildVault(): VaultItem[] {
  const seeds: Array<[string, string, string, string, string[]]> = [
    ["GitHub", "you@mail.com", "github.com", "home", ["dev", "ci"]],
    ["University portal", "st2024.you", "portal.uni.edu", "school", ["school"]],
    ["Acme Slack", "you@acme.io", "acme.slack.com", "co1", ["work", "acme"]],
    ["Acme Okta", "you@acme.io", "acme.okta.com", "co1", ["work", "acme"]],
    ["Northwind VPN", "you.nw", "vpn.northwind.local", "co2", ["work", "vpn"]],
    ["Northwind Jira", "you.nw", "northwind.atlassian.net", "co2", ["work"]],
    ["Orbit admin", "admin@orbit.co", "admin.orbit.co", "co3", ["work", "orbit"]],
    ["Orbit email", "you@orbit.co", "mail.orbit.co", "co3", ["work"]],
    ["Vercel", "you@mail.com", "vercel.com", "home", ["ci"]],
    ["Cloudflare", "you@mail.com", "dash.cloudflare.com", "home", ["infra"]],
    ["AWS root (personal)", "you@mail.com", "console.aws.amazon.com", "ai", ["infra"]],
    ["Cursor account", "you@mail.com", "cursor.com", "home", ["dev"]],
    ["Banking", "you.mobile", "bank.example", "travel", ["personal"]],
    ["Steam", "you.gamer", "store.steampowered.com", "media", ["personal"]],
    ["NAS admin", "admin", "nas.home.local", "backup", ["infra"]],
    ["Lab Wi‑Fi router", "admin", "192.168.1.1", "lab", ["infra"]],
  ];

  const extraHosts = ["Notion", "Linear", "Figma", "Discord", "Gmail", "Outlook", "Dropbox", "OneDrive", "Bitbucket", "Docker Hub", "npm", "Hugging Face", "OpenAI", "Anthropic", "Stripe", "PayPal", "Adobe", "Canva", "Zoom", "Teams", "LinkedIn", "Twitter/X", "Reddit", "Twitch", "Spotify", "Netflix", "University Wi‑Fi", "Library proxy", "Course LMS", "Moodle", "Gradle", "Azure", "Heroku", "Render", "Railway", "PlanetScale", "Supabase", "Firebase", "MongoDB Atlas", "Redis Cloud", "Datadog", "Sentry", "Postman", "1Password recovery", "Wi‑Fi guest", "Printer admin", "Camera NVR", "Smart home", "Domain registrar", "Email forwarding", "Tax portal", "Insurance", "Health portal", "Passport site"];

  const items: VaultItem[] = seeds.map(([label, username, url, deviceId, tags], i) => ({
    id: `v${i + 1}`,
    label,
    username,
    password: "••••••••••••",
    url,
    deviceId,
    tags,
    updated: `${(i % 12) + 1}d ago`,
  }));

  extraHosts.forEach((label, i) => {
    const d = devices[i % devices.length];
    items.push({
      id: `vx${i + 1}`,
      label,
      username: i % 3 === 0 ? "you@mail.com" : `user${i}@mail.com`,
      password: "••••••••••••",
      url: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
      deviceId: d.id,
      tags: i % 2 === 0 ? ["personal"] : ["work"],
      updated: `${(i % 20) + 1}d ago`,
    });
  });

  return items;
}

const vaultItems = buildVault();

const alerts: AlertItem[] = [
  { id: "a1", kind: "stale", title: "Orbit Surface missed a check-in", body: "No fresh signal for 2 minutes. The laptop may be sleeping, on flaky Wi‑Fi, or the agent paused. Connect still tries a session if the machine is reachable.", time: "2m ago", deviceId: "co3", unread: true },
  { id: "a2", kind: "battery", title: "Low battery on Orbit Surface", body: "22% and not charging. Plug it in if you need it reachable from class or another room.", time: "6m ago", deviceId: "co3", unread: true },
  { id: "a3", kind: "stale", title: "Backup Box check-in delayed", body: "Last signal 1 minute ago — still within soft grace, but worth watching if archives run overnight.", time: "1m ago", deviceId: "backup", unread: true },
  { id: "a4", kind: "online", title: "School ThinkPad is back", body: "Agent checked in after campus Wi‑Fi dropped. Ready for remote work.", time: "28m ago", deviceId: "school" },
  { id: "a5", kind: "offline", title: "Travel Yoga went quiet", body: "No signal for 3 hours (lid closed is normal). Open the laptop or wake it when you need it.", time: "3h ago", deviceId: "travel" },
  { id: "a6", kind: "disk", title: "Media Mini disk nearly full", body: "C: reported 94% used. Clear downloads or move renders before jobs fail.", time: "5h ago", deviceId: "media" },
  { id: "a7", kind: "agent", title: "Lab Spare is on an old agent", body: "Running 0.0.9 while the rest of the fleet is 0.1.0. Update when you next open that machine.", time: "Yesterday", deviceId: "lab" },
  { id: "a8", kind: "session", title: "Session ended from your phone", body: "Home Desk remote session closed after a git push. CI continued on the machine.", time: "Yesterday", deviceId: "home" },
  { id: "a9", kind: "vault", title: "Vault secret copied", body: "GitHub password copied on this browser. Only you (owner) can unlock the vault.", time: "2d ago", deviceId: "home" },
  { id: "a10", kind: "connect", title: "Connect attempt failed", body: "Travel Yoga refused a session because the agent is offline. Start Hudl on that laptop first.", time: "3h ago", deviceId: "travel" },
  { id: "a11", kind: "online", title: "AI Rig enrolled", body: "New machine checked in automatically after the EXE first ran. No pairing step.", time: "5d ago", deviceId: "ai" },
];

const activity: ActivityItem[] = [
  { id: "e1", kind: "session", icon: "terminal", title: "Terminal used in session", detail: "git push origin main — CI deploy triggered", deviceId: "home", time: "Yesterday · 9:14 PM" },
  { id: "e2", kind: "session", icon: "monitor", title: "Remote session started", detail: "Full control · clipboard sync · from phone", deviceId: "home", time: "Yesterday · 9:02 PM" },
  { id: "e3", kind: "agent", icon: "signal", title: "Agent check-in", detail: "38 ms · Windows 11 Pro · agent 0.1.0", deviceId: "school", time: "Today · 11:42 AM" },
  { id: "e4", kind: "agent", icon: "battery", title: "Battery warning raised", detail: "22% · not charging", deviceId: "co3", time: "Today · 12:10 PM" },
  { id: "e5", kind: "agent", icon: "power", title: "Device went offline", detail: "No check-in after lid close", deviceId: "travel", time: "Today · 9:05 AM" },
  { id: "e6", kind: "vault", icon: "lock", title: "Password copied", detail: "GitHub · copied for login", deviceId: "home", time: "2d ago" },
  { id: "e7", kind: "agent", icon: "globe", title: "Device enrolled", detail: "First check-in after EXE install", deviceId: "ai", time: "5d ago" },
  { id: "e8", kind: "files", icon: "download", title: "File downloaded", detail: "report.pdf from Documents\\school", deviceId: "school", time: "4d ago" },
  { id: "e9", kind: "files", icon: "upload", title: "File uploaded", detail: "deploy.zip → Projects\\hudl", deviceId: "home", time: "4d ago" },
  { id: "e10", kind: "system", icon: "disk", title: "Disk pressure alert", detail: "C: crossed 90% used", deviceId: "media", time: "5h ago" },
  { id: "e12", kind: "agent", icon: "refresh", title: "Agent updated", detail: "0.0.9 → 0.1.0", deviceId: "backup", time: "1w ago" },
  { id: "e13", kind: "vault", icon: "eye", title: "Vault unlocked", detail: "Owner unlocked credential vault on web", time: "2d ago" },
  { id: "e14", kind: "session", icon: "clipboard", title: "Clipboard synced to device", detail: "Pasted deploy token into terminal", deviceId: "home", time: "Yesterday · 9:11 PM" },
];

/** Mock remote filesystem for the in-session explorer */
const fsRoot: FsEntry = {
  name: "C:",
  type: "dir",
  modified: "—",
  children: [
    {
      name: "Users",
      type: "dir",
      modified: "Mar 1, 2026",
      children: [
        {
          name: "You",
          type: "dir",
          modified: "Today",
          children: [
            {
              name: "Desktop",
              type: "dir",
              modified: "Today",
              children: [
                { name: "todo.txt", type: "file", size: "2 KB", modified: "Today" },
                { name: "sprint.png", type: "file", size: "840 KB", modified: "Yesterday" },
              ],
            },
            {
              name: "Documents",
              type: "dir",
              modified: "Yesterday",
              children: [
                {
                  name: "school",
                  type: "dir",
                  modified: "Mon",
                  children: [
                    { name: "assignment-4.docx", type: "file", size: "120 KB", modified: "Mon" },
                    { name: "notes.md", type: "file", size: "8 KB", modified: "Sun" },
                  ],
                },
                {
                  name: "work",
                  type: "dir",
                  modified: "Tue",
                  children: [
                    { name: "runbook.pdf", type: "file", size: "2.1 MB", modified: "Tue" },
                    { name: "creds-ref.txt", type: "file", size: "1 KB", modified: "Jan 12" },
                  ],
                },
              ],
            },
            {
              name: "Downloads",
              type: "dir",
              modified: "Today",
              children: [
                { name: "node-setup.msi", type: "file", size: "28 MB", modified: "Today" },
                { name: "invoice-march.pdf", type: "file", size: "220 KB", modified: "Yesterday" },
                { name: "dataset.zip", type: "file", size: "1.4 GB", modified: "Mar 18" },
              ],
            },
            {
              name: "Projects",
              type: "dir",
              modified: "Today",
              children: [
                {
                  name: "hudl",
                  type: "dir",
                  modified: "Today",
                  children: [
                    { name: "README.md", type: "file", size: "4 KB", modified: "Today" },
                    { name: "web", type: "dir", modified: "Today", children: [
                      { name: "package.json", type: "file", size: "1 KB", modified: "Today" },
                      { name: "app", type: "dir", modified: "Today", children: [
                        { name: "page.tsx", type: "file", size: "48 KB", modified: "Today" },
                      ] },
                    ] },
                    { name: "client", type: "dir", modified: "Mon", children: [
                      { name: "main.py", type: "file", size: "12 KB", modified: "Mon" },
                    ] },
                  ],
                },
                { name: "company-a", type: "dir", modified: "Last week", children: [
                  { name: "api", type: "dir", modified: "Last week", children: [
                    { name: "server.ts", type: "file", size: "22 KB", modified: "Last week" },
                  ] },
                ] },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Program Files",
      type: "dir",
      modified: "Jan 4",
      children: [
        { name: "Hudl", type: "dir", modified: "Mar 1", children: [
          { name: "hudl-agent.exe", type: "file", size: "18 MB", modified: "Mar 1" },
        ] },
      ],
    },
  ],
};

const quickPaths = [
  { label: "Desktop", path: ["C:", "Users", "You", "Desktop"] },
  { label: "Documents", path: ["C:", "Users", "You", "Documents"] },
  { label: "Downloads", path: ["C:", "Users", "You", "Downloads"] },
  { label: "Projects", path: ["C:", "Users", "You", "Projects"] },
];

const titles: Record<string, [string, string]> = {
  overview: ["Overview", "Fleet health and machines ready to control."],
  devices: ["My devices", "Every laptop running the Hudl agent. Search, filter, connect."],
  session: ["Remote screen", "Control the selected machine — stream, files, clipboard."],
  alerts: ["Alerts", "Missed check-ins, battery, disk, sessions, and vault events."],
  vault: ["Credential vault", "Your logins, scoped to devices — search scales past hundreds."],
  activity: ["Activity logs", "Sessions, agent signals, files, and vault access."],
};

const navItems = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "devices", label: "My devices", icon: "devices" },
  { id: "session", label: "Remote screen", icon: "monitor" },
  { id: "vault", label: "Credential vault", icon: "vault" },
  { id: "alerts", label: "Alerts", icon: "bell" },
  { id: "activity", label: "Activity logs", icon: "activity" },
];

const streamModes = ["Auto", "High", "Medium", "Low"] as const;
const VAULT_PAGE = 12;

function statusLabel(s: DeviceStatus) {
  if (s === "online") return "Online";
  if (s === "stale") return "Needs attention";
  return "Offline";
}

function fmtRam(d: Device) {
  if (d.ramUsedGb == null || d.ramTotalGb == null) return "—";
  return `${d.ramUsedGb}/${d.ramTotalGb} GB`;
}

function fmtCpu(d: Device) {
  return d.cpu == null ? "—" : `${d.cpu}%`;
}

function fmtPing(d: Device) {
  return d.pingMs == null ? "—" : `${d.pingMs} ms`;
}

function fmtPower(d: Device) {
  return d.battery == null ? "AC" : `${d.battery}%`;
}

function resolvePath(path: string[]): FsEntry | null {
  let node: FsEntry = fsRoot;
  if (path.length === 1 && path[0] === "C:") return node;
  for (let i = 1; i < path.length; i++) {
    const next = node.children?.find((c) => c.name === path[i]);
    if (!next) return null;
    node = next;
  }
  return node;
}

function DeviceStats({ d }: { d: Device }) {
  return (
    <div className="devstats">
      <div className="ds"><b>{fmtCpu(d)}</b><small>CPU</small></div>
      <div className="ds"><b>{fmtRam(d)}</b><small>RAM</small></div>
      <div className="ds"><b>{fmtPower(d)}</b><small>Power</small></div>
      <div className="ds"><b>{fmtPing(d)}</b><small>Ping</small></div>
    </div>
  );
}

export default function HudlFront() {
  const [view, setView] = useState("overview");
  const [sel, setSel] = useState<Device>(devices.find((d) => d.status === "online") ?? devices[0]);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });
  const [clock, setClock] = useState("");

  const [deviceQuery, setDeviceQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"all" | DeviceStatus>("all");

  const [vaultQuery, setVaultQuery] = useState("");
  const [vaultDevice, setVaultDevice] = useState("all");
  const [vaultPage, setVaultPage] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [alertFilter, setAlertFilter] = useState<"all" | "unread" | AlertKind>("all");
  const [actFilter, setActFilter] = useState<"all" | ActivityKind>("all");

  const [fullControl, setFullControl] = useState(true);
  const [keyboardOn, setKeyboardOn] = useState(false);
  const [clipSync, setClipSync] = useState(true);
  const [clipPanel, setClipPanel] = useState(false);
  const [clipHistory, setClipHistory] = useState([
    { id: "c1", text: "git push origin main", from: "This phone", at: "9:11 PM" },
    { id: "c2", text: "https://github.com/you/hudl", from: "Home Desk", at: "9:08 PM" },
    { id: "c3", text: "sk-demo-not-real", from: "This phone", at: "Yesterday" },
  ]);
  const [clipCurrent, setClipCurrent] = useState("git push origin main");
  const [filesOpen, setFilesOpen] = useState(false);
  const [fsPath, setFsPath] = useState<string[]>(["C:", "Users", "You", "Projects"]);
  const [fsQuery, setFsQuery] = useState("");
  const [fsSelected, setFsSelected] = useState<string | null>(null);
  const [streamQuality, setStreamQuality] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const rdpRef = useRef<HTMLDivElement>(null);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const attentionCount = devices.filter((d) => d.status === "stale").length;
  const unreadAlerts = alerts.filter((a) => a.unread).length;

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

  function go(next: string) {
    setView(next);
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fireToast(msg: string) {
    setToast({ show: true, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3400);
  }

  function openSession(id: string) {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    if (d.status === "offline") {
      fireToast(`${d.name} is offline. Start the Hudl agent on that laptop — it shows up here on the next check-in.`);
      return;
    }
    setSel(d);
    setFullControl(true);
    setKeyboardOn(false);
    setClipSync(true);
    setClipPanel(false);
    setFilesOpen(false);
    setFsPath(["C:", "Users", "You", "Projects"]);
    setFsQuery("");
    setFsSelected(null);
    setStreamQuality(0);
    go("session");
  }

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

  function copyText(label: string, value: string) {
    const run = navigator.clipboard?.writeText(value);
    if (run) {
      run.then(
        () => fireToast(`Copied ${label}`),
        () => fireToast(`Could not copy ${label}`),
      );
    } else {
      fireToast(`${label}: ${value}`);
    }
  }

  const filteredDevices = useMemo(() => {
    const q = deviceQuery.trim().toLowerCase();
    return devices.filter((d) => {
      if (deviceFilter !== "all" && d.status !== deviceFilter) return false;
      if (!q) return true;
      return [d.name, d.hostname, d.role, d.os, d.lanIp].join(" ").toLowerCase().includes(q);
    });
  }, [deviceQuery, deviceFilter]);

  const filteredVault = useMemo(() => {
    const q = vaultQuery.trim().toLowerCase();
    return vaultItems.filter((v) => {
      if (vaultDevice !== "all" && v.deviceId !== vaultDevice) return false;
      if (!q) return true;
      return [v.label, v.username, v.url, ...v.tags, deviceName(v.deviceId)].join(" ").toLowerCase().includes(q);
    });
  }, [vaultQuery, vaultDevice]);

  const vaultPages = Math.max(1, Math.ceil(filteredVault.length / VAULT_PAGE));
  const vaultSlice = filteredVault.slice(vaultPage * VAULT_PAGE, vaultPage * VAULT_PAGE + VAULT_PAGE);

  useEffect(() => { setVaultPage(0); }, [vaultQuery, vaultDevice]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter === "all") return true;
      if (alertFilter === "unread") return !!a.unread;
      return a.kind === alertFilter;
    });
  }, [alertFilter]);

  const filteredActivity = useMemo(() => {
    return activity.filter((e) => (actFilter === "all" ? true : e.kind === actFilter));
  }, [actFilter]);

  const currentDir = resolvePath(fsPath);
  const fsEntries = useMemo(() => {
    const kids = currentDir?.children ?? [];
    const q = fsQuery.trim().toLowerCase();
    const list = q ? kids.filter((e) => e.name.toLowerCase().includes(q)) : kids;
    return [...list].sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [fsPath, fsQuery, currentDir]);

  function enterDir(name: string) {
    setFsPath((p) => [...p, name]);
    setFsSelected(null);
    setFsQuery("");
  }

  function goUp() {
    if (fsPath.length <= 1) return;
    setFsPath((p) => p.slice(0, -1));
    setFsSelected(null);
  }

  const [t0, t1] = titles[view] ?? titles.overview;
  const recent = devices.filter((d) => d.status !== "offline").slice(0, 4);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo"><svg viewBox="0 0 24 24">{icons.logo}</svg></div>
          <div className="brandtext"><strong>HUDL</strong><small>YOUR FLEET</small></div>
        </div>
        <div className="navlabel">WORKSPACE</div>
        <nav className="nav">
          {navItems.map((n) => (
            <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => go(n.id)}>
              <Ic name={n.icon} /><span className="navtext">{n.label}</span>
              {n.id === "alerts" && unreadAlerts > 0 && <span className="navbadge">{unreadAlerts}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebottom">
          <div className="secure">
            <div className="shd"><Ic name="shield" sm />Owner workspace</div>
            <p>Run the agent on a laptop and it shows up here. No pairing codes — this fleet is yours.</p>
          </div>
          <div className="profile">
            <div className="avatar">Y</div>
            <div><strong>You</strong><small>{devices.length} devices · owner</small></div>
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
            <button className="iconbtn" onClick={() => go("alerts")}>
              <Ic name="bell" sm />
              {unreadAlerts > 0 && <span className="dot" />}
            </button>
          </div>
        </div>

        {/* OVERVIEW */}
        {view === "overview" && (
          <section className="view active">
            <div className="grid stats">
              {[
                { label: "Online now", icon: "power", num: String(onlineCount), sub: attentionCount ? `${attentionCount} need attention` : `${devices.length} in fleet`, to: "devices" },
                { label: "Ready to connect", icon: "monitor", num: String(onlineCount + attentionCount), sub: "Online or soft-delayed", to: "devices" },
                { label: "Vault entries", icon: "lock", num: String(vaultItems.length), sub: "Searchable across devices", to: "vault" },
                { label: "Unread alerts", icon: "bell", num: String(unreadAlerts), sub: "Check-ins, battery, disk", to: "alerts" },
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
              <div className="cardhead">
                <h2>Jump back in</h2>
                <button className="btn small" onClick={() => go("devices")}>All devices</button>
              </div>
              <div className="jumpgrid">
                {recent.map((d) => (
                  <button key={d.id} className="jump" onClick={() => openSession(d.id)}>
                    <div className="jump-top">
                      <div className="deviceicon"><Ic name={d.icon} /></div>
                      <div className="jumpmeta">
                        <strong>{d.name}</strong>
                        <span>{d.role}</span>
                        <div className={`devstate ${d.status}`}>{statusLabel(d.status)} · {d.lastSeen}</div>
                      </div>
                    </div>
                    <DeviceStats d={d} />
                    <div className="jump-foot">
                      <span className="tiny muted2">{d.hostname}</span>
                      <span className="chip ok sm">Connect</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DEVICES */}
        {view === "devices" && (
          <section className="view active">
            <div className="toolbar">
              <div className="searchbox">
                <Ic name="search" sm />
                <input
                  value={deviceQuery}
                  onChange={(e) => setDeviceQuery(e.target.value)}
                  placeholder="Search name, hostname, role, IP…"
                />
              </div>
              <div className="chips">
                {(["all", "online", "stale", "offline"] as const).map((f) => (
                  <button
                    key={f}
                    className={deviceFilter === f ? "chipbtn on" : "chipbtn"}
                    onClick={() => setDeviceFilter(f)}
                  >
                    {f === "all" ? `All (${devices.length})` : f === "stale" ? "Needs attention" : f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filteredDevices.length === 0 ? (
              <div className="empty">
                <Ic name="devices" />
                <strong>No devices match</strong>
                <span>Clear filters or install the agent on another laptop — it enrolls itself.</span>
              </div>
            ) : (
              <div className="grid devgrid">
                {filteredDevices.map((d) => (
                  <div
                    key={d.id}
                    className={d.status === "offline" ? "devcard off" : "devcard"}
                    onClick={() => openSession(d.id)}
                  >
                    <div className="devtop">
                      <div className="deviceicon"><Ic name={d.icon} /></div>
                      <div className="devmeta">
                        <strong>{d.name}</strong>
                        <span>{d.os} · {d.hostname}</span>
                        <div className={`devstate ${d.status}`}>{statusLabel(d.status)} · {d.lastSeen}</div>
                      </div>
                    </div>
                    <div className="devrole">{d.role}</div>
                    <DeviceStats d={d} />
                    <div className="devfoot">
                      {d.status === "offline" ? (
                        <button className="btn small" onClick={(e) => { e.stopPropagation(); fireToast(`Waiting on ${d.hostname}. Launch Hudl on that machine.`); }}>
                          Waiting for agent
                        </button>
                      ) : (
                        <button className="btn primary small" onClick={(e) => { e.stopPropagation(); openSession(d.id); }}>
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SESSION */}
        {view === "session" && (
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
                <span className={`chip ${sel.status === "online" ? "ok" : sel.status === "stale" ? "neutral" : "off"}`}>
                  {statusLabel(sel.status)}
                </span>
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
                  <div className="explorer">
                    <div className="explorer-side">
                      <div className="explorer-side-title">On {sel.hostname}</div>
                      {quickPaths.map((q) => (
                        <button
                          key={q.label}
                          className={fsPath.join("/") === q.path.join("/") ? "on" : ""}
                          onClick={() => { setFsPath(q.path); setFsSelected(null); setFsQuery(""); }}
                        >
                          <Ic name="folder" sm />{q.label}
                        </button>
                      ))}
                    </div>
                    <div className="explorer-main">
                      <div className="explorer-bar">
                        <button className="iconbtn sm" title="Up" onClick={goUp} disabled={fsPath.length <= 1}><Ic name="chevronUp" sm /></button>
                        <button className="iconbtn sm" title="Home" onClick={() => setFsPath(["C:", "Users", "You"])}><Ic name="home" sm /></button>
                        <div className="crumbs">
                          {fsPath.map((seg, i) => (
                            <button
                              key={`${seg}-${i}`}
                              onClick={() => setFsPath(fsPath.slice(0, i + 1))}
                            >
                              {seg}
                            </button>
                          ))}
                        </div>
                        <div className="searchbox sm">
                          <Ic name="search" sm />
                          <input value={fsQuery} onChange={(e) => setFsQuery(e.target.value)} placeholder="Filter this folder" />
                        </div>
                        <button className="iconbtn sm" title="Upload to this folder" onClick={() => fireToast("Upload to this folder on the remote machine (via agent).")}><Ic name="upload" sm /></button>
                        <button className="iconbtn sm" title="Download to this phone/PC" disabled={!fsSelected} onClick={() => fireToast(fsSelected ? `Download ${fsSelected} to this browser` : "Select a file")}><Ic name="download" sm /></button>
                        <button className="iconbtn sm" onClick={() => setFilesOpen(false)}><Ic name="close" sm /></button>
                      </div>
                      <div className="explorer-table-head">
                        <span>Name</span><span>Size</span><span>Modified</span>
                      </div>
                      <div className="explorer-list">
                        {fsEntries.length === 0 && (
                          <div className="explorer-empty">Nothing in this folder{fsQuery ? " matches your filter" : ""}.</div>
                        )}
                        {fsEntries.map((e) => (
                          <button
                            key={e.name}
                            className={fsSelected === e.name ? "exrow on" : "exrow"}
                            onClick={() => setFsSelected(e.name)}
                            onDoubleClick={() => {
                              if (e.type === "dir") enterDir(e.name);
                              else fireToast(`${e.name} — preview/download from the web; does not open Explorer on the laptop.`);
                            }}
                          >
                            <span className="exname">
                              <Ic name={e.type === "dir" ? "folder" : "doc"} sm />
                              {e.name}
                            </span>
                            <span>{e.type === "dir" ? "—" : e.size}</span>
                            <span>{e.modified}</span>
                          </button>
                        ))}
                      </div>
                      <div className="explorer-foot">
                        <span>{fsEntries.length} items · browsed in Hudl (web)</span>
                        <span>Folders open here · files download to this device</span>
                      </div>
                    </div>
                  </div>
                )}

                {clipPanel && (
                  <div className="clip-panel">
                    <div className="clip-head">
                      <div>
                        <strong>Clipboard</strong>
                        <span>OS clipboard holds one value. Hudl can sync that live, and keep a short session history here for you.</span>
                      </div>
                      <button className="iconbtn sm" onClick={() => setClipPanel(false)}><Ic name="close" sm /></button>
                    </div>
                    <label className="switchrow">
                      <input type="checkbox" checked={clipSync} onChange={(e) => { setClipSync(e.target.checked); fireToast(e.target.checked ? "Live clipboard sync on." : "Live clipboard sync off."); }} />
                      <span>Sync current clipboard with {sel.name}</span>
                    </label>
                    <div className="clip-current">
                      <div className="lbl">CURRENT</div>
                      <code>{clipCurrent}</code>
                      <div className="clip-acts">
                        <button className="btn small" onClick={() => copyText("clipboard", clipCurrent)}>Copy here</button>
                        <button className="btn small" onClick={() => fireToast(`Sent current clipboard to ${sel.name}.`)}>Send to device</button>
                      </div>
                    </div>
                    <div className="lbl" style={{ marginTop: 12 }}>SESSION HISTORY</div>
                    <ul className="clip-hist">
                      {clipHistory.map((c) => (
                        <li key={c.id}>
                          <code>{c.text}</code>
                          <small>{c.from} · {c.at}</small>
                          <button
                            className="btn small"
                            onClick={() => {
                              setClipCurrent(c.text);
                              setClipHistory((h) => [{ id: `c${Date.now()}`, text: c.text, from: "This phone", at: "now" }, ...h.filter((x) => x.id !== c.id)].slice(0, 8));
                              fireToast("Set as current clipboard.");
                            }}
                          >
                            Use
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
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
                  className={fullControl ? "ctrl on" : "ctrl"}
                  onClick={() => { setFullControl((v) => !v); fireToast(fullControl ? "View only." : "Full control on."); }}
                >
                  <Ic name="menu" sm />Full control
                </button>
                <button
                  className={keyboardOn ? "ctrl on" : "ctrl"}
                  onClick={() => { setKeyboardOn((v) => !v); fireToast(keyboardOn ? "Keyboard capture off." : "Keyboard capture on."); }}
                >
                  <Ic name="keyboard" sm />Keyboard
                </button>
                <button
                  className={clipPanel || clipSync ? "ctrl on" : "ctrl"}
                  onClick={() => { setClipPanel((v) => !v); setFilesOpen(false); }}
                >
                  <Ic name="clipboard" sm />Clipboard
                </button>
                <button
                  className={filesOpen ? "ctrl on" : "ctrl"}
                  onClick={() => { setFilesOpen((v) => !v); setClipPanel(false); }}
                >
                  <Ic name="folder" sm />Files
                </button>
                <button
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
                <button className="ctrl" onClick={toggleFullscreen}>
                  <Ic name="fullscreen" sm />{isFs ? "Exit FS" : "Fullscreen"}
                </button>
                <button
                  className="btn danger small"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                    fireToast("Session ended.");
                    go("devices");
                  }}
                >
                  <Ic name="close" sm />End session
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ALERTS */}
        {view === "alerts" && (
          <section className="view active">
            <div className="toolbar">
              <div className="chips wrap">
                {([
                  ["all", "All"],
                  ["unread", "Unread"],
                  ["stale", "Missed check-in"],
                  ["offline", "Offline"],
                  ["battery", "Battery"],
                  ["disk", "Disk"],
                  ["session", "Sessions"],
                  ["vault", "Vault"],
                  ["agent", "Agent"],
                ] as const).map(([id, label]) => (
                  <button key={id} className={alertFilter === id ? "chipbtn on" : "chipbtn"} onClick={() => setAlertFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="cardhead">
                <h2>Alerts</h2>
                <span className="chip neutral">{unreadAlerts} unread</span>
              </div>
              {filteredAlerts.length === 0 ? (
                <div className="empty sm"><strong>No alerts in this filter</strong></div>
              ) : (
                <div className="alertlist">
                  {filteredAlerts.map((a) => {
                    const d = a.deviceId ? devices.find((x) => x.id === a.deviceId) : undefined;
                    const canConnect = d && d.status !== "offline";
                    return (
                      <div className={a.unread ? "alert new" : "alert"} key={a.id}>
                        <div className={`evicon ${a.kind === "online" || a.kind === "session" ? "g" : a.kind === "battery" || a.kind === "stale" || a.kind === "disk" ? "a" : ""}`}>
                          <Ic
                            name={
                              a.kind === "battery" ? "battery"
                                : a.kind === "offline" || a.kind === "connect" ? "power"
                                  : a.kind === "stale" ? "signal"
                                    : a.kind === "disk" ? "disk"
                                      : a.kind === "vault" ? "lock"
                                        : a.kind === "agent" ? "refresh"
                                          : a.kind === "session" ? "monitor"
                                            : "laptop"
                            }
                            sm
                          />
                        </div>
                        <div className="atext">
                          <strong>{a.title}</strong>
                          <span>{a.body}</span>
                          {d && <small className="adevice">{d.name} · {d.hostname}</small>}
                        </div>
                        <span className="atime">{a.time}</span>
                        {d && (
                          canConnect ? (
                            <button className="btn primary small" onClick={() => openSession(d.id)}>Connect</button>
                          ) : (
                            <button className="btn small" onClick={() => fireToast(`Waiting for ${d.name} to check in.`)}>Waiting</button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* VAULT */}
        {view === "vault" && (
          <section className="view active">
            <div className="toolbar">
              <div className="searchbox">
                <Ic name="search" sm />
                <input
                  value={vaultQuery}
                  onChange={(e) => setVaultQuery(e.target.value)}
                  placeholder="Search label, user, URL, tag…"
                />
              </div>
              <select
                className="select"
                value={vaultDevice}
                onChange={(e) => setVaultDevice(e.target.value)}
                aria-label="Filter by device"
              >
                <option value="all">All devices ({vaultItems.length})</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({vaultItems.filter((v) => v.deviceId === d.id).length})
                  </option>
                ))}
              </select>
            </div>

            <div className="card">
              <div className="cardhead">
                <h2>Credential vault</h2>
                <span className="chip ok">{filteredVault.length} shown · {vaultItems.length} total</span>
              </div>

              {filteredVault.length === 0 ? (
                <div className="empty">
                  <Ic name="lock" />
                  <strong>No credentials match</strong>
                  <span>Try another device filter or clear the search.</span>
                </div>
              ) : (
                <>
                  <div className="vaultlist">
                    {vaultSlice.map((v) => (
                      <div className="vaultrow" key={v.id}>
                        <div className="vaultico"><Ic name="lock" sm /></div>
                        <div className="vaultmeta">
                          <strong>{v.label}</strong>
                          <span>{v.username} · {v.url}</span>
                          <small>
                            Owned with <b>{deviceName(v.deviceId)}</b>
                            {v.tags.length > 0 && ` · ${v.tags.join(", ")}`}
                            {` · updated ${v.updated}`}
                          </small>
                        </div>
                        <div className="vaultsecret">
                          <code>{revealed[v.id] ? "demo-pass-only" : v.password}</code>
                        </div>
                        <div className="vaultacts">
                          <button className="iconbtn sm" title="Reveal" onClick={() => setRevealed((r) => ({ ...r, [v.id]: !r[v.id] }))}>
                            <Ic name="eye" sm />
                          </button>
                          <button className="iconbtn sm" title="Copy password" onClick={() => copyText(`${v.label} password`, revealed[v.id] ? "demo-pass-only" : v.password)}>
                            <Ic name="copy" sm />
                          </button>
                          <button className="btn small" onClick={() => copyText(`${v.label} username`, v.username)}>Copy user</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pager">
                    <button className="btn small" disabled={vaultPage === 0} onClick={() => setVaultPage((p) => p - 1)}>Previous</button>
                    <span>Page {vaultPage + 1} of {vaultPages}</span>
                    <button className="btn small" disabled={vaultPage >= vaultPages - 1} onClick={() => setVaultPage((p) => p + 1)}>Next</button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ACTIVITY */}
        {view === "activity" && (
          <section className="view active">
            <div className="toolbar">
              <div className="chips">
                {([
                  ["all", "All"],
                  ["session", "Sessions"],
                  ["agent", "Agent"],
                  ["files", "Files"],
                  ["vault", "Vault"],
                  ["system", "System"],
                ] as const).map(([id, label]) => (
                  <button key={id} className={actFilter === id ? "chipbtn on" : "chipbtn"} onClick={() => setActFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="cardhead">
                <h2>Activity logs</h2>
                <span className="lbl">{filteredActivity.length} EVENTS</span>
              </div>
              {filteredActivity.length === 0 ? (
                <div className="empty sm"><strong>No events in this filter</strong></div>
              ) : (
                <div className="actlist">
                  {filteredActivity.map((e) => (
                    <div className="actrow" key={e.id}>
                      <div className="evicon"><Ic name={e.icon} sm /></div>
                      <div className="atext">
                        <strong>{e.title}</strong>
                        <span>{e.detail}</span>
                        {e.deviceId && <small className="adevice">{deviceName(e.deviceId)}</small>}
                      </div>
                      <span className="atime">{e.time}</span>
                      {e.deviceId && devices.find((d) => d.id === e.deviceId)?.status !== "offline" && (
                        <button className="btn small" onClick={() => openSession(e.deviceId!)}>Open</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="foot">Hudl · owner fleet</div>
      </main>

      <div className={toast.show ? "toast show" : "toast"}>
        <svg className="i i-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}
