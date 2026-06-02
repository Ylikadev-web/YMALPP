import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";
import { getSessionProfile } from "@/lib/auth/session";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const profile = await getSessionProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <main className="login-stage relative flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-75">
        <Image
          src="/brand/yilka-logo.png"
          alt=""
          aria-hidden="true"
          width={720}
          height={720}
          priority
          className="login-logo-ambient w-[min(76vw,720px)] select-none object-contain"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <Card className="login-card relative w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-black/45 shadow-[0_0_54px_-22px_rgba(0,220,220,0.9)]">
            <Image src="/brand/yilka-logo.png" alt="YLIKA" width={64} height={64} className="h-16 w-16 object-cover" />
          </div>
          <CardTitle className="text-2xl">YLIKA ERP</CardTitle>
          <p className="text-sm text-muted-foreground">Acceso corporativo</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
