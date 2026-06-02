import { Lock, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const orders = [
  { id: "PED-1042", contract: "LPN-YLK-2026-001", product: "Monitor Multiparametro", status: "Dentro de contrato" },
  { id: "PED-1043", contract: "LPN-YLK-2026-001", product: "Kit de instalacion avanzada", status: "Pendiente de aprobacion" }
];

export default function OrdersPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Pedidos</h2>
            <p className="mt-1 text-muted-foreground">
              Relacion contrato - partida - producto, con bloqueo automatico fuera de contrato.
            </p>
          </div>
          <Button>
            <ShoppingCart />
            Nuevo pedido
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle>{order.id}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{order.product}</div>
                  <div className="text-sm text-muted-foreground">{order.contract}</div>
                </div>
                <Badge variant={order.status.includes("Pendiente") ? "warning" : "success"}>
                  {order.status.includes("Pendiente") ? <Lock className="mr-1 size-3" /> : null}
                  {order.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
