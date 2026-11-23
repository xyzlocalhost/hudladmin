import type { Device } from "@/lib/fleet-types";
import { fmtCpu, fmtPing, fmtPower, fmtRam } from "@/lib/device-format";

export function DeviceStats({ d }: { d: Device }) {
  return (
    <div className="devstats">
      <div className="ds"><b>{fmtCpu(d)}</b><small>CPU</small></div>
      <div className="ds"><b>{fmtRam(d)}</b><small>RAM</small></div>
      <div className="ds"><b>{fmtPower(d)}</b><small>Power</small></div>
      <div className="ds"><b>{fmtPing(d)}</b><small>Ping</small></div>
    </div>
  );
}
