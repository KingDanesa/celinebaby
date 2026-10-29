import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { getStore } from "@/lib/store";
import { PageTitle } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await getStore();
  const product = await store.getProduct(Number(id));
  if (!product) notFound();
  return (
    <>
      <PageTitle
        title={product.name}
        subtitle={`ID ${product.id}${product.sku ? ` · артикул ${product.sku}` : ""}`}
        action={
          <Link href={`/ru/product/${product.slug}`} target="_blank" className="btn-outline h-10 px-4 text-[13px]">
            <ExternalLink className="h-4 w-4" /> Открыть на сайте
          </Link>
        }
      />
      <ProductForm product={product} />
    </>
  );
}
