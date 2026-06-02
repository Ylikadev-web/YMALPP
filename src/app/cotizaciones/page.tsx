import { Palette, Plus, Signature } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClientAction, createQuoteAction } from "@/lib/actions/erp-actions";
import { getClients } from "@/lib/db/live-queries";

export default async function QuotesPage() {
  const clients = await getClients();

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
          <Button asChild>
            <a href="#nueva-cotizacion">
              <Plus />
              Nueva cotizacion
            </a>
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Crear cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createClientAction} className="grid gap-4 md:grid-cols-2">
                <Input name="name" placeholder="Nombre comercial" required />
                <Input name="legal_name" placeholder="Razon social" />
                <Input name="rfc" placeholder="RFC" required />
                <Input name="contact_name" placeholder="Contacto" />
                <Input name="email" type="email" placeholder="correo@cliente.com" />
                <Input name="phone" placeholder="Telefono" />
                <Button type="submit">
                  <Plus />
                  Guardar cliente
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card id="nueva-cotizacion">
            <CardHeader>
              <CardTitle>Nueva cotizacion</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createQuoteAction} className="grid gap-4 md:grid-cols-2">
                <Select name="client_id">
                  <option value="">Cliente sin asignar</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
                <Input name="folio" placeholder="COT-2026-001" required />
                <Input name="title" placeholder="Titulo de cotizacion" required />
                <Input name="subtotal" type="number" min="0" step="0.01" placeholder="Subtotal" />
                <Input name="valid_until" type="date" />
                <Button type="submit">
                  <Plus />
                  Guardar cotizacion
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Clientes registrados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aun no hay clientes en Supabase.</p>
              ) : (
                clients.map((client) => (
                  <div key={client.id} className="rounded-md border p-3">
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground">{client.rfc}</div>
                  </div>
                ))
              )}
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
          <div className="size-10 rounded-md shadow-[0_0_24px_-6px_currentColor]" style={{ backgroundColor: color }} />
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
