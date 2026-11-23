"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useFleet } from "@/hooks/useFleet";

type FleetContextValue = ReturnType<typeof useFleet>;

const FleetContext = createContext<FleetContextValue | null>(null);

export function FleetProvider({ children }: { children: ReactNode }) {
  const fleet = useFleet();
  return <FleetContext.Provider value={fleet}>{children}</FleetContext.Provider>;
}

export function useFleetContext() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleetContext must be used within FleetProvider");
  return ctx;
}
