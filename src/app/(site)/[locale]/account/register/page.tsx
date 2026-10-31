import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageContext } from "@/lib/page";
import { getCurrentUser } from "@/lib/auth/server";
import { AuthShell } from "@/components/account/AuthShell";
import { RegisterForm } from "@/components/account/AuthForms";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.account.register };
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { t, href } = await pageContext(params);
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(href("/account"));
  return (
    <AuthShell title={t.account.register}>
      <RegisterForm next={next} />
      <ul className="mt-6 space-y-1.5 border-t border-line pt-5 text-[13px] text-muted">
        <li className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t.account.benefitsTitle}</li>
        {t.account.benefits.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
    </AuthShell>
  );
}
