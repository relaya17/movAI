import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { dubbingJobs, dubbingPermissionRequests } from "../schema/media-features";
import { movies } from "../schema/catalog";
import { users } from "../schema/auth";

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

export async function getDubbingJobById(db: Database, jobId: string) {
  const [row] = await db.select().from(dubbingJobs).where(eq(dubbingJobs.id, jobId)).limit(1);
  return row ?? null;
}

export async function updateDubbingJob(
  db: Database,
  jobId: string,
  patch: {
    status?: "pending" | "processing" | "completed" | "failed";
    providerProjectId?: string;
    resultUrl?: string;
    errorMessage?: string;
  }
) {
  const isTerminal = patch.status === "completed" || patch.status === "failed";
  const [row] = await db
    .update(dubbingJobs)
    .set({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.providerProjectId !== undefined ? { providerProjectId: patch.providerProjectId } : {}),
      ...(patch.resultUrl !== undefined ? { resultUrl: patch.resultUrl } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(isTerminal ? { completedAt: new Date() } : {})
    })
    .where(eq(dubbingJobs.id, jobId))
    .returning();
  return row ?? null;
}

export async function listPendingDubbingPermissions(db: Database, limit = 50) {
  return db
    .select({
      id: dubbingPermissionRequests.id,
      userId: dubbingPermissionRequests.userId,
      userEmail: users.email,
      movieId: dubbingPermissionRequests.movieId,
      movieTitle: movies.title,
      targetLanguage: dubbingPermissionRequests.targetLanguage,
      reason: dubbingPermissionRequests.reason,
      createdAt: dubbingPermissionRequests.createdAt
    })
    .from(dubbingPermissionRequests)
    .innerJoin(movies, eq(dubbingPermissionRequests.movieId, movies.id))
    .innerJoin(users, eq(dubbingPermissionRequests.userId, users.id))
    .where(eq(dubbingPermissionRequests.status, "pending"))
    .orderBy(desc(dubbingPermissionRequests.createdAt))
    .limit(limit);
}

export async function reviewDubbingPermission(
  db: Database,
  requestId: string,
  status: "approved" | "denied"
) {
  const [row] = await db
    .update(dubbingPermissionRequests)
    .set({ status, reviewedAt: new Date() })
    .where(eq(dubbingPermissionRequests.id, requestId))
    .returning();
  return row ?? null;
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
