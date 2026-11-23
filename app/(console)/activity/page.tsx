"use client";

import { useMemo, useState } from "react";
import { useFleetContext } from "@/components/console/fleet-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Ic } from "@/components/ui/icons";
import { useOpenSession } from "@/hooks/useOpenSession";
import { deviceName } from "@/lib/device-format";
import type { ActivityKind } from "@/lib/fleet-types";

export default function ActivityPage() {
  const { devices, activity, loading } = useFleetContext();
  const { openSession } = useOpenSession();
  const [actFilter, setActFilter] = useState<"all" | ActivityKind>("all");

  const filteredActivity = useMemo(() => {
    return activity.filter((e) => (actFilter === "all" ? true : e.kind === actFilter));
  }, [activity, actFilter]);

  return (
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
            <button key={id} type="button" className={actFilter === id ? "chipbtn on" : "chipbtn"} onClick={() => setActFilter(id)}>
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
        {loading && activity.length === 0 ? (
          <EmptyState compact icon="activity" title="Loading activity…" body="Fetching the latest events." />
        ) : filteredActivity.length === 0 ? (
          <EmptyState
            compact
            icon="activity"
            title={activity.length === 0 ? "No activity yet" : "No events in this filter"}
            body={
              activity.length === 0
                ? "Enrollments, heartbeats, sessions, and vault actions will show up here."
                : "Switch filter to see other event types."
            }
          />
        ) : (
          <div className="actlist">
            {filteredActivity.map((e) => (
              <div className="actrow" key={e.id}>
                <div className="evicon"><Ic name={e.icon} sm /></div>
                <div className="atext">
                  <strong>{e.title}</strong>
                  <span>{e.detail}</span>
                  {e.deviceId && <small className="adevice">{deviceName(devices, e.deviceId)}</small>}
                </div>
                <span className="atime">{e.time}</span>
                {e.deviceId && devices.find((d) => d.id === e.deviceId)?.status !== "offline" && (
                  <button className="btn small" type="button" onClick={() => openSession(e.deviceId!)}>Open</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
