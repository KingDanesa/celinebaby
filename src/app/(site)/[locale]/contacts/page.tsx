import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactForm } from "@/components/ui/ContactForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.contacts.title };
}

export default async function ContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await pageContext(params);
  const c = t.pages.contacts;
  const rows = [
    { icon: MapPin, k: c.address, v: c.addressText },
    { icon: Phone, k: c.phone, v: "+7 (701) 815 96 63", link: "tel:+77018159663" },
    { icon: Mail, k: c.email, v: "celinebabykazakhstan@gmail.com", link: "mailto:celinebabykazakhstan@gmail.com" },
    { icon: Clock, k: c.hours, v: c.hoursText },
  ];
  return (
    <>
      <PageHeader title={c.title} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: c.title }]} />
      <div className="container-x mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((r) => (
              <li key={r.k} className="flex gap-4 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <r.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{r.k}</p>
                  {r.link ? (
                    <a href={r.link} className="mt-0.5 block text-[15px] font-medium hover:text-rose-700">
                      {r.v}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-[15px] font-medium">{r.v}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 overflow-hidden rounded-3xl bg-sand">
            <iframe
              title="map"
              src="https://yandex.kz/map-widget/v1/?text=Астана, улица Туркестан 16/5&z=16"
              className="h-72 w-full"
              loading="lazy"
            />
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-[22px] font-semibold">{c.formTitle}</h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
