import { Download, FileSpreadsheet, ImageDown, Printer } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function ReportsPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Reportes</h2>
          <p className="mt-1 text-muted-foreground">
            Filtros dinamicos y exportaciones a Excel, PDF o PNG.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Constructor de reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Select defaultValue="contratos">
                <option value="contratos">Contratos</option>
                <option value="finanzas">Finanzas</option>
                <option value="inventario">Inventario</option>
                <option value="rh">RH</option>
              </Select>
              <Input type="date" defaultValue="2026-01-01" />
              <Input type="date" defaultValue="2026-06-01" />
              <Select defaultValue="todos">
                <option value="todos">Todos los estatus</option>
                <option value="activo">Activo</option>
                <option value="riesgo">En riesgo</option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">
                <FileSpreadsheet />
                Excel
              </Button>
              <Button variant="outline">
                <Printer />
                PDF
              </Button>
              <Button variant="outline">
                <ImageDown />
                PNG
              </Button>
              <Button>
                <Download />
                Generar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}
