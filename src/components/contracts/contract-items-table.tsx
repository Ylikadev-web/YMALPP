import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { contractItems } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export function ContractItemsTable() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Partida</th>
            <th>Sector</th>
            <th>Requerimiento</th>
            <th>Producto</th>
            <th>Contratado</th>
            <th>Entregado</th>
            <th>Pendiente</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {contractItems.map((item) => {
            const pending = item.contractedQuantity - item.deliveredQuantity;
            const progress = (item.deliveredQuantity / item.contractedQuantity) * 100;

            return (
              <tr key={item.id}>
                <td>
                  <Badge variant="outline">{item.itemNumber}</Badge>
                </td>
                <td>{item.sector}</td>
                <td>{item.requirement}</td>
                <td className="font-medium">{item.product}</td>
                <td>{item.contractedQuantity.toLocaleString("es-MX")}</td>
                <td>
                  <div className="min-w-32">
                    <div className="mb-1 text-xs text-muted-foreground">
                      {item.deliveredQuantity.toLocaleString("es-MX")}
                    </div>
                    <Progress value={progress} />
                  </div>
                </td>
                <td>{pending.toLocaleString("es-MX")}</td>
                <td>{formatCurrency(item.unitPrice * item.contractedQuantity)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
