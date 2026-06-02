import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateApprovalAction } from "@/lib/actions/erp-actions";
import { getApprovals } from "@/lib/db/live-queries";

export default async function ApprovalsPage() {
  const approvals = await getApprovals();

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Aprobaciones</h2>
          <p className="mt-1 text-muted-foreground">
            Solo Socios y Admin pueden aprobar productos fuera de contrato, cambios y correcciones.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes pendientes y bitacora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay aprobaciones registradas.</p>
            ) : (
              approvals.map((approval) => (
                <div key={approval.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{approval.module}</Badge>
                        <Badge variant={approval.status === "aprobado" ? "success" : "warning"}>
                          {approval.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="mt-2 font-medium">{approval.title}</div>
                      <div className="text-xs text-muted-foreground">{approval.created_at}</div>
                    </div>
                    <form action={updateApprovalAction} className="flex flex-wrap items-center gap-2">
                      <input name="id" type="hidden" value={approval.id} />
                      <Input className="w-56" name="comment" placeholder="Comentario" />
                      <Button name="status" size="sm" type="submit" value="aprobado">
                        Aprobar
                      </Button>
                      <Button name="status" size="sm" type="submit" value="informacion_requerida" variant="outline">
                        Solicitar info
                      </Button>
                      <Button name="status" size="sm" type="submit" value="rechazado" variant="destructive">
                        Rechazar
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}
