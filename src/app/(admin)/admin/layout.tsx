import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../../globals.css";
import { isAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Админка — Celine Baby", template: "%s — Админка Celine Baby" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdmin();
  return (
    <html lang="ru" className={`${manrope.variable} h-full`}>
      <body className="min-h-full bg-[#f6f3f1] text-ink [--font-comfortaa:var(--font-manrope)]">
        {authed ? (
          <div className="flex min-h-screen">
            <AdminSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="flex-1 px-5 py-6 lg:px-10 lg:py-8">{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
