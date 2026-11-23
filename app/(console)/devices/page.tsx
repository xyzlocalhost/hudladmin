"use client";

import { useMemo, useState } from "react";
import { DeviceStats } from "@/components/console/device-stats";
import { useFleetContext } from "@/components/console/fleet-context";
import { setupBadgeLabel } from "@/components/console/setup-progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Ic } from "@/components/ui/icons";
import { useOpenSession } from "@/hooks/useOpenSession";
import { statusLabel } from "@/lib/console-nav";
import type { DeviceStatus } from "@/lib/fleet-types";

export default function DevicesPage() {
  const { devices, loading } = useFleetContext();
  const { openSession, fireToast } = useOpenSession();
  const [deviceQuery, setDeviceQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"all" | DeviceStatus>("all");

  const filteredDevices = useMemo(() => {
    const q = deviceQuery.trim().toLowerCase();
    return devices.filter((d) => {
      if (deviceFilter !== "all" && d.status !== deviceFilter) return false;
      if (!q) return true;
      return [d.name, d.hostname, d.role, d.os, d.lanIp].join(" ").toLowerCase().includes(q);
    });
  }, [devices, deviceQuery, deviceFilter]);

  return (
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
              type="button"
              className={deviceFilter === f ? "chipbtn on" : "chipbtn"}
              onClick={() => setDeviceFilter(f)}
            >
              {f === "all" ? `All (${devices.length})` : f === "stale" ? "Needs attention" : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && devices.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Loading devices…"
          body="Waiting on the first fleet sync."
        />
      ) : filteredDevices.length === 0 ? (
        <EmptyState
          icon="devices"
          title={devices.length === 0 ? "No devices enrolled" : "No devices match"}
          body={
            devices.length === 0
              ? "Install and run the Python agent on a Windows laptop. It enrolls automatically — no pairing code."
              : "Clear search/filters, or wait for another agent heartbeat."
          }
          action={
            devices.length === 0 ? undefined : (
              <button
                className="btn small"
                type="button"
                onClick={() => { setDeviceQuery(""); setDeviceFilter("all"); }}
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <div className="grid devgrid">
          {filteredDevices.map((d) => {
            const setupBadge = setupBadgeLabel(d.setup);
            return (
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
                {setupBadge ? (
                  <div className={`setup-pill${setupBadge === "Setup issue" ? " err" : ""}`}>
                    {setupBadge}
                  </div>
                ) : null}
                <DeviceStats d={d} />
                <div className="devfoot">
                  {d.status === "offline" ? (
                    <button className="btn small" type="button" onClick={(e) => { e.stopPropagation(); fireToast(`Waiting on ${d.hostname}. Launch Hudl on that machine.`); }}>
                      Waiting for agent
                    </button>
                  ) : setupBadge === "Setting up…" ? (
                    <button className="btn small" type="button" onClick={(e) => { e.stopPropagation(); openSession(d.id); }}>
                      View setup
                    </button>
                  ) : (
                    <button className="btn primary small" type="button" onClick={(e) => { e.stopPropagation(); openSession(d.id); }}>
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
