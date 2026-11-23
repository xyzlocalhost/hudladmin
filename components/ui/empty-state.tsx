import type { ReactNode } from "react";
import { Ic } from "@/components/ui/icons";

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "empty sm" : "empty"}>
      <Ic name={icon} />
      <strong>{title}</strong>
      <span>{body}</span>
      {action}
    </div>
  );
}
