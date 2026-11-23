"use client";

import Link from "next/link";
import { DeviceStats } from "@/components/console/device-stats";
import { useFleetContext } from "@/components/console/fleet-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Ic } from "@/components/ui/icons";
import { useOpenSession } from "@/hooks/useOpenSession";
import { statusLabel } from "@/lib/console-nav";
import { vaultItems } from "@/lib/mock-vault";

export default function OverviewPage() {
  const { devices, alerts, loading, error: fleetError } = useFleetContext();
  const { openSession } = useOpenSession();

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const attentionCount = devices.filter((d) => d.status === "stale").length;
  const unreadAlerts = alerts.filter((a) => a.unread).length;
  const recent = devices.filter((d) => d.status !== "offline").slice(0, 4);

  return (
    <section className="view active">
      {fleetError && (
        <div className="note" style={{ marginBottom: 14 }}>
          <Ic name="alert" sm />
          Couldn’t refresh fleet: {fleetError}
        </div>
      )}
      <div className="grid stats">
        {[
          { label: "Online now", icon: "power", num: String(onlineCount), sub: attentionCount ? `${attentionCount} need attention` : `${devices.length} in fleet`, href: "/devices" },
          { label: "Ready to connect", icon: "monitor", num: String(onlineCount + attentionCount), sub: "Online or soft-delayed", href: "/devices" },
          { label: "Vault entries", icon: "lock", num: String(vaultItems.length), sub: "Searchable across devices", href: "/vault" },
          { label: "Unread alerts", icon: "bell", num: String(unreadAlerts), sub: "Check-ins, battery, disk", href: "/alerts" },
        ].map((s) => (
          <Link className="card click" key={s.label} href={s.href}>
            <span className="go"><Ic name="chevron" sm /></span>
            <div className="stathead"><span>{s.label}</span><div className="staticon"><Ic name={s.icon} sm /></div></div>
            <div className="statnum">{s.num}</div>
            <div className="sub">{s.sub}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="cardhead">
          <h2>Jump back in</h2>
          <Link className="btn small" href="/devices">All devices</Link>
        </div>
        {loading && devices.length === 0 ? (
          <EmptyState
            compact
            icon="clock"
            title="Loading fleet…"
            body="Pulling the latest heartbeats from your devices."
          />
        ) : recent.length === 0 ? (
          <EmptyState
            compact
            icon="devices"
            title={devices.length === 0 ? "No devices yet" : "Nothing online right now"}
            body={
              devices.length === 0
                ? "Run the Hudl agent on a laptop — it enrolls itself and shows up here on the next heartbeat."
                : "All machines are offline. Start an agent or wake a laptop to connect."
            }
            action={
              <Link className="btn primary small" href="/devices">
                Open My devices
              </Link>
            }
          />
        ) : (
          <div className="jumpgrid">
            {recent.map((d) => (
              <button key={d.id} className="jump" type="button" onClick={() => openSession(d.id)}>
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
        )}
      </div>
    </section>
  );
}
