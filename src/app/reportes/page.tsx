import { Download, FileSpreadsheet, ImageDown, Printer } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createReportExportAction } from "@/lib/actions/erp-actions";

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
            <form action={createReportExportAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
              <Select name="module" defaultValue="contratos">
                <option value="contratos">Contratos</option>
                <option value="finanzas">Finanzas</option>
                <option value="inventario">Inventario</option>
                <option value="rh">RH</option>
              </Select>
              <Input name="from" type="date" defaultValue="2026-01-01" />
              <Input name="to" type="date" defaultValue="2026-06-01" />
              <Select name="status" defaultValue="todos">
                <option value="todos">Todos los estatus</option>
                <option value="activo">Activo</option>
                <option value="riesgo">En riesgo</option>
              </Select>
              </div>
              <div className="flex flex-wrap gap-2">
              <Button name="format" type="submit" value="excel" variant="outline">
                <FileSpreadsheet />
                Excel
              </Button>
              <Button name="format" type="submit" value="pdf" variant="outline">
                <Printer />
                PDF
              </Button>
              <Button name="format" type="submit" value="png" variant="outline">
                <ImageDown />
                PNG
              </Button>
              <Button name="format" type="submit" value="excel">
                <Download />
                Generar
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}
