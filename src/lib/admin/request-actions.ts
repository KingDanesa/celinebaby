"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { setRequestStatus } from "@/lib/requests";

export async function setRequestStatusAction(id: number, done: boolean) {
  await requireAdmin();
  await setRequestStatus(id, done ? "done" : "new");
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}
