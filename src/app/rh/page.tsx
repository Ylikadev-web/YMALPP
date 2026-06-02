import { FileText, UserPlus } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createEmployeeAction } from "@/lib/actions/erp-actions";
import { getEmployees } from "@/lib/db/live-queries";
import { formatCurrency } from "@/lib/utils";

export default async function HrPage() {
  const employees = await getEmployees();

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
          <Button asChild>
            <a href="#nuevo-empleado">
              <UserPlus />
              Nuevo empleado
            </a>
          </Button>
        </div>
        <Card id="nuevo-empleado">
          <CardHeader>
            <CardTitle>Alta de empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createEmployeeAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input name="full_name" placeholder="Nombre completo" required />
              <Input name="curp" placeholder="CURP" />
              <Input name="rfc" placeholder="RFC" />
              <Input name="nss" placeholder="NSS" />
              <Input name="phone" placeholder="Telefono" />
              <Input name="email" type="email" placeholder="correo@empresa.com" />
              <Input name="base_salary" type="number" min="0" step="0.01" placeholder="Sueldo base" />
              <Button type="submit">
                <UserPlus />
                Guardar empleado
              </Button>
            </form>
          </CardContent>
        </Card>
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
                    <tr key={employee.id}>
                      <td className="font-medium">{employee.full_name}</td>
                      <td>{employee.rfc ?? "N/A"}</td>
                      <td>{employee.email ?? "Sin correo"}</td>
                      <td>{formatCurrency(Number(employee.base_salary))}</td>
                      <td>
                        <Badge variant="outline">
                          <FileText className="mr-1 size-3" />
                          {employee.status}
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
