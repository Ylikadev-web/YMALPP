"use client";

import { useState } from "react";
import { Check, Info, X } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approvals as initialApprovals } from "@/lib/mock-data";

export function ApprovalsPanel() {
  const [items, setItems] = useState(initialApprovals);

  function updateStatus(id: string, status: "aprobado" | "rechazado" | "informacion_requerida") {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Panel de aprobaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((approval) => (
          <div key={approval.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{approval.module}</Badge>
                  <ApprovalStatus status={approval.status} />
                </div>
                <div className="mt-2 font-medium">{approval.title}</div>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{approval.reason}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Solicitado por {approval.requestedBy} - {approval.createdAt}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => updateStatus(approval.id, "aprobado")}>
                  <Check />
                  Aprobar
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(approval.id, "informacion_requerida")}>
                  <Info />
                  Solicitar info
                </Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus(approval.id, "rechazado")}>
                  <X />
                  Rechazar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ApprovalStatus({ status }: { status: string }) {
  const variant: BadgeProps["variant"] =
    status === "aprobado"
      ? "success"
      : status === "rechazado"
        ? "destructive"
        : status === "informacion_requerida"
          ? "warning"
          : "muted";

  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
