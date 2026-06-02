import { Boxes, PackageMinus, PackagePlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const inventory = [
  { sku: "MON-MP-12", product: "Monitor Multiparametro", stock: 42, reserved: 18, location: "CEDIS Norte" },
  { sku: "CAM-HOS-08", product: "Cama hospitalaria electrica", stock: 64, reserved: 22, location: "CEDIS Bajio" },
  { sku: "CEM-CPC-30", product: "Cemento CPC 30R", stock: 920, reserved: 400, location: "Patio QRO" }
];

export default function InventoryPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Inventario</h2>
          <p className="mt-1 text-muted-foreground">
            Existencias, entradas, salidas y apartados por contrato o pedido.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InventoryMetric title="Existencias" value="1,026" icon={<Boxes />} />
          <InventoryMetric title="Entradas del mes" value="184" icon={<PackagePlus />} />
          <InventoryMetric title="Salidas del mes" value="231" icon={<PackageMinus />} />
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Existencia</th>
                <th>Apartado</th>
                <th>Disponible</th>
                <th>Ubicacion</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.sku}>
                  <td>
                    <Badge variant="outline">{item.sku}</Badge>
                  </td>
                  <td className="font-medium">{item.product}</td>
                  <td>{item.stock}</td>
                  <td>{item.reserved}</td>
                  <td>{item.stock - item.reserved}</td>
                  <td>{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function InventoryMetric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}
