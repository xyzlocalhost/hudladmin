import type { AgentSetup } from "@/lib/fleet-types";

function stepClass(status: string): string {
  if (status === "done" || status === "skipped") return "done";
  if (status === "active") return "active";
  if (status === "error") return "error";
  return "pending";
}

export function isSetupBusy(setup: AgentSetup | null | undefined): boolean {
  if (!setup) return false;
  if (setup.phase === "ready" && !setup.error) return false;
  if (setup.error) return false;
  return setup.steps.some((s) => s.status === "active" || s.status === "pending");
}

export function isSetupFailed(setup: AgentSetup | null | undefined): boolean {
  return Boolean(setup?.error) || Boolean(setup?.steps.some((s) => s.status === "error"));
}

export function setupBadgeLabel(setup: AgentSetup | null | undefined): string | null {
  if (!setup) return null;
  if (isSetupFailed(setup)) return "Setup issue";
  if (setup.phase === "ready") return null;
  if (isSetupBusy(setup)) return "Setting up…";
  return null;
}

export function SetupProgress({
  setup,
  compact,
}: {
  setup: AgentSetup;
  compact?: boolean;
}) {
  const failed = isSetupFailed(setup);
  const busy = isSetupBusy(setup);

  return (
    <div className={`setup-progress${compact ? " compact" : ""}${failed ? " is-error" : ""}${busy ? " is-busy" : ""}`}>
      <div className="setup-progress-head">
        <strong>{failed ? "Setup needs attention" : busy ? "Setting up this laptop" : "Setup complete"}</strong>
        <span>{setup.detail || (failed ? setup.error : "All set.")}</span>
      </div>
      <ol className="setup-steps">
        {setup.steps.map((step) => (
          <li key={step.id} className={`setup-step ${stepClass(step.status)}`}>
            <span className="setup-step-mark" aria-hidden>
              {step.status === "done" || step.status === "skipped"
                ? "✓"
                : step.status === "error"
                  ? "!"
                  : step.status === "active"
                    ? ""
                    : ""}
            </span>
            <div className="setup-step-copy">
              <b>{step.label}</b>
              {step.status === "active" && setup.detail ? <small>{setup.detail}</small> : null}
              {step.status === "error" && setup.error ? <small>{setup.error}</small> : null}
              {step.status === "skipped" ? <small>Not needed</small> : null}
            </div>
          </li>
        ))}
      </ol>
      {failed && setup.error ? (
        <p className="setup-progress-hint">
          On the laptop, run the Hudl agent as Administrator and leave it open until this list finishes.
        </p>
      ) : busy ? (
        <p className="setup-progress-hint">
          Leave the agent running on the laptop — this list updates live as each step finishes.
        </p>
      ) : null}
    </div>
  );
}
