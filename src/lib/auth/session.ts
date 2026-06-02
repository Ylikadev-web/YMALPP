import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/permissions";
import type { SessionProfile } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  company_id: string;
  role: AppRole;
  companies?: { name?: string } | { name?: string }[] | null;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membershipData } = await supabase
    .from("company_memberships")
    .select("company_id,role,companies(name)")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  const membership = membershipData as MembershipRow | null;

  const company = Array.isArray(membership?.companies)
    ? membership?.companies[0]
    : membership?.companies;

  return {
    id: user.id,
    fullName: profile?.full_name || user.email || "Usuario",
    email: profile?.email || user.email || "",
    companyId: membership?.company_id ?? "sin-empresa",
    companyName: company?.name ?? "Empresa no configurada",
    role: membership?.role ?? "admin"
  };
}

export async function requireSessionProfile() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}
