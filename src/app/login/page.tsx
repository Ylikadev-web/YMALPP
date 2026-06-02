import { Building2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 />
          </div>
          <CardTitle>Acceso YMALPP ERP</CardTitle>
          <p className="text-sm text-muted-foreground">
            Autenticacion preparada para Supabase Auth con sesiones protegidas por middleware.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="space-y-2 text-sm font-medium">
            Correo
            <Input type="email" placeholder="usuario@empresa.com" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Contrasena
            <Input type="password" placeholder="********" />
          </label>
          <Button className="w-full">
            <LockKeyhole />
            Entrar
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
