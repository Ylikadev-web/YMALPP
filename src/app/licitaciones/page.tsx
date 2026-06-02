import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createContractItemAction,
  deleteAttachmentAction,
  deleteContractAction,
  deleteContractItemAction,
  importCaapsSeedAction,
  importContractItemsSpreadsheetAction,
  updateDocumentStatusAction,
  uploadContractDocumentVersionAction,
  uploadGenericAttachmentAction
} from "@/lib/actions/erp-actions";
import { contractTypeLabel } from "@/lib/contract-types";
import { getAttachments, getBidDocuments, getContractItems, getContracts, getProducts } from "@/lib/db/live-queries";

export default async function BidsPage() {
  const [documents, contracts, items, products, bidAttachments] = await Promise.all([
    getBidDocuments(),
    getContracts(),
    getContractItems(),
    getProducts(),
    getAttachments("bid")
  ]);
  const licitaciones = contracts.filter((contract) =>
    ["licitacion", "licitacion_publica_nacional", "licitacion_publica_internacional", "invitacion_a_cuando_menos_tres"].includes(
      contract.contract_type
    )
  );
  const pendientes = documents.filter((document) => document.status === "pendiente").length;

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Licitaciones</h2>
            <p className="mt-1 text-muted-foreground">
              Expedientes publicos mexicanos con versionado, aprobacion y rechazo documental.
            </p>
          </div>
          <Button asChild>
            <a href="/contratos#nuevo-contrato">Nueva licitacion</a>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <BidCard title="Abiertas" value={licitaciones.length.toString()} badge="Supabase" />
          <BidCard title="En integracion" value={pendientes.toString()} badge="docs pendientes" />
          <BidCard title="Documentos" value={documents.length.toString()} badge="checklist real" />
        </div>
        {licitaciones.map((contract) => {
          const contractDocuments = documents.filter((document) => document.contract_id === contract.id);
          const contractItems = items.filter((item) => item.contract_id === contract.id);
          const contractAttachments = bidAttachments.filter((attachment) => attachment.entity_id === contract.id);

          return (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>{contract.code}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {contract.name} - {contractTypeLabel(contract.contract_type)}
                    </p>
                  </div>
                  <form action={deleteContractAction}>
                    <input name="id" type="hidden" value={contract.id} />
                    <Button type="submit" variant="destructive">
                      Eliminar licitacion
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <details className="section-disclosure">
                  <summary>
                    <span>Productos, partidas y precarga CAAPS</span>
                    <Badge variant="outline">{contractItems.length} partidas</Badge>
                  </summary>
                  <div className="section-disclosure-body space-y-4">
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
                    <div className="grid gap-3 rounded-md border bg-background/25 p-3 md:grid-cols-[1fr_auto]">
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
                    <div className="overflow-hidden rounded-lg border">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Partida</th>
                            <th>Producto</th>
                            <th>Requisicion</th>
                            <th>Cantidad</th>
                            <th>P.U.</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractItems.map((item) => (
                            <tr key={item.id}>
                              <td>{item.item_number}</td>
                              <td>
                                <div>{item.products?.name ?? "Producto"}</div>
                                {item.brand ? <div className="text-xs text-muted-foreground">{item.brand}</div> : null}
                              </td>
                              <td>{item.requisition_number ?? item.description ?? "Sin requisicion"}</td>
                              <td>{Number(item.contracted_quantity).toLocaleString("es-MX")}</td>
                              <td>{Number(item.unit_price).toLocaleString("es-MX")}</td>
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
                  </div>
                </details>
                <details className="section-disclosure">
                  <summary>
                    <span>Expediente y checklist documental</span>
                    <Badge variant="outline">{contractDocuments.length + contractAttachments.length} docs</Badge>
                  </summary>
                  <div className="section-disclosure-body space-y-4">
                    <form
                      action={uploadGenericAttachmentAction}
                      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                      encType="multipart/form-data"
                    >
                      <input name="entity_type" type="hidden" value="bid" />
                      <input name="entity_id" type="hidden" value={contract.id} />
                      <Input name="name" placeholder="Nombre del documento" />
                      <Input name="file" type="file" required />
                      <Button type="submit">Adjuntar</Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {contractAttachments.map((attachment) => (
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
                    <div className="overflow-hidden rounded-lg border">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Documento</th>
                            <th>Tipo</th>
                            <th>Estatus</th>
                            <th>Version</th>
                            <th>Archivo</th>
                            <th>Revision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractDocuments.map((document) => (
                            <tr key={document.id}>
                              <td className="font-medium">{document.name}</td>
                              <td>{document.required ? "Obligatorio" : "Opcional"}</td>
                              <td>
                                <Badge variant={document.status === "aprobado" ? "success" : "warning"}>
                                  {document.status}
                                </Badge>
                              </td>
                              <td>v{document.current_version}</td>
                              <td>
                                <form
                                  action={uploadContractDocumentVersionAction}
                                  className="flex flex-wrap gap-2"
                                  encType="multipart/form-data"
                                >
                                  <input name="document_id" type="hidden" value={document.id} />
                                  <Input className="w-56" name="file" type="file" required />
                                  <Input className="w-44" name="comments" placeholder="Comentario version" />
                                  <Button size="sm" type="submit">
                                    Subir version
                                  </Button>
                                </form>
                              </td>
                              <td>
                                <form action={updateDocumentStatusAction} className="flex flex-wrap gap-2">
                                  <input name="id" type="hidden" value={document.id} />
                                  <Input className="w-44" name="rejection_reason" placeholder="Motivo rechazo" />
                                  <Button name="status" size="sm" type="submit" value="aprobado">
                                    Aprobar
                                  </Button>
                                  <Button name="status" size="sm" type="submit" value="rechazado" variant="destructive">
                                    Rechazar
                                  </Button>
                                </form>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
        {licitaciones.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              Crea una licitacion desde Contratos usando un tipo de contratacion publica mexicana.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ProtectedShell>
  );
}

function BidCard({ title, value, badge }: { title: string; value: string; badge: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div className="text-3xl font-semibold">{value}</div>
        <Badge variant="outline">{badge}</Badge>
      </CardContent>
    </Card>
  );
}
