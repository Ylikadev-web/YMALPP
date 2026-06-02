import { ApprovalsPanel } from "@/components/approvals/approvals-panel";
import { AppShell } from "@/components/layout/app-shell";

export default function ApprovalsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Aprobaciones</h2>
          <p className="mt-1 text-muted-foreground">
            Solo Socios y Admin pueden aprobar productos fuera de contrato, cambios y correcciones.
          </p>
        </div>
        <ApprovalsPanel />
      </div>
    </AppShell>
  );
}
