"use client";

import { FleetProvider } from "@/components/console/fleet-context";
import { Shell } from "@/components/console/shell";
import { ToastProvider } from "@/components/console/toast-context";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <FleetProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </FleetProvider>
  );
}
