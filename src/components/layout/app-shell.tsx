"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  FileCheck2,
  FilePenLine,
  Landmark,
  LayoutDashboard,
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
import { appModules } from "@/lib/modules";
import { demoProfile } from "@/lib/mock-data";
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
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const modules = appModules.filter((module) => canAny(demoProfile.role, module.permissions));
  const current = modules.find((module) => pathname.startsWith(module.href)) ?? modules[0];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="px-5 py-5">
            <div className="text-lg font-semibold">YMALPP ERP</div>
            <div className="text-sm text-muted-foreground">{demoProfile.companyName}</div>
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
                  variant={active ? "secondary" : "ghost"}
                  className={cn("h-auto w-full justify-start px-3 py-2.5", active && "font-semibold")}
                >
                  <Link href={module.href}>
                    <Icon />
                    <span>{module.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm font-medium">{demoProfile.fullName}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{demoProfile.email}</span>
                <Badge variant="outline">{roleLabels[demoProfile.role]}</Badge>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-muted-foreground">Modulo activo</div>
              <h1 className="truncate text-xl font-semibold">{current?.label ?? "ERP"}</h1>
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
