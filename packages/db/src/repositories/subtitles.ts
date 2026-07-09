import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../client";
import { movieSubtitles } from "../schema/media-features";

export async function getSubtitleById(db: Database, id: string) {
  const [row] = await db.select().from(movieSubtitles).where(eq(movieSubtitles.id, id)).limit(1);
  return row ?? null;
}

export async function findActiveSubtitleRequest(db: Database, movieId: string, language: string) {
  const [row] = await db
    .select()
    .from(movieSubtitles)
    .where(
      and(
        eq(movieSubtitles.movieId, movieId),
        eq(movieSubtitles.language, language),
        inArray(movieSubtitles.status, ["pending", "processing", "ready"])
      )
    )
    .orderBy(desc(movieSubtitles.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listMovieSubtitles(db: Database, movieId: string) {
  return db
    .select()
    .from(movieSubtitles)
    .where(eq(movieSubtitles.movieId, movieId))
    .orderBy(desc(movieSubtitles.createdAt));
}

export async function getReadySubtitle(db: Database, movieId: string, language: string) {
  const [row] = await db
    .select()
    .from(movieSubtitles)
    .where(
      and(eq(movieSubtitles.movieId, movieId), eq(movieSubtitles.language, language), eq(movieSubtitles.status, "ready"))
    )
    .limit(1);
  return row ?? null;
}

export async function createSubtitleRequest(db: Database, movieId: string, language: string) {
  const existing = await findActiveSubtitleRequest(db, movieId, language);
  if (existing) return existing;

  const [row] = await db
    .insert(movieSubtitles)
    .values({ movieId, language, source: "whisper", status: "pending" })
    .returning();
  if (!row) throw new Error("Failed to create subtitle request");
  return row;
}

export async function updateSubtitleStatus(
  db: Database,
  id: string,
  patch: { status: "pending" | "processing" | "ready" | "failed"; content?: string; errorMessage?: string }
) {
  const isTerminal = patch.status === "ready" || patch.status === "failed";
  const [row] = await db
    .update(movieSubtitles)
    .set({
      status: patch.status,
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(isTerminal ? { completedAt: new Date() } : {})
    })
    .where(eq(movieSubtitles.id, id))
    .returning();
  return row ?? null;
}
