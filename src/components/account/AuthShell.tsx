import { Monogram } from "@/components/ui/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Monogram size={56} className="opacity-50" />
          <h1 className="mt-4 text-[28px] font-semibold sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-2 text-[14px] text-muted">{subtitle}</p>}
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
