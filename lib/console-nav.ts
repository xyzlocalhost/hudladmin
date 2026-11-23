import type { DeviceStatus } from "@/lib/fleet-types";

export const titles: Record<string, [string, string]> = {
  overview: ["Overview", "Fleet health and machines ready to control."],
  devices: ["My devices", "Every laptop running the Hudl agent. Search, filter, connect."],
  session: ["Remote screen", "Control the selected machine — stream and files."],
  alerts: ["Alerts", "Missed check-ins, battery, disk, sessions, and vault events."],
  vault: ["Credential vault", "Your logins, scoped to devices — search scales past hundreds."],
  activity: ["Activity logs", "Sessions, agent signals, files, and vault access."],
};

export const navItems = [
  { id: "overview", label: "Overview", icon: "overview", href: "/" },
  { id: "devices", label: "My devices", icon: "devices", href: "/devices" },
  { id: "session", label: "Remote screen", icon: "monitor", href: "/session" },
  { id: "vault", label: "Credential vault", icon: "vault", href: "/vault" },
  { id: "alerts", label: "Alerts", icon: "bell", href: "/alerts" },
  { id: "activity", label: "Activity logs", icon: "activity", href: "/activity" },
] as const;

export const streamModes = ["Auto", "High", "Medium", "Low"] as const;
export const VAULT_PAGE = 12;

export function statusLabel(s: DeviceStatus) {
  if (s === "online") return "Online";
  if (s === "stale") return "Needs attention";
  return "Offline";
}

export function navIdFromPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "overview";
  if (pathname.startsWith("/session")) return "session";
  if (pathname.startsWith("/devices")) return "devices";
  if (pathname.startsWith("/vault")) return "vault";
  if (pathname.startsWith("/alerts")) return "alerts";
  if (pathname.startsWith("/activity")) return "activity";
  return "overview";
}
