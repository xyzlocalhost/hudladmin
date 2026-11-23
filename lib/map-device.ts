import type { ActivityItem, AlertItem, DbDevice, Device } from "./fleet-types";
import { formatRelative, formatUptime, formatWhen } from "./format";

export function deviceIcon(os: string | null | undefined, hostname: string): string {
  const s = `${os ?? ""} ${hostname}`.toLowerCase();
  if (s.includes("laptop") || s.includes("yoga") || s.includes("surface") || s.includes("thinkpad")) {
    return "laptop";
  }
  return "monitor";
}

export function mapDbDevice(row: DbDevice): Device {
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    os: row.os ?? "Windows",
    icon: deviceIcon(row.os, row.hostname),
    status: row.status,
    role: row.role ?? "Fleet device",
    cpu: row.cpu,
    ramUsedGb: row.ram_used_gb,
    ramTotalGb: row.ram_total_gb,
    battery: row.battery,
    uptime: formatUptime(row.uptime_seconds),
    pingMs: row.ping_ms,
    lastSeen: formatRelative(row.last_seen_at),
    agentVersion: row.agent_version ?? "—",
    lanIp: row.lan_ip ?? "—",
    rustdeskId: row.rustdesk_id,
  };
}

export function mapAlert(row: {
  id: string;
  kind: AlertItem["kind"];
  title: string;
  body: string;
  device_id: string | null;
  unread: boolean;
  created_at: string;
}): AlertItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    deviceId: row.device_id ?? undefined,
    unread: row.unread,
    time: formatRelative(row.created_at),
  };
}

export function mapActivity(row: {
  id: string;
  kind: ActivityItem["kind"];
  title: string;
  detail: string | null;
  device_id: string | null;
  created_at: string;
}): ActivityItem {
  const iconByKind: Record<ActivityItem["kind"], string> = {
    session: "monitor",
    agent: "signal",
    vault: "lock",
    files: "folder",
    system: "activity",
  };
  return {
    id: row.id,
    kind: row.kind,
    icon: iconByKind[row.kind] ?? "activity",
    title: row.title,
    detail: row.detail ?? "",
    deviceId: row.device_id ?? undefined,
    time: formatWhen(row.created_at),
  };
}
