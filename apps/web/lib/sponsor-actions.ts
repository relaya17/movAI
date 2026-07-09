"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/admin";
import { createSponsor, updateSponsor, deleteSponsor } from "@movai/db";

/**
 * Every action here re-checks isAdminUser() itself rather than trusting a
 * client-side guard on the admin page - the page's own access check
 * (apps/web/app/(dashboard)/admin/sponsors/page.tsx) only stops the page
 * from *rendering* for a non-admin, it doesn't stop a crafted request
 * straight to the server action.
 */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    throw new Error("Forbidden");
  }
}

export async function createSponsorAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();

  if (!name || !imageUrl || !linkUrl) {
    throw new Error("שם, קישור תמונה וקישור יעד הם שדות חובה");
  }

  await createSponsor(db, { name, imageUrl, linkUrl });
  revalidatePath("/admin/sponsors");
}

export async function toggleSponsorActiveAction(sponsorId: string, isActive: boolean): Promise<void> {
  await requireAdmin();
  await updateSponsor(db, sponsorId, { isActive });
  revalidatePath("/admin/sponsors");
}

export async function deleteSponsorAction(sponsorId: string): Promise<void> {
  await requireAdmin();
  await deleteSponsor(db, sponsorId);
  revalidatePath("/admin/sponsors");
}
