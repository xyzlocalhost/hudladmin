import type { ActivityItem, AlertItem, Device } from "./fleet-types";

export const MOCK_DEVICES: Device[] = [
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

export const MOCK_ALERTS: AlertItem[] = [
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

export const MOCK_ACTIVITY: ActivityItem[] = [
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
