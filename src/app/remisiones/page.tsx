import { ProtectedShell } from "@/components/layout/protected-shell";
import { RemissionWorkbench } from "@/components/remisiones/remission-workbench";

export default function RemissionsPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Remisiones</h2>
          <p className="mt-1 text-muted-foreground">
            La entrega descuenta automaticamente lo pendiente por contrato, partida y producto.
          </p>
        </div>
        <RemissionWorkbench />
      </div>
    </ProtectedShell>
  );
}
