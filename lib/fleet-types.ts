export type DeviceStatus = "online" | "stale" | "offline";

export type Device = {
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
  rustdeskId?: string | null;
  /** Unattended password — owner-only; used for one-click Connect deep links. */
  rustdeskPassword?: string | null;
};

export type AlertKind =
  | "online"
  | "offline"
  | "stale"
  | "battery"
  | "session"
  | "disk"
  | "agent"
  | "vault"
  | "connect";

export type AlertItem = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  time: string;
  deviceId?: string;
  unread?: boolean;
};

export type ActivityKind = "session" | "agent" | "vault" | "files" | "system";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  icon: string;
  title: string;
  detail: string;
  deviceId?: string;
  time: string;
};

export type DbDevice = {
  id: string;
  name: string;
  hostname: string;
  os: string | null;
  agent_version: string | null;
  lan_ip: string | null;
  status: DeviceStatus;
  last_seen_at: string | null;
  rustdesk_id: string | null;
  rustdesk_password: string | null;
  cpu: number | null;
  ram_used_gb: number | null;
  ram_total_gb: number | null;
  battery: number | null;
  ping_ms: number | null;
  uptime_seconds: number | null;
  role: string | null;
};
