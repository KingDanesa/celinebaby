"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { setRequestStatus } from "@/lib/requests";
import { audit } from "./audit";

export async function setRequestStatusAction(id: number, done: boolean) {
  const me = await requireAdmin();
  await setRequestStatus(id, done ? "done" : "new");
  await audit("request_status", { admin: me, target: id, label: `Заявка №${id}`, details: [done ? "Отмечена обработанной" : "Снова новая"] });
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}
