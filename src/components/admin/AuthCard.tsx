import { Monogram, Wordmark } from "@/components/ui/Logo";

/** Centered card for the admin sign-in, forgot and reset pages. */
export function AuthCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Monogram size={64} />
          <Wordmark width={150} />
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">{title ?? "Панель управления"}</p>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
