import { Settings, UserCog } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { rolePermissions } from "@/lib/auth/permissions";
import { createProcessStageAction, deleteProcessStageAction } from "@/lib/actions/erp-actions";
import { contractTypeLabel, mexicanContractTypes } from "@/lib/contract-types";
import { getContractProcessStages } from "@/lib/db/live-queries";

export default async function SettingsPage() {
  const stages = await getContractProcessStages();

  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Configuracion</h2>
            <p className="mt-1 text-muted-foreground">
              Multiempresa, usuarios, roles, permisos y documentos configurables por tipo de contrato.
            </p>
          </div>
          <Button>
            <UserCog />
            Invitar usuario
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {Object.entries(rolePermissions).map(([role, permissions]) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="capitalize">{role}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Proceso personalizable por tipo de contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createProcessStageAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Select name="contract_type" required>
                <option value="">Tipo de contrato</option>
                {mexicanContractTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              <Input name="name" placeholder="Etapa del proceso" required />
              <Input name="sort_order" type="number" placeholder="Orden" defaultValue="100" />
              <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <input name="required" type="checkbox" />
                Obligatoria
              </label>
              <Button type="submit">Agregar etapa</Button>
            </form>
            <div className="overflow-hidden rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Etapa</th>
                    <th>Orden</th>
                    <th>Requisito</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage) => (
                    <tr key={stage.id}>
                      <td>{contractTypeLabel(stage.contract_type)}</td>
                      <td className="font-medium">{stage.name}</td>
                      <td>{stage.sort_order}</td>
                      <td>
                        <Badge variant={stage.required ? "warning" : "outline"}>
                          {stage.required ? "Obligatoria" : "Opcional"}
                        </Badge>
                      </td>
                      <td>
                        <form action={deleteProcessStageAction}>
                          <input name="id" type="hidden" value={stage.id} />
                          <Button size="sm" type="submit" variant="destructive">
                            Eliminar
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {stages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground">
                        Aun no hay etapas configuradas.
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
