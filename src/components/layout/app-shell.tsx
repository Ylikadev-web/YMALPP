"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  FileCheck2,
  FilePenLine,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UsersRound,
  Warehouse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { canAny, roleLabels } from "@/lib/auth/permissions";
import type { SessionProfile } from "@/lib/db/schema";
import { appModules } from "@/lib/modules";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  FileCheck2,
  ScrollText,
  FilePenLine,
  ShoppingCart,
  Truck,
  Warehouse,
  UsersRound,
  Landmark,
  BarChart3,
  ShieldCheck,
  Settings
};

type AppShellProps = {
  children: React.ReactNode;
  profile: SessionProfile;
};

export function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const modules = appModules.filter((module) => canAny(profile.role, module.permissions));
  const current = modules.find((module) => pathname.startsWith(module.href)) ?? modules[0];
  const currentKey = current?.key ?? "dashboard";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={cn("module-surface min-h-screen", `module-${currentKey}`)}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r bg-card/86 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <div className="px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border bg-black/35">
                <Image src="/brand/yilka-logo.png" alt="YLIKA" width={40} height={40} className="h-10 w-10 object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold">YLIKA ERP</div>
                <div className="truncate text-sm text-muted-foreground">{profile.companyName}</div>
              </div>
            </div>
          </div>
          <Separator />
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {modules.map((module) => {
              const Icon = iconMap[module.icon as keyof typeof iconMap];
              const active = pathname.startsWith(module.href);

              return (
                <Button
                  key={module.key}
                  asChild
                  variant="ghost"
                  className={cn(
                    "module-nav-item h-auto w-full justify-start rounded-md px-3 py-2.5",
                    active && "module-nav-item-active font-semibold"
                  )}
                >
                  <Link href={module.href}>
                    <span className={cn("flex size-8 items-center justify-center rounded-md", active && "module-chip")}>
                      <Icon />
                    </span>
                    <span className="flex min-w-0 flex-col items-start">
                      <span>{module.label}</span>
                      <span className="hidden max-w-44 truncate text-xs font-normal text-muted-foreground xl:block">
                        {module.description}
                      </span>
                    </span>
                  </Link>
                </Button>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm font-medium">{profile.fullName}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
                <Badge variant="outline">{roleLabels[profile.role]}</Badge>
              </div>
              <Button className="mt-3 w-full justify-start" size="sm" variant="outline" onClick={signOut}>
                <LogOut />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/78 backdrop-blur-xl">
          <div className="flex min-h-20 items-center gap-3 px-4 py-3 lg:px-8">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-8 rounded-full bg-[rgb(var(--module-primary))]" />
                <div className="truncate text-sm text-muted-foreground">Modulo activo</div>
              </div>
              <h1 className="truncate text-xl font-semibold">{current?.label ?? "ERP"}</h1>
              <p className="mt-0.5 hidden text-sm text-muted-foreground md:block">{current?.description}</p>
            </div>
            <Button variant="outline" size="icon" aria-label="Notificaciones">
              <Bell />
            </Button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
