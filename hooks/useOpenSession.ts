"use client";

import { useRouter } from "next/navigation";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import type { Device } from "@/lib/fleet-types";

export function useOpenSession() {
  const { devices } = useFleetContext();
  const { fireToast } = useToast();
  const router = useRouter();

  function launchRustDesk(d: Device) {
    if (!d.rustdeskId) {
      fireToast("No RustDesk ID yet. Phase 2: agent will publish it after RustDesk is installed.");
      return;
    }
    const webBase = process.env.NEXT_PUBLIC_RUSTDESK_WEB_URL;
    if (webBase) {
      const url = `${webBase.replace(/\/$/, "")}/?id=${encodeURIComponent(d.rustdeskId)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      fireToast(`Opening RustDesk web for ${d.name}`);
      return;
    }
    window.location.href = `rustdesk://${encodeURIComponent(d.rustdeskId)}`;
    fireToast(`Launching RustDesk app → ${d.rustdeskId}`);
  }

  function openSession(id: string) {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    if (d.status === "offline") {
      fireToast(`${d.name} is offline. Start the Hudl agent on that laptop — it shows up here on the next check-in.`);
      return;
    }
    router.push(`/session/${id}`);
    if (d.rustdeskId) launchRustDesk(d);
  }

  return { openSession, launchRustDesk, fireToast };
}
