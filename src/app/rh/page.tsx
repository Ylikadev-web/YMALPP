import { FileText, UserPlus } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const employees = [
  { name: "Laura Medina", role: "Responsable de contratos", rfc: "MEL860412", salary: "$58,000", docs: 12 },
  { name: "Roberto Ruiz", role: "Logistica", rfc: "RUR900211", salary: "$34,000", docs: 9 },
  { name: "Nadia Torres", role: "Ventas gobierno", rfc: "TON920814", salary: "$41,000", docs: 11 }
];

export default function HrPage() {
  return (
    <ProtectedShell>
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">Recursos Humanos</h2>
            <p className="mt-1 text-muted-foreground">
              Expediente, CURP, RFC, NSS, contrato laboral, documentos, sueldo y prestaciones.
            </p>
          </div>
          <Button>
            <UserPlus />
            Nuevo empleado
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Expedientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>RFC</th>
                    <th>Puesto</th>
                    <th>Sueldo base</th>
                    <th>Documentos</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.rfc}>
                      <td className="font-medium">{employee.name}</td>
                      <td>{employee.rfc}</td>
                      <td>{employee.role}</td>
                      <td>{employee.salary}</td>
                      <td>
                        <Badge variant="outline">
                          <FileText className="mr-1 size-3" />
                          {employee.docs}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedShell>
  );
}
