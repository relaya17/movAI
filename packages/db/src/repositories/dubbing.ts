import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { dubbingJobs, dubbingPermissionRequests } from "../schema/media-features";

export async function getDubbingPermissionForUser(db: Database, userId: string, movieId: string) {
  const [row] = await db
    .select()
    .from(dubbingPermissionRequests)
    .where(and(eq(dubbingPermissionRequests.userId, userId), eq(dubbingPermissionRequests.movieId, movieId)))
    .orderBy(desc(dubbingPermissionRequests.createdAt))
    .limit(1);
  return row ?? null;
}

export async function createDubbingPermissionRequest(
  db: Database,
  input: { userId: string; movieId: string; targetLanguage: string; reason?: string }
) {
  const [row] = await db
    .insert(dubbingPermissionRequests)
    .values({
      userId: input.userId,
      movieId: input.movieId,
      targetLanguage: input.targetLanguage,
      reason: input.reason ?? null
    })
    .returning();
  if (!row) throw new Error("Failed to create dubbing permission request");
  return row;
}

export async function createDubbingJob(
  db: Database,
  input: {
    userId: string;
    movieId: string;
    targetLanguage: string;
    permissionRequestId?: string;
    creditsUsed: number;
  }
) {
  const [row] = await db
    .insert(dubbingJobs)
    .values({
      userId: input.userId,
      movieId: input.movieId,
      targetLanguage: input.targetLanguage,
      permissionRequestId: input.permissionRequestId ?? null,
      creditsUsed: String(input.creditsUsed),
      status: "pending"
    })
    .returning();
  if (!row) throw new Error("Failed to create dubbing job");
  return row;
}

export async function getDubbingJobForUser(db: Database, userId: string, movieId: string) {
  const [row] = await db
    .select()
    .from(dubbingJobs)
    .where(and(eq(dubbingJobs.userId, userId), eq(dubbingJobs.movieId, movieId)))
    .orderBy(desc(dubbingJobs.createdAt))
    .limit(1);
  return row ?? null;
}
