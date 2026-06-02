import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getContractItems } from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export async function ContractItemsTable() {
  const contractItems = await getContractItems();

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
            const contracted = Number(item.contracted_quantity);
            const delivered = Number(item.delivered_quantity);
            const pending = Number(item.pending_quantity);
            const progress = contracted > 0 ? (delivered / contracted) * 100 : 0;

            return (
              <tr key={item.id}>
                <td>
                  <Badge variant="outline">{item.item_number}</Badge>
                </td>
                <td>Catalogo</td>
                <td>Contrato</td>
                <td className="font-medium">{item.products?.name ?? "Producto"}</td>
                <td>{contracted.toLocaleString("es-MX")}</td>
                <td>
                  <div className="min-w-32">
                    <div className="mb-1 text-xs text-muted-foreground">
                      {delivered.toLocaleString("es-MX")}
                    </div>
                    <Progress value={progress} />
                  </div>
                </td>
                <td>{pending.toLocaleString("es-MX")}</td>
                <td>{formatCurrency(Number(item.unit_price) * Number(item.contracted_quantity))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
