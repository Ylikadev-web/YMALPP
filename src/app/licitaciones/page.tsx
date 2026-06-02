import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  updateDocumentStatusAction,
  uploadContractDocumentVersionAction
} from "@/lib/actions/erp-actions";
import { getBidDocuments, getContracts } from "@/lib/db/live-queries";

export default async function BidsPage() {
  const [documents, contracts] = await Promise.all([getBidDocuments(), getContracts()]);
  const licitaciones = contracts.filter((contract) => contract.contract_type === "licitacion");
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
        <Card>
          <CardHeader>
            <CardTitle>Documentos de licitacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contrato</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Estatus</th>
                    <th>Version</th>
                    <th>Archivo</th>
                    <th>Revision</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>{document.contracts?.code ?? "Contrato"}</td>
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
                          <input name="id" type="hidden" value={document.id} />
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
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground">
                        Crea un contrato de tipo licitacion para generar automaticamente el checklist mexicano.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
