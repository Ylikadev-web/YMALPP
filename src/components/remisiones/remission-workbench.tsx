"use client";

import { useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { contractItems, contracts } from "@/lib/mock-data";

export function RemissionWorkbench() {
  const [contractId, setContractId] = useState(contracts[0]?.id ?? "");
  const items = useMemo(
    () => contractItems.filter((item) => item.contractId === contractId),
    [contractId]
  );
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const selectedItem = contractItems.find((item) => item.id === itemId) ?? items[0];
  const [quantity, setQuantity] = useState(1);
  const pendingBefore = selectedItem
    ? selectedItem.contractedQuantity - selectedItem.deliveredQuantity
    : 0;
  const pendingAfter = Math.max(0, pendingBefore - quantity);
  const deliveredAfter = selectedItem ? selectedItem.deliveredQuantity + quantity : 0;
  const progressAfter = selectedItem ? (deliveredAfter / selectedItem.contractedQuantity) * 100 : 0;

  function onContractChange(value: string) {
    setContractId(value);
    const firstItem = contractItems.find((item) => item.contractId === value);
    setItemId(firstItem?.id ?? "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar remision</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Contrato
              <Select value={contractId} onChange={(event) => onContractChange(event.target.value)}>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.code}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Partida y producto
              <Select value={selectedItem?.id ?? ""} onChange={(event) => setItemId(event.target.value)}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    Partida {item.itemNumber} - {item.product}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium">
            Cantidad entregada
            <Input
              type="number"
              min={1}
              max={pendingBefore}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>
          <Button>
            <PackageCheck />
            Registrar remision
          </Button>
        </div>

        {selectedItem ? (
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="text-sm text-muted-foreground">Saldo en tiempo real</div>
            <div className="mt-2 text-lg font-semibold">{selectedItem.product}</div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Counter label="Contratado" value={selectedItem.contractedQuantity} />
              <Counter label="Entregado" value={deliveredAfter} />
              <Counter label="Pendiente" value={pendingAfter} />
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Avance despues de remision</span>
                <span>{progressAfter.toFixed(1)}%</span>
              </div>
              <Progress value={progressAfter} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value.toLocaleString("es-MX")}</div>
    </div>
  );
}
