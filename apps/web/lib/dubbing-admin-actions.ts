"use server";

import { auth } from "@/auth";
import { db } from "./db";
import { isAdminUser } from "./admin";
import { listPendingDubbingPermissions, reviewDubbingPermission } from "@movai/db";

export async function reviewDubbingPermissionAction(
  requestId: string,
  decision: "approved" | "denied"
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const row = await reviewDubbingPermission(db, requestId, decision);
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function listPendingDubbingPermissionsAction() {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    return { items: [], error: "unauthorized" as const };
  }

  const items = await listPendingDubbingPermissions(db);
  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    }))
  };
}
