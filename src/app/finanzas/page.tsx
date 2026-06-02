import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function FinancePage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Finanzas</h2>
          <p className="mt-1 text-muted-foreground">
            Modulo exclusivo para Socios y Admin: utilidad, ROI, gastos, nomina y flujo.
          </p>
        </div>
        <FinancialDashboard />
      </div>
    </AppShell>
  );
}
