"use client";

import { useMemo, useState } from "react";
import { Check, FileUp, X } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { mandatoryBidDocuments } from "@/lib/mock-data";

const configurableDocuments = [
  { id: "cfg-01", name: "Contrato firmado", required: true, status: "subido", version: 1 },
  { id: "cfg-02", name: "Orden de compra", required: false, status: "pendiente", version: 0 },
  { id: "cfg-03", name: "Ficha tecnica", required: true, status: "aprobado", version: 2 }
] as const;

export function DocumentChecklist() {
  const [contractType, setContractType] = useState("licitacion");
  const documents = useMemo(
    () => (contractType === "licitacion" ? mandatoryBidDocuments : configurableDocuments),
    [contractType]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Expediente documental</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Al seleccionar licitacion se cargan automaticamente los documentos obligatorios en Mexico.
          </p>
        </div>
        <div className="w-full md:w-64">
          <Select value={contractType} onChange={(event) => setContractType(event.target.value)}>
            <option value="licitacion">Tipo: Licitacion</option>
            <option value="directo">Tipo: Contrato directo</option>
            <option value="servicio">Tipo: Servicio configurable</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Obligatorio</th>
                <th>Estatus</th>
                <th>Version</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="font-medium">{document.name}</td>
                  <td>
                    <Badge variant={document.required ? "warning" : "muted"}>
                      {document.required ? "Obligatorio" : "Opcional"}
                    </Badge>
                  </td>
                  <td>
                    <DocumentStatus status={document.status} />
                  </td>
                  <td>v{document.version}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline">
                        <FileUp />
                        Subir
                      </Button>
                      <Button size="sm" variant="outline">
                        <Check />
                        Aprobar
                      </Button>
                      <Button size="sm" variant="outline">
                        <X />
                        Rechazar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentStatus({ status }: { status: string }) {
  const variant: BadgeProps["variant"] =
    status === "aprobado"
      ? "success"
      : status === "rechazado"
        ? "destructive"
        : status === "subido"
          ? "secondary"
          : "muted";

  return <Badge variant={variant}>{status}</Badge>;
}
