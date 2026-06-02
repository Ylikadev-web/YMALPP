import { Palette, Plus, Signature } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function QuotesPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Cotizador</h2>
            <p className="mt-1 text-muted-foreground">
              Clientes, plantillas editables, identidad visual y exportacion comercial.
            </p>
          </div>
          <Button>
            <Plus />
            Nueva cotizacion
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue="existente">
                <option value="existente">Seleccionar cliente existente</option>
                <option value="nuevo">Crear nuevo cliente</option>
              </Select>
              <Input placeholder="Buscar por nombre o RFC" />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <TemplateCard title="YLIKA MATERIALES" color="hsl(var(--primary))" />
            <TemplateCard title="MONE" color="hsl(var(--secondary))" />
          </div>
        </div>
      </div>
    </ProtectedShell>
  );
}

function TemplateCard({ title, color }: { title: string; color: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md" style={{ backgroundColor: color }} />
          <div className="text-sm text-muted-foreground">Logo, colores, encabezado y pie de pagina</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Palette />
            Editor visual
          </Button>
          <Button variant="outline" size="sm">
            <Signature />
            Firma
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
