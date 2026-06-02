import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createRemissionAction } from "@/lib/actions/erp-actions";
import { getContractItems, getContracts, getWarehouses } from "@/lib/db/live-queries";

export default async function RemissionsPage() {
  const [contracts, items, warehouses] = await Promise.all([
    getContracts(),
    getContractItems(),
    getWarehouses()
  ]);

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Remisiones</h2>
          <p className="mt-1 text-muted-foreground">
            La entrega descuenta automaticamente lo pendiente por contrato, partida y producto.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nueva remision real</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createRemissionAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm font-medium">
                Contrato
                <Select name="contract_id" required>
                  <option value="">Selecciona contrato</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.code} - {contract.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Partida
                <Select name="contract_item_id" required>
                  <option value="">Selecciona partida</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_number} - {item.products?.name ?? "Producto"} - pendiente{" "}
                      {Number(item.pending_quantity).toLocaleString("es-MX")}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Almacen
                <Select name="warehouse_id">
                  <option value="">Sin almacen</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </label>
              <Input name="folio" placeholder="REM-2026-001" />
              <Input name="delivery_date" type="date" required />
              <Input name="received_by" placeholder="Recibe" />
              <Input name="quantity" type="number" min="1" step="0.001" placeholder="Cantidad" required />
              <Button type="submit">Registrar remision</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldos por partida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Partida</th>
                    <th>Producto</th>
                    <th>Contratado</th>
                    <th>Entregado</th>
                    <th>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.item_number}</td>
                      <td>{item.products?.name ?? "Producto"}</td>
                      <td>{Number(item.contracted_quantity).toLocaleString("es-MX")}</td>
                      <td>{Number(item.delivered_quantity).toLocaleString("es-MX")}</td>
                      <td>{Number(item.pending_quantity).toLocaleString("es-MX")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}
