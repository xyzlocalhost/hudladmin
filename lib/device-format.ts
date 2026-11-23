import type { Device } from "@/lib/fleet-types";
import { MOCK_DEVICES } from "@/lib/mock-fleet";

export function fmtRam(d: Device) {
  if (d.ramUsedGb == null || d.ramTotalGb == null) return "—";
  return `${d.ramUsedGb}/${d.ramTotalGb} GB`;
}

export function fmtCpu(d: Device) {
  return d.cpu == null ? "—" : `${d.cpu}%`;
}

export function fmtPing(d: Device) {
  return d.pingMs == null ? "—" : `${d.pingMs} ms`;
}

export function fmtPower(d: Device) {
  return d.battery == null ? "AC" : `${d.battery}%`;
}

export function deviceName(devices: Device[], id?: string) {
  return (
    devices.find((d) => d.id === id)?.name
    ?? MOCK_DEVICES.find((d) => d.id === id)?.name
    ?? "Unknown device"
  );
}
