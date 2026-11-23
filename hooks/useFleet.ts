"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityItem, AlertItem, DbDevice, Device } from "@/lib/fleet-types";
import { mapActivity, mapAlert, mapDbDevice } from "@/lib/map-device";
import { MOCK_ACTIVITY, MOCK_ALERTS, MOCK_DEVICES } from "@/lib/mock-fleet";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type FleetSource = "live" | "mock";

export function useFleet() {
  const live = isSupabaseConfigured();
  const [devices, setDevices] = useState<Device[]>(live ? [] : MOCK_DEVICES);
  const [alerts, setAlerts] = useState<AlertItem[]>(live ? [] : MOCK_ALERTS);
  const [activity, setActivity] = useState<ActivityItem[]>(live ? [] : MOCK_ACTIVITY);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<FleetSource>(live ? "live" : "mock");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setDevices(MOCK_DEVICES);
      setAlerts(MOCK_ALERTS);
      setActivity(MOCK_ACTIVITY);
      setSource("mock");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      await supabase.rpc("refresh_device_statuses");

      const [dRes, aRes, eRes] = await Promise.all([
        supabase.from("devices").select("*").order("name", { ascending: true }),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase
          .from("activity_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (dRes.error) throw dRes.error;
      if (aRes.error) throw aRes.error;
      if (eRes.error) throw eRes.error;

      setDevices((dRes.data as DbDevice[]).map(mapDbDevice));
      setAlerts((aRes.data ?? []).map(mapAlert));
      setActivity((eRes.data ?? []).map(mapActivity));
      setSource("live");
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load fleet");
      // Stay on live empty rather than swapping in demo data after login.
      setDevices([]);
      setAlerts([]);
      setActivity([]);
      setSource("live");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel("hudl-fleet")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_events" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const tick = setInterval(() => {
      void refresh();
    }, 30000);

    return () => {
      clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { devices, alerts, activity, loading, error, source, refresh };
}
