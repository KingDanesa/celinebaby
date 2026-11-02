import type { Metadata } from "next";
import { adminAccountsEnabled, requireAdmin } from "@/lib/admin/auth";
import { Card, PageTitle } from "@/components/admin/ui";
import { ChangePasswordForm, InviteForm, MemberActions } from "@/components/admin/AccessForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Доступ" };

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function AccessPage() {
  const me = await requireAdmin();
  if (!adminAccountsEnabled()) {
    return (
      <>
        <PageTitle title="Доступ" />
        <Card>
          <p className="text-[14px] text-ink-soft">На демо-версии у админки один общий пароль. Личные входы, смена пароля и сотрудники работают на боевом сервере.</p>
        </Card>
      </>
    );
  }
  const { listAdmins } = await import("@/lib/admin/users");
  const admins = await listAdmins();
  return (
    <>
      <PageTitle title="Доступ" subtitle={`Вы вошли как ${me.email}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Мой пароль">
          <ChangePasswordForm email={me.email} />
        </Card>
        <Card title="Добавить сотрудника">
          <p className="mb-4 text-[14px] text-ink-soft">
            Сотрудник получит письмо со ссылкой и сам придумает пароль. Все сотрудники видят товары, заказы и покупателей и могут добавлять других.
          </p>
          <InviteForm />
        </Card>
      </div>
      <Card title={`Кто имеет доступ · ${admins.length}`} className="mt-6">
        <ul className="divide-y divide-line">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[14px] font-semibold">
                  {a.name || a.email}
                  {a.id === me.id && <span className="ml-2 rounded-full bg-pink-soft px-2 py-0.5 text-[11px] font-medium text-rose-800">это вы</span>}
                  {a.pending && <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-ink-soft">ещё не задал пароль</span>}
                </p>
                <p className="text-[13px] text-muted">
                  {a.email} · последний вход: {date(a.lastLoginAt)}
                </p>
              </div>
              <MemberActions id={a.id} email={a.email} pending={a.pending} isMe={a.id === me.id} />
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-6 text-[13px] text-muted">
        Забыли пароль — на странице входа нажмите «Забыли пароль?», ссылка придёт на почту. Если почта недоступна, пароль сбрасывается на сервере командой
        <code className="mx-1 rounded bg-sand px-1.5 py-0.5">celinebaby-admin reset e-mail</code>.
      </p>
    </>
  );
}
