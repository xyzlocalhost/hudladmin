"use client";

import { useEffect, useMemo, useState } from "react";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import { Ic } from "@/components/ui/icons";
import { VAULT_PAGE } from "@/lib/console-nav";
import { deviceName } from "@/lib/device-format";
import { vaultItems } from "@/lib/mock-vault";

export default function VaultPage() {
  const { devices } = useFleetContext();
  const { fireToast } = useToast();
  const [vaultQuery, setVaultQuery] = useState("");
  const [vaultDevice, setVaultDevice] = useState("all");
  const [vaultPage, setVaultPage] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const filteredVault = useMemo(() => {
    const q = vaultQuery.trim().toLowerCase();
    return vaultItems.filter((v) => {
      if (vaultDevice !== "all" && v.deviceId !== vaultDevice) return false;
      if (!q) return true;
      return [v.label, v.username, v.url, ...v.tags, deviceName(devices, v.deviceId)].join(" ").toLowerCase().includes(q);
    });
  }, [vaultQuery, vaultDevice, devices]);

  const vaultPages = Math.max(1, Math.ceil(filteredVault.length / VAULT_PAGE));
  const vaultSlice = filteredVault.slice(vaultPage * VAULT_PAGE, vaultPage * VAULT_PAGE + VAULT_PAGE);

  useEffect(() => { setVaultPage(0); }, [vaultQuery, vaultDevice]);

  function copyText(label: string, value: string) {
    const run = navigator.clipboard?.writeText(value);
    if (run) {
      run.then(
        () => fireToast(`Copied ${label}`),
        () => fireToast(`Could not copy ${label}`),
      );
    } else {
      fireToast(`${label}: ${value}`);
    }
  }

  return (
    <section className="view active">
      <div className="toolbar">
        <div className="searchbox">
          <Ic name="search" sm />
          <input
            value={vaultQuery}
            onChange={(e) => setVaultQuery(e.target.value)}
            placeholder="Search label, user, URL, tag…"
          />
        </div>
        <select
          className="select"
          value={vaultDevice}
          onChange={(e) => setVaultDevice(e.target.value)}
          aria-label="Filter by device"
        >
          <option value="all">All devices ({vaultItems.length})</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({vaultItems.filter((v) => v.deviceId === d.id).length})
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="cardhead">
          <h2>Credential vault</h2>
          <span className="chip ok">{filteredVault.length} shown · {vaultItems.length} total</span>
        </div>

        {filteredVault.length === 0 ? (
          <div className="empty">
            <Ic name="lock" />
            <strong>No credentials match</strong>
            <span>Try another device filter or clear the search.</span>
          </div>
        ) : (
          <>
            <div className="vaultlist">
              {vaultSlice.map((v) => (
                <div className="vaultrow" key={v.id}>
                  <div className="vaultico"><Ic name="lock" sm /></div>
                  <div className="vaultmeta">
                    <strong>{v.label}</strong>
                    <span>{v.username} · {v.url}</span>
                    <small>
                      Owned with <b>{deviceName(devices, v.deviceId)}</b>
                      {v.tags.length > 0 && ` · ${v.tags.join(", ")}`}
                      {` · updated ${v.updated}`}
                    </small>
                  </div>
                  <div className="vaultsecret">
                    <code>{revealed[v.id] ? "demo-pass-only" : v.password}</code>
                  </div>
                  <div className="vaultacts">
                    <button className="iconbtn sm" type="button" title="Reveal" onClick={() => setRevealed((r) => ({ ...r, [v.id]: !r[v.id] }))}>
                      <Ic name="eye" sm />
                    </button>
                    <button className="iconbtn sm" type="button" title="Copy password" onClick={() => copyText(`${v.label} password`, revealed[v.id] ? "demo-pass-only" : v.password)}>
                      <Ic name="copy" sm />
                    </button>
                    <button className="btn small" type="button" onClick={() => copyText(`${v.label} username`, v.username)}>Copy user</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pager">
              <button className="btn small" type="button" disabled={vaultPage === 0} onClick={() => setVaultPage((p) => p - 1)}>Previous</button>
              <span>Page {vaultPage + 1} of {vaultPages}</span>
              <button className="btn small" type="button" disabled={vaultPage >= vaultPages - 1} onClick={() => setVaultPage((p) => p + 1)}>Next</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
