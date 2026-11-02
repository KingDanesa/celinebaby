"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { setRequestStatusAction } from "@/lib/admin/request-actions";
import { cn } from "@/lib/format";

export function RequestToggle({ id, done }: { id: number; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setRequestStatusAction(id, !done))}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition",
        done ? "bg-mint text-ink ring-mint" : "bg-white text-ink-soft ring-line hover:ring-ink",
      )}
    >
      {done && <Check className="h-3.5 w-3.5" />}
      {done ? "Обработана" : "Отметить обработанной"}
    </button>
  );
}
