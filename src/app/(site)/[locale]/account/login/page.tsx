import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageContext } from "@/lib/page";
import { getCurrentUser } from "@/lib/auth/server";
import { AuthShell } from "@/components/account/AuthShell";
import { LoginForm } from "@/components/account/AuthForms";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.account.login };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { t, href } = await pageContext(params);
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") ? next : href("/account"));
  return (
    <AuthShell title={t.account.login}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
