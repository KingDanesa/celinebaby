import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listRequests } from "@/lib/requests";
import { dbEnabled } from "@/lib/db";
import { Card, PageTitle } from "@/components/admin/ui";
import { RequestToggle } from "@/components/admin/RequestToggle";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заявки" };

const kindLabel = { contact: "Обратная связь", gift: "Сертификат" } as const;
const formatLabel: Record<string, string> = { digital: "электронный", box: "в фирменной упаковке" };

export default async function RequestsPage() {
  await requireAdmin();
  const list = await listRequests();
  const fresh = list.filter((r) => r.status === "new").length;
  return (
    <>
      <PageTitle title="Заявки" subtitle={`${fresh} новых · всего ${list.length}. Формы «Напишите нам» и «Подарочный сертификат».`} />
      {!dbEnabled() && (
        <Card className="mb-6">
          <p className="text-[14px] text-ink-soft">На демо-версии заявки только приходят на почту, список работает на боевом сервере.</p>
        </Card>
      )}
      <div className="flex flex-col gap-3">
        {list.map((r) => {
          const d = r.data;
          const phone = d.phone.replace(/[^0-9+]/g, "");
          return (
            <Card key={r.id} className={r.status === "done" ? "opacity-60" : ""}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-muted">
                    <span className={r.kind === "gift" ? "font-semibold text-rose-700" : "font-semibold text-ink"}>{kindLabel[r.kind]}</span> ·{" "}
                    {new Date(r.createdAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                    {d.locale === "kk" ? " · казахская версия" : ""}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold">{d.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[14px]">
                    <a href={`tel:${phone}`} className="text-rose-700 hover:text-rose-900">{d.phone}</a>
                    <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-rose-700 hover:text-rose-900">WhatsApp</a>
                    {d.email && <a href={`mailto:${d.email}`} className="text-rose-700 hover:text-rose-900">{d.email}</a>}
                  </p>
                  {r.kind === "gift" && (
                    <p className="mt-2 text-[14px] text-ink-soft">
                      {d.amount ? formatPrice(d.amount) : "—"} · {formatLabel[d.format ?? ""] ?? d.format}
                      {d.recipient ? ` · получатель: ${d.recipient}` : ""}
                      {d.recipientEmail ? ` (${d.recipientEmail})` : ""}
                    </p>
                  )}
                  {d.message && <p className="mt-2 whitespace-pre-line rounded-xl bg-sand px-3 py-2 text-[14px] text-ink-soft">{d.message}</p>}
                  {!d.emailed && <p className="mt-2 text-[12px] text-muted">Письмо о заявке не ушло: почта не настроена.</p>}
                </div>
                <RequestToggle id={r.id} done={r.status === "done"} />
              </div>
            </Card>
          );
        })}
        {list.length === 0 && dbEnabled() && <Card><p className="py-6 text-center text-[14px] text-muted">Заявок пока нет</p></Card>}
      </div>
    </>
  );
}
