import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getAnnouncement, type Announcement } from "@/lib/announcement";
import { dbEnabled } from "@/lib/db";
import { getDictionary } from "@/i18n";
import { Card, PageTitle } from "@/components/admin/ui";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Объявление" };

export default async function AnnouncementPage() {
  await requireAdmin();
  const ru = getDictionary("ru");
  const kk = getDictionary("kk");
  // Until the first save the site shows the default texts, so the form starts from them.
  const value: Announcement = (await getAnnouncement()) ?? {
    enabled: true,
    items: [
      { ru: ru.announcement, kk: kk.announcement, link: "" },
      { ru: ru.announcement2, kk: kk.announcement2, link: "" },
    ],
  };
  return (
    <>
      <PageTitle title="Объявление" subtitle="Тёмная полоска над шапкой сайта: промокоды, акции, доставка. Надписей сколько угодно — они сменяют друг друга." />
      {!dbEnabled() && (
        <Card className="mb-6">
          <p className="text-[14px] text-ink-soft">Объявление меняется на боевом сервере.</p>
        </Card>
      )}
      <Card>
        <AnnouncementForm value={value} />
      </Card>
    </>
  );
}
