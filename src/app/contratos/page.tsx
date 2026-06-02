import { ContractItemsTable } from "@/components/contracts/contract-items-table";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createContractAction } from "@/lib/actions/erp-actions";
import { getClients, getContracts, getProducts } from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export default async function ContractsPage() {
  const [contracts, clients, products] = await Promise.all([
    getContracts(),
    getClients(),
    getProducts()
  ]);

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
          <Button asChild>
            <a href="#nuevo-contrato">Nuevo contrato</a>
          </Button>
        </div>
        <Card id="nuevo-contrato">
          <CardHeader>
            <CardTitle>Alta real de contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createContractAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm font-medium">
                Cliente
                <Select name="client_id" required>
                  <option value="">Selecciona cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Tipo
                <Select name="contract_type" defaultValue="directo">
                  <option value="licitacion">Licitacion</option>
                  <option value="directo">Directo</option>
                  <option value="marco">Marco</option>
                  <option value="servicio">Servicio</option>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Codigo
                <Input name="code" placeholder="LPN-YLK-2026-001" required />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Nombre
                <Input name="name" placeholder="Contrato / proyecto" required />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Monto
                <Input name="amount" type="number" min="0" step="0.01" required />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Inicio
                <Input name="start_date" type="date" required />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Fin
                <Input name="end_date" type="date" required />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Producto inicial
                <Select name="product_id">
                  <option value="">Sin partida inicial</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Numero partida
                <Input name="item_number" placeholder="1" />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Cantidad contratada
                <Input name="contracted_quantity" type="number" min="1" step="0.001" />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Precio unitario
                <Input name="unit_price" type="number" min="0" step="0.01" />
              </label>
              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  Guardar contrato
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                <div className="text-muted-foreground">{contract.clients?.name ?? "Sin cliente"}</div>
                <div>{formatCurrency(contract.amount)}</div>
                <div className="text-muted-foreground">
                  {contract.start_date} a {contract.end_date}
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
