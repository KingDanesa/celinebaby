import Link from "next/link";
import { notFound } from "next/navigation";
import { adminAccountsEnabled } from "@/lib/admin/auth";
import { ResetForm } from "@/components/admin/AccessForms";
import { AuthCard } from "@/components/admin/AuthCard";

export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (!adminAccountsEnabled()) notFound();
  const { token = "" } = await searchParams;
  const { adminForResetToken } = await import("@/lib/admin/users");
  const admin = await adminForResetToken(token);
  return (
    <AuthCard title={admin?.pending ? "Добро пожаловать" : "Новый пароль"}>
      {admin ? (
        <ResetForm token={token} email={admin.email} />
      ) : (
        <div className="flex flex-col gap-4 text-[14px] text-ink-soft">
          <p>Ссылка недействительна или устарела. Запросите новую.</p>
          <Link href="/admin/forgot" className="btn-primary">
            Запросить ссылку
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
