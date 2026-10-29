"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatPrice, imageUrl } from "@/lib/format";
import { FREE_DELIVERY_FROM } from "@/data/categories";
import { placeOrder } from "@/lib/actions/orders";

export function CheckoutForm() {
  const { t, href, locale } = useI18n();
  const { items, subtotal, clear, hydrated } = useCart();
  const router = useRouter();
  const [delivery, setDelivery] = useState(t.checkout.deliveryMethods[0].id);
  const [payment, setPayment] = useState(t.checkout.paymentMethods[0].id);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!hydrated) return <div className="container-x py-20" />;
  if (items.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-[28px] font-semibold">{t.cart.empty}</h1>
        <Link href={href("/catalog")} className="btn-primary mt-8">
          {t.cart.goCatalog}
        </Link>
      </div>
    );
  }

  const free = subtotal >= FREE_DELIVERY_FROM;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const required = ["name", "phone", "city"];
    if (required.some((k) => !(fd.get(k) as string)?.trim())) {
      setError(true);
      return;
    }
    setBusy(true);
    setError(false);
    const get = (k: string) => String(fd.get(k) ?? "");
    placeOrder({
      items,
      delivery,
      payment,
      locale,
      customer: { name: get("name"), phone: get("phone"), email: get("email"), city: get("city"), address: get("address"), comment: get("comment") },
    })
      .then((res) => {
        if (!res.ok) {
          setError(true);
          setBusy(false);
          return;
        }
        clear();
        router.push(href(`/checkout/success?order=${res.id}`));
      })
      .catch(() => {
        setError(true);
        setBusy(false);
      });
  };

  return (
    <div className="container-x pt-6 sm:pt-10">
      <h1 className="text-[30px] font-semibold sm:text-[40px]">{t.checkout.title}</h1>
      <form onSubmit={onSubmit} className="mt-8 grid gap-10 lg:grid-cols-12" noValidate>
        <div className="flex flex-col gap-10 lg:col-span-7">
          <Section n={1} title={t.checkout.contact}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.checkout.name} name="name" required autoComplete="name" />
              <Field label={t.checkout.phone} name="phone" required type="tel" placeholder="+7 (___) ___ __ __" autoComplete="tel" />
              <Field label={t.checkout.email} name="email" type="email" autoComplete="email" className="sm:col-span-2" />
            </div>
          </Section>

          <Section n={2} title={t.checkout.deliveryTitle}>
            <div className="grid gap-3">
              {t.checkout.deliveryMethods.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-2xl border bg-white p-4 transition",
                    delivery === m.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/40",
                  )}
                >
                  <input type="radio" name="delivery" value={m.id} checked={delivery === m.id} onChange={() => setDelivery(m.id)} className="accent-rose-600" />
                  <span className="flex-1">
                    <span className="block text-[14px] font-semibold">{m.title}</span>
                    <span className="block text-[12px] text-muted">{m.text}</span>
                  </span>
                  <span className="text-[13px] font-medium text-ink-soft">{free && m.id !== "world" ? t.cart.deliveryFree : m.price}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t.checkout.city} name="city" required autoComplete="address-level2" />
              <Field label={t.checkout.address} name="address" autoComplete="street-address" />
              <Field label={t.checkout.comment} name="comment" textarea className="sm:col-span-2" />
            </div>
          </Section>

          <Section n={3} title={t.checkout.paymentTitle}>
            <div className="grid gap-3 sm:grid-cols-3">
              {t.checkout.paymentMethods.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-2xl border bg-white p-4 transition",
                    payment === m.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/40",
                  )}
                >
                  <input type="radio" name="payment" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} className="sr-only" />
                  <span className="text-[14px] font-semibold">{m.title}</span>
                  <span className="text-[12px] text-muted">{m.text}</span>
                </label>
              ))}
            </div>
          </Section>
        </div>

        <aside className="lg:col-span-5">
          <div className="sticky top-[100px] rounded-3xl bg-sand p-6">
            <p className="font-semibold">{t.checkout.summary}</p>
            <ul className="mt-4 max-h-72 divide-y divide-line/70 overflow-y-auto">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    <Image src={imageUrl(i.image)} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px]">{i.name}</p>
                    <p className="text-[12px] text-muted">
                      {[i.color, i.size].filter(Boolean).join(" · ")} × {i.qty}
                    </p>
                  </div>
                  <span className="text-[13px] font-medium tabular-nums">{formatPrice(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted">{t.cart.subtotal}</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t.cart.delivery}</span>
                <span className={free ? "font-semibold text-rose-700" : "text-muted"}>{free ? t.cart.deliveryFree : t.cart.deliveryCalc}</span>
              </div>
              <div className="flex justify-between pt-2 text-[17px] font-semibold">
                <span>{t.cart.total}</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
            </div>
            {error && <p className="mt-4 rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{t.checkout.required}</p>}
            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
              <Lock className="h-4 w-4" /> {t.checkout.pay} · {formatPrice(subtotal)}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">{t.checkout.agree}</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-3 text-[18px] font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  textarea,
  className,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  textarea?: boolean;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      {textarea ? (
        <textarea name={name} rows={3} className="input resize-none" placeholder={placeholder} />
      ) : (
        <input name={name} type={type} className="input" placeholder={placeholder} autoComplete={autoComplete} />
      )}
    </label>
  );
}
