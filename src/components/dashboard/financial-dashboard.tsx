"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { cashflow, financialMetrics } from "@/lib/mock-data";

export function FinancialDashboard() {
  return (
    <section className="space-y-4">
      <div className="erp-grid">
        {financialMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            intent={metric.intent}
            currency={!["ROI", "Margen"].includes(metric.label)}
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Flujo de efectivo</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString("es-MX")}`} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary) / 0.22)"
                  name="Ingresos"
                />
                <Area
                  type="monotone"
                  dataKey="egresos"
                  stroke="hsl(var(--warning))"
                  fill="hsl(var(--warning) / 0.18)"
                  name="Egresos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rentabilidad por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashflow.map((row) => ({
                  month: row.month,
                  utilidad: row.ingresos - row.egresos
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString("es-MX")}`} />
                <Bar dataKey="utilidad" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
