import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.sizes.title };
}

export default async function SizesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await pageContext(params);
  const s = t.pages.sizes;
  return (
    <>
      <PageHeader title={s.title} lead={s.lead} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: s.title }]} />
      <div className="container-x mt-10 grid items-start gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Table title={s.clothes} head={[s.age, s.height]} rows={s.clothesRows} />
        <Table title={s.exact} head={[s.age, s.height]} rows={s.exactRows} />
        <Table title={s.hats} head={[s.age, s.head]} rows={s.hatRows} />
      </div>
      <div className="container-x mt-10">
        <a href="https://wa.me/77018159663" target="_blank" rel="noreferrer" className="block rounded-2xl bg-rose-50 px-6 py-5 text-[14px] font-medium text-rose-800 hover:bg-rose-100">
          {s.help}
        </a>
      </div>
    </>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-[18px] font-semibold">{title}</h2>
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-sand text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
            {head.map((h) => (
              <th key={h} className="px-6 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r[0]}>
              <td className="px-6 py-3 font-medium">{r[0]}</td>
              <td className="px-6 py-3 text-ink-soft tabular-nums">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
