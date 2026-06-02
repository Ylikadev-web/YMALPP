import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await getSessionProfile();

  redirect(profile ? "/dashboard" : "/login");
}
