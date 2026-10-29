import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Monogram, Wordmark } from "@/components/ui/Logo";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Monogram size={64} />
          <Wordmark width={150} />
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">Панель управления</p>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
