"use client";

import Link from "next/link";
import { useFleetContext } from "@/components/console/fleet-context";
import { EmptyState } from "@/components/ui/empty-state";

export default function SessionEmptyPage() {
  const { devices } = useFleetContext();

  return (
    <section className="view active">
      <EmptyState
        icon="monitor"
        title="No device to control"
        body={
          devices.length === 0
            ? "Enroll a laptop with the Hudl agent, then come back to open a remote session."
            : "Pick an online device from My devices to start a session."
        }
        action={
          <Link className="btn primary small" href="/devices">
            Go to My devices
          </Link>
        }
      />
    </section>
  );
}
