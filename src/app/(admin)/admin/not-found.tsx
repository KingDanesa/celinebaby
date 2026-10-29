import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-[24px] font-semibold">Страница не найдена</h1>
      <Link href="/admin" className="btn-primary mt-6">
        В админку
      </Link>
    </div>
  );
}
