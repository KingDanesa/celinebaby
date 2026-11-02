import { redirect } from "next/navigation";
import { adminAccountsEnabled, isAdmin } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/AccessForms";
import { AuthCard } from "@/components/admin/AuthCard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <AuthCard>
      <LoginForm accounts={adminAccountsEnabled()} />
    </AuthCard>
  );
}
