import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { contentReports } from "../schema/moderation";
import { uploads } from "../schema/creator";

export async function createContentReport(
  db: Database,
  input: { uploadId: string; reporterUserId?: string; reporterEmail?: string; reason: string }
) {
  const [row] = await db
    .insert(contentReports)
    .values({
      uploadId: input.uploadId,
      reporterUserId: input.reporterUserId ?? null,
      reporterEmail: input.reporterEmail ?? null,
      reason: input.reason
    })
    .returning();
  if (!row) throw new Error("Failed to create content report");
  return row;
}

export async function listPendingContentReports(db: Database, limit = 50) {
  return db
    .select({
      id: contentReports.id,
      uploadId: contentReports.uploadId,
      uploadTitle: uploads.title,
      reporterEmail: contentReports.reporterEmail,
      reason: contentReports.reason,
      createdAt: contentReports.createdAt
    })
    .from(contentReports)
    .innerJoin(uploads, eq(contentReports.uploadId, uploads.id))
    .where(eq(contentReports.status, "pending"))
    .orderBy(desc(contentReports.createdAt))
    .limit(limit);
}

export async function resolveContentReport(
  db: Database,
  reportId: string,
  status: "resolved" | "dismissed"
) {
  const [row] = await db
    .update(contentReports)
    .set({ status, resolvedAt: new Date() })
    .where(eq(contentReports.id, reportId))
    .returning();
  return row ?? null;
}

/** Used to keep the rate-limit honest even if the same upload gets reported by different reasons. */
export async function countRecentReportsForUpload(db: Database, uploadId: string) {
  const rows = await db
    .select({ id: contentReports.id })
    .from(contentReports)
    .where(and(eq(contentReports.uploadId, uploadId), eq(contentReports.status, "pending")));
  return rows.length;
}
