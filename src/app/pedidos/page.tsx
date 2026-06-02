import { Lock, ShoppingCart } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createOrderAction } from "@/lib/actions/erp-actions";
import { getContractItems, getContracts, getOrders, getProducts } from "@/lib/db/live-queries";

export default async function OrdersPage() {
  const [orders, contracts, items, products] = await Promise.all([
    getOrders(),
    getContracts(),
    getContractItems(),
    getProducts()
  ]);

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Pedidos</h2>
            <p className="mt-1 text-muted-foreground">
              Relacion contrato - partida - producto, con bloqueo automatico fuera de contrato.
            </p>
          </div>
          <Button asChild>
            <a href="#nuevo-pedido">
              <ShoppingCart />
              Nuevo pedido
            </a>
          </Button>
        </div>
        <Card id="nuevo-pedido">
          <CardHeader>
            <CardTitle>Nuevo pedido real</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOrderAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input name="folio" placeholder="PED-2026-001" required />
              <Select name="contract_id">
                <option value="">Sin contrato</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.code}
                  </option>
                ))}
              </Select>
              <Select name="contract_item_id">
                <option value="">Fuera de contrato</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    Partida {item.item_number} - {item.products?.name ?? "Producto"}
                  </option>
                ))}
              </Select>
              <Select name="product_id" required>
                <option value="">Producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </Select>
              <Input name="quantity" type="number" min="1" step="0.001" placeholder="Cantidad" required />
              <Input name="unit_price" type="number" min="0" step="0.01" placeholder="Precio" />
              <Input name="notes" placeholder="Notas" />
              <Button type="submit">
                <ShoppingCart />
                Guardar pedido
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle>{order.folio}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{order.contracts?.code ?? "Sin contrato"}</div>
                  <div className="text-sm text-muted-foreground">{order.created_at}</div>
                </div>
                <Badge variant={order.status.includes("pendiente") ? "warning" : "success"}>
                  {order.status.includes("pendiente") ? <Lock className="mr-1 size-3" /> : null}
                  {order.status.replace("_", " ")}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">Aun no hay pedidos registrados.</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </ProtectedShell>
  );
}
