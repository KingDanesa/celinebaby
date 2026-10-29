import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-line">/</span>}
            <li className={i === items.length - 1 ? "text-ink" : ""}>
              {it.href ? (
                <Link href={it.href} className="hover:text-rose-700">
                  {it.label}
                </Link>
              ) : (
                <span className="line-clamp-1">{it.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
