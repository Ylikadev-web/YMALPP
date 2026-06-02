import { AppShell } from "@/components/layout/app-shell";
import { RemissionWorkbench } from "@/components/remisiones/remission-workbench";

export default function RemissionsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Remisiones</h2>
          <p className="mt-1 text-muted-foreground">
            La entrega descuenta automaticamente lo pendiente por contrato, partida y producto.
          </p>
        </div>
        <RemissionWorkbench />
      </div>
    </AppShell>
  );
}
