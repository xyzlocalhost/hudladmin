"use client";

import { useMemo, useState } from "react";
import { useFleetContext } from "@/components/console/fleet-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Ic } from "@/components/ui/icons";
import { useOpenSession } from "@/hooks/useOpenSession";
import type { AlertKind } from "@/lib/fleet-types";

export default function AlertsPage() {
  const { devices, alerts, loading } = useFleetContext();
  const { openSession, fireToast } = useOpenSession();
  const [alertFilter, setAlertFilter] = useState<"all" | "unread" | AlertKind>("all");
  const unreadAlerts = alerts.filter((a) => a.unread).length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter === "all") return true;
      if (alertFilter === "unread") return !!a.unread;
      return a.kind === alertFilter;
    });
  }, [alerts, alertFilter]);

  return (
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
            <button key={id} type="button" className={alertFilter === id ? "chipbtn on" : "chipbtn"} onClick={() => setAlertFilter(id)}>
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
        {loading && alerts.length === 0 ? (
          <EmptyState compact icon="bell" title="Loading alerts…" body="Checking for fleet events." />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            compact
            icon="bell"
            title={alerts.length === 0 ? "All quiet" : "No alerts in this filter"}
            body={
              alerts.length === 0
                ? "Missed check-ins, battery, and session events will land here once agents are live."
                : "Try another filter or clear unread."
            }
          />
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
                      <button className="btn primary small" type="button" onClick={() => openSession(d.id)}>Connect</button>
                    ) : (
                      <button className="btn small" type="button" onClick={() => fireToast(`Waiting for ${d.name} to check in.`)}>Waiting</button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
