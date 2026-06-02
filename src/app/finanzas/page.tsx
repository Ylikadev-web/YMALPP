import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { ProtectedShell } from "@/components/layout/protected-shell";

export default function FinancePage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Finanzas</h2>
          <p className="mt-1 text-muted-foreground">
            Modulo exclusivo para Socios y Admin: utilidad, ROI, gastos, nomina y flujo.
          </p>
        </div>
        <FinancialDashboard />
      </div>
    </ProtectedShell>
  );
}
