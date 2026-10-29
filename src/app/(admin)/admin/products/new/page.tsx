import { requireAdmin } from "@/lib/admin/auth";
import { PageTitle } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle title="Новый товар" subtitle="Заполните карточку: товар сам попадёт во все нужные разделы сайта." />
      <ProductForm product={null} />
    </>
  );
}
