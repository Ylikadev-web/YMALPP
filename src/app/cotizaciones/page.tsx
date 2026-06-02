import { Palette, Plus, Signature, Trash2 } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createClientAction,
  createQuoteAction,
  deleteAttachmentAction,
  deleteClientAction,
  deleteQuoteAction,
  updateQuoteTemplateAction,
  uploadGenericAttachmentAction
} from "@/lib/actions/erp-actions";
import { getAttachments, getClients, getQuoteTemplates, getQuotes } from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export default async function QuotesPage() {
  const [clients, quotes, templates, clientAttachments, quoteAttachments] = await Promise.all([
    getClients(),
    getQuotes(),
    getQuoteTemplates(),
    getAttachments("client"),
    getAttachments("quote")
  ]);
  const baseTemplates = [
    {
      id: "",
      name: "YLIKA MATERIALES",
      logo_url: "",
      primary_color: "#1f766f",
      secondary_color: "#c29a54",
      header: { text: "YLIKA MATERIALES" },
      footer: { text: "Gracias por su preferencia" },
      signature: { name: "Direccion Comercial" },
      editable_schema: { terms: "Precios sujetos a disponibilidad." }
    },
    {
      id: "",
      name: "MONE",
      logo_url: "",
      primary_color: "#20344a",
      secondary_color: "#b9965a",
      header: { text: "MONE" },
      footer: { text: "Cotizacion confidencial" },
      signature: { name: "Representante autorizado" },
      editable_schema: { terms: "Vigencia segun propuesta." }
    }
  ];
  const templateDefaults = [
    ...templates,
    ...baseTemplates.filter((base) => !templates.some((template) => template.name === base.name))
  ];

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
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.rfc}</div>
                      </div>
                      <form action={deleteClientAction}>
                        <input name="id" type="hidden" value={client.id} />
                        <Button size="sm" type="submit" variant="destructive">
                          <Trash2 />
                        </Button>
                      </form>
                    </div>
                    <form
                      action={uploadGenericAttachmentAction}
                      className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                      encType="multipart/form-data"
                    >
                      <input name="entity_type" type="hidden" value="client" />
                      <input name="entity_id" type="hidden" value={client.id} />
                      <Input name="name" placeholder="Documento cliente" />
                      <Input name="file" type="file" required />
                      <Button size="sm" type="submit" variant="outline">
                        Adjuntar
                      </Button>
                    </form>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {clientAttachments
                        .filter((attachment) => attachment.entity_id === client.id)
                        .map((attachment) => (
                          <form key={attachment.id} action={deleteAttachmentAction} className="flex items-center gap-2">
                            <a className="text-sm text-primary underline-offset-4 hover:underline" href={`/api/files/${attachment.id}`}>
                              {attachment.name}
                            </a>
                            <input name="id" type="hidden" value={attachment.id} />
                            <Button size="sm" type="submit" variant="ghost">
                              Quitar
                            </Button>
                          </form>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones registradas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotes.map((quote) => (
                <div key={quote.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {quote.folio} - {quote.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {quote.clients?.name ?? "Sin cliente"} - {formatCurrency(Number(quote.total))}
                      </div>
                    </div>
                    <form action={deleteQuoteAction}>
                      <input name="id" type="hidden" value={quote.id} />
                      <Button size="sm" type="submit" variant="destructive">
                        <Trash2 />
                      </Button>
                    </form>
                  </div>
                  <form
                    action={uploadGenericAttachmentAction}
                    className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                    encType="multipart/form-data"
                  >
                    <input name="entity_type" type="hidden" value="quote" />
                    <input name="entity_id" type="hidden" value={quote.id} />
                    <Input name="name" placeholder="Documento cotizacion" />
                    <Input name="file" type="file" required />
                    <Button size="sm" type="submit" variant="outline">
                      Adjuntar
                    </Button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quoteAttachments
                      .filter((attachment) => attachment.entity_id === quote.id)
                      .map((attachment) => (
                        <form key={attachment.id} action={deleteAttachmentAction} className="flex items-center gap-2">
                          <a className="text-sm text-primary underline-offset-4 hover:underline" href={`/api/files/${attachment.id}`}>
                            {attachment.name}
                          </a>
                          <input name="id" type="hidden" value={attachment.id} />
                          <Button size="sm" type="submit" variant="ghost">
                            Quitar
                          </Button>
                        </form>
                      ))}
                  </div>
                </div>
              ))}
              {quotes.length === 0 ? <p className="text-sm text-muted-foreground">Aun no hay cotizaciones.</p> : null}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Plantillas personalizables</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            {templateDefaults.map((template) => (
              <TemplateCard key={`${template.id}-${template.name}`} template={template} />
            ))}
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}

function textFrom(value: unknown) {
  return typeof value === "object" && value && "text" in value ? String((value as { text?: unknown }).text ?? "") : "";
}

function TemplateCard({
  template
}: {
  template: {
    id: string;
    name: string;
    logo_url?: string | null;
    primary_color: string;
    secondary_color: string;
    header?: Record<string, unknown> | null;
    footer?: Record<string, unknown> | null;
    signature?: Record<string, unknown> | null;
    editable_schema?: Record<string, unknown> | null;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-md shadow-[0_0_24px_-10px_currentColor]"
            style={{ backgroundColor: template.primary_color }}
          />
          <div className="text-sm text-muted-foreground">Logo, colores, encabezado y pie de pagina</div>
        </div>
        <form action={updateQuoteTemplateAction} className="grid gap-3 md:grid-cols-2">
          <input name="template_id" type="hidden" value={template.id} />
          <Input name="name" defaultValue={template.name} placeholder="Nombre plantilla" required />
          <Input name="logo_url" defaultValue={template.logo_url ?? ""} placeholder="URL logo" />
          <Input name="primary_color" defaultValue={template.primary_color} type="color" />
          <Input name="secondary_color" defaultValue={template.secondary_color} type="color" />
          <Input name="header_text" defaultValue={textFrom(template.header)} placeholder="Encabezado" />
          <Input name="footer_text" defaultValue={textFrom(template.footer)} placeholder="Pie de pagina" />
          <Input
            name="signature_name"
            defaultValue={
              typeof template.signature === "object" && template.signature
                ? String((template.signature as { name?: unknown }).name ?? "")
                : ""
            }
            placeholder="Firma"
          />
          <Input
            name="terms"
            defaultValue={
              typeof template.editable_schema === "object" && template.editable_schema
                ? String((template.editable_schema as { terms?: unknown }).terms ?? "")
                : ""
            }
            placeholder="Terminos"
          />
          <Button type="submit" variant="outline">
            <Palette />
            Guardar estilo
          </Button>
          <Button type="submit">
            <Signature />
            Aplicar plantilla
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
