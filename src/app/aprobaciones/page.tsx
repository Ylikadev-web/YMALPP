import { ApprovalsPanel } from "@/components/approvals/approvals-panel";
import { ProtectedShell } from "@/components/layout/protected-shell";

export default function ApprovalsPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Aprobaciones</h2>
          <p className="mt-1 text-muted-foreground">
            Solo Socios y Admin pueden aprobar productos fuera de contrato, cambios y correcciones.
          </p>
        </div>
        <ApprovalsPanel />
      </div>
    </ProtectedShell>
  );
}
