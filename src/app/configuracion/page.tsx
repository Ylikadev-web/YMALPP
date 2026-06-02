import { Settings, UserCog } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rolePermissions } from "@/lib/auth/permissions";

export default function SettingsPage() {
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
              Documentos no licitacion
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Badge variant="warning">Contrato firmado - obligatorio</Badge>
            <Badge variant="outline">Orden de compra - opcional</Badge>
            <Badge variant="warning">Ficha tecnica - obligatorio</Badge>
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}
