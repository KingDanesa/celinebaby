import { notFound } from "next/navigation";
import { adminAccountsEnabled } from "@/lib/admin/auth";
import { ForgotForm } from "@/components/admin/AccessForms";
import { AuthCard } from "@/components/admin/AuthCard";

export const dynamic = "force-dynamic";

export default function ForgotPage() {
  if (!adminAccountsEnabled()) notFound();
  return (
    <AuthCard title="Восстановление пароля">
      <ForgotForm />
    </AuthCard>
  );
}
