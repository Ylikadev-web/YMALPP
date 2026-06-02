import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number;
  delta?: number;
  currency?: boolean;
  intent?: "success" | "warning" | "danger" | "neutral";
};

export function MetricCard({
  label,
  value,
  delta = 0,
  currency = true,
  intent = "neutral"
}: MetricCardProps) {
  const trendUp = delta >= 0;
  const displayValue = currency ? formatCurrency(value) : `${value.toLocaleString("es-MX")}%`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-semibold tracking-normal">{displayValue}</div>
        <Badge
          variant={
            intent === "danger"
              ? "destructive"
              : intent === "warning"
                ? "warning"
                : trendUp
                  ? "success"
                  : "muted"
          }
        >
          {trendUp ? <ArrowUpRight /> : <ArrowDownRight />}
          {Math.abs(delta).toFixed(1)}%
        </Badge>
      </CardContent>
    </Card>
  );
}
