import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { ProjectDashboard } from "@/components/dashboard/project-dashboard";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Control integral</h2>
          <p className="mt-1 text-muted-foreground">
            Vista ejecutiva de contratos, entregas, aprobaciones, rentabilidad y avance.
          </p>
        </div>
        <Tabs defaultValue="proyectos">
          <TabsList>
            <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
            <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
          </TabsList>
          <TabsContent value="proyectos">
            <ProjectDashboard />
          </TabsContent>
          <TabsContent value="finanzas">
            <FinancialDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedShell>
  );
}
