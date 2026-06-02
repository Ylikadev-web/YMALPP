import { Boxes, PackageMinus, PackagePlus } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addInventoryStockAction, createProductAction, createWarehouseAction } from "@/lib/actions/erp-actions";
import { getInventoryItems, getProducts, getWarehouses } from "@/lib/db/live-queries";

export default async function InventoryPage() {
  const [inventory, products, warehouses] = await Promise.all([
    getInventoryItems(),
    getProducts(),
    getWarehouses()
  ]);
  const totalStock = inventory.reduce((sum, item) => sum + Number(item.stock), 0);
  const totalReserved = inventory.reduce((sum, item) => sum + Number(item.reserved_quantity), 0);

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Inventario</h2>
          <p className="mt-1 text-muted-foreground">
            Existencias, entradas, salidas y apartados por contrato o pedido.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InventoryMetric title="Existencias" value={totalStock.toLocaleString("es-MX")} icon={<Boxes />} />
          <InventoryMetric title="Productos" value={products.length.toString()} icon={<PackagePlus />} />
          <InventoryMetric title="Apartado" value={totalReserved.toLocaleString("es-MX")} icon={<PackageMinus />} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Crear producto</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createProductAction} className="grid gap-4 md:grid-cols-2">
                <Input name="sku" placeholder="SKU" required />
                <Input name="name" placeholder="Nombre del producto" required />
                <Input name="unit" placeholder="Unidad" defaultValue="pieza" />
                <Input name="default_price" type="number" min="0" step="0.01" placeholder="Precio base" />
                <Button type="submit">Guardar producto</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Crear almacen</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createWarehouseAction} className="grid gap-4 md:grid-cols-2">
                <Input name="name" placeholder="Nombre del almacen" required />
                <Input name="address" placeholder="Direccion" />
                <Button type="submit">Guardar almacen</Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {warehouses.map((warehouse) => (
                  <Badge key={warehouse.id} variant="outline">
                    {warehouse.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Entrada de inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addInventoryStockAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <select
                className="h-10 rounded-md border border-input bg-background/45 px-3 text-sm"
                name="warehouse_id"
                required
              >
                <option value="">Almacen</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background/45 px-3 text-sm"
                name="product_id"
                required
              >
                <option value="">Producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
              <Input name="quantity" type="number" min="1" step="0.001" placeholder="Cantidad" required />
              <Input name="notes" placeholder="Notas" />
              <Button type="submit">Registrar entrada</Button>
            </form>
          </CardContent>
        </Card>
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
                <tr key={item.id}>
                  <td>
                    <Badge variant="outline">{item.products?.sku ?? "SKU"}</Badge>
                  </td>
                  <td className="font-medium">{item.products?.name ?? "Producto"}</td>
                  <td>{Number(item.stock).toLocaleString("es-MX")}</td>
                  <td>{Number(item.reserved_quantity).toLocaleString("es-MX")}</td>
                  <td>{Number(item.available_quantity).toLocaleString("es-MX")}</td>
                  <td>{item.warehouses?.name ?? "Sin almacen"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedShell>
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
