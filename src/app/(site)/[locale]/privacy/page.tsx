import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.privacy.title };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await pageContext(params);
  return (
    <>
      <PageHeader title={t.pages.privacy.title} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: t.pages.privacy.title }]} />
      <div className="container-x prose-soft mt-10 max-w-3xl text-[15px]">
        <p>Настоящая политика определяет порядок обработки и защиты персональных данных пользователей сайта Celine Baby (ИП Tranzit, Республика Казахстан, г. Астана).</p>
        <h2>1. Какие данные мы собираем</h2>
        <p>Имя, номер телефона, адрес электронной почты и адрес доставки, которые вы указываете при оформлении заказа, подписке или обращении в поддержку.</p>
        <h2>2. Для чего</h2>
        <p>Для оформления и доставки заказов, связи по вопросам заказа, а также, с вашего согласия, для отправки информации о новинках и акциях.</p>
        <h2>3. Защита данных</h2>
        <p>Мы не передаём персональные данные третьим лицам, за исключением служб доставки и платёжных сервисов в объёме, необходимом для выполнения заказа.</p>
        <h2>4. Ваши права</h2>
        <p>Вы можете запросить изменение или удаление своих данных, написав на celinebabykazakhstan@gmail.com.</p>
      </div>
    </>
  );
}
