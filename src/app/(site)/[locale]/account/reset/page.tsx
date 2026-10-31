import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { AuthShell } from "@/components/account/AuthShell";
import { ResetForm } from "@/components/account/AuthForms";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.account.resetTitle };
}

export default async function ResetPage({ params, searchParams }: Props) {
  const { t } = await pageContext(params);
  const { token } = await searchParams;
  return (
    <AuthShell title={t.account.resetTitle}>
      <ResetForm token={token ?? ""} />
    </AuthShell>
  );
}
