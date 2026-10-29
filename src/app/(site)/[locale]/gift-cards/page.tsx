import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";
import { GiftCardForm } from "@/components/ui/GiftCardForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.gift.title };
}

export default async function GiftPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await pageContext(params);
  const g = t.pages.gift;
  return (
    <>
      <PageHeader title={g.title} lead={g.lead} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: g.title }]} />
      <div className="container-x mt-10">
        <GiftCardForm />
      </div>
      <div className="container-x mt-16">
        <h2 className="text-[24px] font-semibold">{g.how}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {g.steps.map((s, i) => (
            <li key={s} className="rounded-2xl bg-sand p-6">
              <span className="font-display text-[28px] font-semibold text-rose-600">0{i + 1}</span>
              <p className="mt-2 text-[15px] text-ink-soft">{s}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[13px] text-muted">{g.validity}</p>
      </div>
    </>
  );
}
