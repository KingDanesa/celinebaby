"use client";

import { useTransition } from "react";
import { setOrderStatusAction } from "@/lib/admin/actions";
import type { OrderStatus } from "@/lib/store/types";
import { ORDER_STATUSES, orderStatusLabel } from "./ui";
import { cn } from "@/lib/format";

export function OrderStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {ORDER_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => start(() => setOrderStatusAction(id, s))}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-left text-[14px] transition",
            s === status ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink",
          )}
        >
          {orderStatusLabel(s)}
        </button>
      ))}
    </div>
  );
}
