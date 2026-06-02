import { AlertTriangle, CheckCircle2, Clock, FileCheck2, PackageCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { approvals, contracts, projectRisks } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export function ProjectDashboard() {
  const activeContracts = contracts.filter((contract) => contract.status === "activo").length;
  const riskyProjects = projectRisks.filter((project) => project.risk === "alto").length;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Indicator title="Contratos activos" value={activeContracts} icon={<FileCheck2 />} />
        <Indicator title="Licitaciones abiertas" value={4} icon={<Clock />} />
        <Indicator title="Entregas pendientes" value={23} icon={<PackageCheck />} />
        <Indicator title="Aprobaciones" value={approvals.length} icon={<CheckCircle2 />} />
        <Indicator title="Proyectos en riesgo" value={riskyProjects} icon={<ShieldAlert />} intent="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contratos y avance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{contract.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contract.code} - {contract.client} - {formatCurrency(contract.amount)}
                    </div>
                  </div>
                  <Badge variant={contract.status === "en_riesgo" ? "warning" : "success"}>
                    {contract.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Avance financiero</span>
                      <span>{contract.financialProgress}%</span>
                    </div>
                    <Progress value={contract.financialProgress} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Avance fisico</span>
                      <span>{contract.physicalProgress}%</span>
                    </div>
                    <Progress value={contract.physicalProgress} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riesgos operativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectRisks.map((project) => (
              <div key={project.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 text-warning" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-muted-foreground">{project.contract}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={project.risk === "alto" ? "destructive" : "warning"}>
                        Riesgo {project.risk}
                      </Badge>
                      <Badge variant="outline">{project.pendingDeliveries} entregas</Badge>
                      <Badge variant="outline">{project.pendingApprovals} aprobaciones</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Indicator({
  title,
  value,
  icon,
  intent = "default"
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  intent?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className={intent === "warning" ? "text-warning" : "text-primary"}>{icon}</div>
      </CardContent>
    </Card>
  );
}
