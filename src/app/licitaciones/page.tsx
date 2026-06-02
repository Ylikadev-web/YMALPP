import { DocumentChecklist } from "@/components/licitaciones/document-checklist";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BidsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Licitaciones</h2>
            <p className="mt-1 text-muted-foreground">
              Expedientes publicos mexicanos con versionado, aprobacion y rechazo documental.
            </p>
          </div>
          <Button>Nueva licitacion</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <BidCard title="Abiertas" value="4" badge="2 por vencer" />
          <BidCard title="En integracion" value="7" badge="16 docs pendientes" />
          <BidCard title="Fallos ganados" value="3" badge="2026" />
        </div>
        <DocumentChecklist />
      </div>
    </AppShell>
  );
}

function BidCard({ title, value, badge }: { title: string; value: string; badge: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div className="text-3xl font-semibold">{value}</div>
        <Badge variant="outline">{badge}</Badge>
      </CardContent>
    </Card>
  );
}
