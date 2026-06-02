import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";
import { getSessionProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const profile = await getSessionProfile();

  if (profile) {
    redirect("/dashboard");
  }

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
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
