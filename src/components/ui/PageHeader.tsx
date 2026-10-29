import { Breadcrumbs } from "./Breadcrumbs";

export function PageHeader({
  title,
  lead,
  eyebrow,
  crumbs,
}: {
  title: string;
  lead?: string;
  eyebrow?: string;
  crumbs: { label: string; href?: string }[];
}) {
  return (
    <div className="container-x pt-5 sm:pt-8">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 max-w-3xl sm:mt-10">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[32px] leading-tight font-semibold sm:text-[44px]">{title}</h1>
        {lead && <p className="mt-4 text-[16px] leading-relaxed text-ink-soft sm:text-[18px]">{lead}</p>}
      </div>
    </div>
  );
}
