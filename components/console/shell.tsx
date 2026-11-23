"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import { Ic, icons } from "@/components/ui/icons";
import { navIdFromPath, navItems, titles } from "@/lib/console-nav";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navId = navIdFromPath(pathname);
  const [t0, t1] = titles[navId] ?? titles.overview;
  const { devices, alerts, source, loading } = useFleetContext();
  const { toast } = useToast();
  const unreadAlerts = alerts.filter((a) => a.unread).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <div className="logo"><svg viewBox="0 0 24 24">{icons.logo}</svg></div>
          <div className="brandtext"><strong>HUDL</strong><small>YOUR FLEET</small></div>
        </Link>
        <div className="navlabel">WORKSPACE</div>
        <nav className="nav">
          {navItems.map((n) => (
            <Link key={n.id} href={n.href} className={navId === n.id ? "active" : ""}>
              <Ic name={n.icon} /><span className="navtext">{n.label}</span>
              {n.id === "alerts" && unreadAlerts > 0 && <span className="navbadge">{unreadAlerts}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebottom">
          <div className="secure">
            <div className="shd"><Ic name="shield" sm />Owner workspace</div>
            <p>Run the agent on a laptop and it shows up here. No pairing codes — this fleet is yours.</p>
          </div>
          <div className="profile">
            <div className="avatar">Y</div>
            <div><strong>You</strong><small>{devices.length} devices · {source === "live" ? "live" : "demo"}</small></div>
          </div>
        </div>
      </aside>

      <main>
        <div className="top">
          <div>
            <div className="eyebrow">PERSONAL CONTROL CENTER</div>
            <h1>{t0}</h1>
            <p>{t1}</p>
          </div>
          <div className="actions">
            <span className={`chip ${source === "live" ? "ok" : "neutral"} livechip`}>
              {loading ? "Syncing…" : source === "live" ? "Live heartbeats" : "Mock fleet"}
            </span>
            <Link href="/alerts" className="iconbtn">
              <Ic name="bell" sm />
              {unreadAlerts > 0 && <span className="dot" />}
            </Link>
          </div>
        </div>

        {children}

        <div className="foot">Hudl · owner fleet</div>
      </main>

      <div className={toast.show ? "toast show" : "toast"}>
        <svg className="i i-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}
