"use client";

import { useRouter } from "next/navigation";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import type { Device } from "@/lib/fleet-types";

/** In-browser RustDesk viewer (Ferry on your self-hosted server). */
export function rustdeskWebViewerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_RUSTDESK_WEB_URL?.replace(/\/$/, "")
    || "http://16.16.254.57:8080"
  );
}

export function useOpenSession() {
  const { devices } = useFleetContext();
  const { fireToast } = useToast();
  const router = useRouter();

  function openSession(id: string) {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    if (d.status === "offline") {
      fireToast(
        `${d.name} is offline. On that laptop run: cd client; .\\run.ps1`,
      );
      return;
    }
    router.push(`/session/${id}`);
  }

  function launchRustDesk(d: Device) {
    // Kept for compatibility — session page embeds the web viewer instead.
    if (!d.rustdeskId) {
      fireToast("Remote not ready. On that laptop run: cd client; .\\run.ps1 (Admin once).");
      return;
    }
    fireToast(`Open Connect in the session view for ${d.name}.`);
  }

  return { openSession, launchRustDesk, rustdeskWebViewerUrl, fireToast };
}
