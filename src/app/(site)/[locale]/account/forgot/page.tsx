import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { AuthShell } from "@/components/account/AuthShell";
import { ForgotForm } from "@/components/account/AuthForms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.account.forgotTitle };
}

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t } = await pageContext(params);
  return (
    <AuthShell title={t.account.forgotTitle} subtitle={t.account.forgotText}>
      <ForgotForm />
    </AuthShell>
  );
}
