import { ContractItemsTable } from "@/components/contracts/contract-items-table";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contracts } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function ContractsPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Contratos</h2>
            <p className="mt-1 text-muted-foreground">
              Control de cliente, proyecto, vigencia, partidas, productos y saldos.
            </p>
          </div>
          <Button>Nuevo contrato</Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {contracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{contract.code}</CardTitle>
                  <Badge variant={contract.status === "en_riesgo" ? "warning" : "success"}>
                    {contract.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{contract.name}</div>
                <div className="text-muted-foreground">{contract.client}</div>
                <div>{formatCurrency(contract.amount)}</div>
                <div className="text-muted-foreground">
                  {contract.startDate} a {contract.endDate}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ContractItemsTable />
      </div>
    </ProtectedShell>
  );
}
