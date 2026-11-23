"use client";

import { useRouter } from "next/navigation";
import { useFleetContext } from "@/components/console/fleet-context";
import { useToast } from "@/components/console/toast-context";
import type { Device } from "@/lib/fleet-types";

/** Same-origin embed path (proxies Ferry and allows iframe framing). */
export function rustdeskWebViewerUrl(): string {
  return "/ferry-viewer";
}

/** Same-origin Ferry tab with optional autofill query (uses Hudl bootstrap). */
export function rustdeskWebExternalUrl(opts?: {
  id?: string | null;
  password?: string | null;
}): string {
  const url = new URL("/ferry-viewer/", "http://local.invalid");
  if (opts?.id) url.searchParams.set("id", opts.id);
  if (opts?.password) url.searchParams.set("password", opts.password);
  return `${url.pathname}${url.search}`;
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

  return { openSession, launchRustDesk, rustdeskWebViewerUrl, rustdeskWebExternalUrl, fireToast };
}
