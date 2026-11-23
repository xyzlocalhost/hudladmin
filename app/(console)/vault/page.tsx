import { EmptyState } from "@/components/ui/empty-state";

export default function VaultPage() {
  return (
    <section className="view active">
      <EmptyState
        icon="vault"
        title="Coming soon"
        body="Credential vault is on the way — device-scoped logins and secrets will live here."
      />
    </section>
  );
}
