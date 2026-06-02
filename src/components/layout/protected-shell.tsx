import { AppShell } from "@/components/layout/app-shell";
import { requireSessionProfile } from "@/lib/auth/session";

type ProtectedShellProps = {
  children: React.ReactNode;
};

export async function ProtectedShell({ children }: ProtectedShellProps) {
  const profile = await requireSessionProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
