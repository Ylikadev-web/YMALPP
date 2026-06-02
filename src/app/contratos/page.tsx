import { ContractItemsTable } from "@/components/contracts/contract-items-table";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createContractAction,
  createContractItemAction,
  deleteAttachmentAction,
  deleteContractAction,
  deleteContractItemAction,
  importCaapsSeedAction,
  importContractItemsSpreadsheetAction,
  uploadGenericAttachmentAction
} from "@/lib/actions/erp-actions";
import { contractTypeLabel, mexicanContractTypes } from "@/lib/contract-types";
import { getAttachments, getClients, getContractItems, getContracts, getProducts } from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export default async function ContractsPage() {
  const [contracts, clients, products, items, attachments] = await Promise.all([
    getContracts(),
    getClients(),
    getProducts(),
    getContractItems(),
    getAttachments("contract")
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
                  {mexicanContractTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
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
        <div className="space-y-4">
          {contracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{contract.code}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {contractTypeLabel(contract.contract_type)} - {contract.clients?.name ?? "Sin cliente"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={contract.status === "en_riesgo" ? "warning" : "success"}>
                      {contract.status.replace("_", " ")}
                    </Badge>
                    <form action={deleteContractAction}>
                      <input name="id" type="hidden" value={contract.id} />
                      <Button size="sm" type="submit" variant="destructive">
                        Eliminar
                      </Button>
                    </form>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <div className="font-medium">{contract.name}</div>
                <div>{formatCurrency(contract.amount)}</div>
                <div className="text-muted-foreground">
                  {contract.start_date} a {contract.end_date}
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-3 font-medium">Agregar producto / partida</div>
                  <form action={createContractItemAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <input name="contract_id" type="hidden" value={contract.id} />
                    <Input name="item_number" placeholder="Partida" required />
                    <Select name="product_id" required>
                      <option value="">Producto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </option>
                      ))}
                    </Select>
                    <Input name="description" placeholder="Descripcion" />
                    <Input name="requisition_number" placeholder="Requisicion" />
                    <Input name="brand" placeholder="Marca" />
                    <Input name="unit" placeholder="Unidad" />
                    <Input name="contracted_quantity" type="number" min="1" step="0.001" placeholder="Cantidad" />
                    <Input name="unit_price" type="number" min="0" step="0.01" placeholder="P.U." />
                    <Button type="submit">Agregar</Button>
                  </form>
                  <div className="mt-4 grid gap-3 rounded-md border bg-background/25 p-3 md:grid-cols-[1fr_auto]">
                    <form
                      action={importContractItemsSpreadsheetAction}
                      className="grid gap-3 md:grid-cols-[1fr_auto]"
                      encType="multipart/form-data"
                    >
                      <input name="contract_id" type="hidden" value={contract.id} />
                      <Input name="file" type="file" accept=".xlsx,.xls,.csv,.pdf" required />
                      <Button type="submit" variant="secondary">
                        Importar partidas
                      </Button>
                    </form>
                    <form action={importCaapsSeedAction}>
                      <input name="contract_id" type="hidden" value={contract.id} />
                      <Button type="submit" variant="outline">
                        Precargar CAAPS26-04006
                      </Button>
                    </form>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Partida</th>
                        <th>Producto</th>
                        <th>Requisicion</th>
                        <th>Contratado</th>
                        <th>Pendiente</th>
                        <th>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items
                        .filter((item) => item.contract_id === contract.id)
                        .map((item) => (
                          <tr key={item.id}>
                            <td>{item.item_number}</td>
                            <td>
                              <div>{item.products?.name ?? "Producto"}</div>
                              {item.brand ? <div className="text-xs text-muted-foreground">{item.brand}</div> : null}
                            </td>
                            <td>{item.requisition_number ?? item.description ?? "Sin requisicion"}</td>
                            <td>{Number(item.contracted_quantity).toLocaleString("es-MX")}</td>
                            <td>{Number(item.pending_quantity).toLocaleString("es-MX")}</td>
                            <td>
                              <form action={deleteContractItemAction}>
                                <input name="id" type="hidden" value={item.id} />
                                <Button size="sm" type="submit" variant="destructive">
                                  Eliminar
                                </Button>
                              </form>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-3 font-medium">Adjuntos del contrato</div>
                  <form
                    action={uploadGenericAttachmentAction}
                    className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                    encType="multipart/form-data"
                  >
                    <input name="entity_type" type="hidden" value="contract" />
                    <input name="entity_id" type="hidden" value={contract.id} />
                    <Input name="name" placeholder="Nombre del archivo" />
                    <Input name="file" type="file" required />
                    <Button type="submit">Adjuntar</Button>
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments
                      .filter((attachment) => attachment.entity_id === contract.id)
                      .map((attachment) => (
                        <form key={attachment.id} action={deleteAttachmentAction} className="flex items-center gap-2">
                          <Badge variant="outline">{attachment.name}</Badge>
                          <a className="text-sm text-primary underline-offset-4 hover:underline" href={`/api/files/${attachment.id}`}>
                            Abrir
                          </a>
                          <input name="id" type="hidden" value={attachment.id} />
                          <Button size="sm" type="submit" variant="ghost">
                            Quitar
                          </Button>
                        </form>
                      ))}
                  </div>
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
