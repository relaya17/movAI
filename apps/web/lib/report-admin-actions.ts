"use server";

import { auth } from "@/auth";
import { db } from "./db";
import { isAdminUser } from "./admin";
import { listPendingContentReports, resolveContentReport } from "@movai/db";

export async function resolveContentReportAction(
  reportId: string,
  decision: "resolved" | "dismissed"
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const row = await resolveContentReport(db, reportId, decision);
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function listPendingContentReportsAction() {
  const session = await auth();
  if (!isAdminUser(session?.user?.email)) {
    return { items: [], error: "unauthorized" as const };
  }

  const items = await listPendingContentReports(db);
  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    }))
  };
}
