import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getApprovals,
  getContracts,
  getEmployees,
  getFinancialSummary,
  getInventoryItems
} from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const [contracts, approvals, inventory, employees, finance] = await Promise.all([
    getContracts(),
    getApprovals(),
    getInventoryItems(),
    getEmployees(),
    getFinancialSummary()
  ]);
  const activeContracts = contracts.filter((contract) => contract.status === "activo").length;
  const riskyContracts = contracts.filter((contract) => contract.status === "en_riesgo").length;
  const pendingApprovals = approvals.filter((approval) => approval.status === "pendiente").length;
  const stock = inventory.reduce((sum, item) => sum + Number(item.available_quantity), 0);

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Control integral</h2>
          <p className="mt-1 text-muted-foreground">
            Vista ejecutiva de contratos, entregas, aprobaciones, rentabilidad y avance.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LiveMetric title="Contratos activos" value={activeContracts.toString()} badge="operacion" />
          <LiveMetric title="Aprobaciones pendientes" value={pendingApprovals.toString()} badge="socios/admin" />
          <LiveMetric title="Inventario disponible" value={stock.toLocaleString("es-MX")} badge="unidades" />
          <LiveMetric title="Empleados" value={employees.length.toString()} badge="RH" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Finanzas reales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <LiveMetric title="Ingresos" value={formatCurrency(Number(finance.ingresos))} badge="MXN" />
              <LiveMetric title="Egresos" value={formatCurrency(Number(finance.egresos))} badge="MXN" />
              <LiveMetric title="Nomina" value={formatCurrency(Number(finance.nomina))} badge="MXN" />
              <LiveMetric title="Utilidad neta" value={formatCurrency(Number(finance.utilidad_neta))} badge="MXN" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Riesgos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LiveMetric title="Contratos en riesgo" value={riskyContracts.toString()} badge="seguimiento" />
              {contracts.slice(0, 4).map((contract) => (
                <div key={contract.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{contract.code}</div>
                    <div className="text-sm text-muted-foreground">{contract.name}</div>
                  </div>
                  <Badge variant={contract.status === "en_riesgo" ? "warning" : "outline"}>
                    {contract.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedShell>
  );
}

function LiveMetric({ title, value, badge }: { title: string; value: string; badge: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
          <Badge variant="outline">{badge}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
