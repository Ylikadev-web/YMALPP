import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createFinanceAccountAction,
  createFinanceTransactionAction
} from "@/lib/actions/erp-actions";
import { getContracts, getFinanceAccounts, getFinancialSummary } from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export default async function FinancePage() {
  const [accounts, contracts, summary] = await Promise.all([
    getFinanceAccounts(),
    getContracts(),
    getFinancialSummary()
  ]);

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Finanzas</h2>
          <p className="mt-1 text-muted-foreground">
            Modulo exclusivo para Socios y Admin: utilidad, ROI, gastos, nomina y flujo.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Crear cuenta financiera</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createFinanceAccountAction} className="grid gap-4 md:grid-cols-2">
                <Input name="name" placeholder="Ingresos contratos gobierno" required />
                <Select name="account_type" required>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="nomina">Nomina</option>
                  <option value="operativo">Operativo</option>
                  <option value="proyecto">Proyecto</option>
                  <option value="contrato">Contrato</option>
                </Select>
                <Button type="submit">Guardar cuenta</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Registrar movimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createFinanceTransactionAction} className="grid gap-4 md:grid-cols-2">
                <Select name="account_id" required>
                  <option value="">Cuenta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.account_type}
                    </option>
                  ))}
                </Select>
                <Select name="contract_id">
                  <option value="">Sin contrato</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.code}
                    </option>
                  ))}
                </Select>
                <Input name="amount" type="number" step="0.01" placeholder="Monto (+ ingreso / - egreso)" required />
                <Input name="transaction_date" type="date" required />
                <Input name="description" placeholder="Descripcion" />
                <Button type="submit">Guardar movimiento</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FinanceMetric title="Ingresos" value={formatCurrency(Number(summary.ingresos))} />
          <FinanceMetric title="Egresos" value={formatCurrency(Number(summary.egresos))} />
          <FinanceMetric title="Nomina" value={formatCurrency(Number(summary.nomina))} />
          <FinanceMetric title="Operativo" value={formatCurrency(Number(summary.gastos_operativos))} />
          <FinanceMetric title="Utilidad neta" value={formatCurrency(Number(summary.utilidad_neta))} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Cuentas configuradas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <Badge key={account.id} variant="outline">
                {account.name} - {account.account_type}
              </Badge>
            ))}
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Crea una cuenta para iniciar el modulo financiero.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}

function FinanceMetric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
