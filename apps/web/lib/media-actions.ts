"use server";

import { auth } from "@/auth";
import { db } from "./db";
import {
  createDubbingJob,
  createDubbingPermissionRequest,
  createSubtitleRequest,
  getDubbingJobForUser,
  getDubbingPermissionForUser,
  listMovieSubtitles,
  spendCredits,
  InsufficientCreditsError
} from "@movai/db";
import { canStartDubbing, getDubbingGate } from "@movai/types";
import { getMovieBySlug } from "./movies";
import { enqueueSubtitleJob } from "./subtitle-queue";

const DUBBING_CREDITS_PER_JOB = 30;

async function requireUserId(): Promise<string | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר" };
  return session.user.id;
}

export interface SubtitleTrackDto {
  id: string;
  language: string;
  status: string;
  content: string | null;
}

export async function getMovieSubtitlesAction(movieSlug: string): Promise<{ tracks: SubtitleTrackDto[] }> {
  const movie = await getMovieBySlug(movieSlug);
  if (!movie) return { tracks: [] };

  try {
    const rows = await listMovieSubtitles(db, movie.id);
    return {
      tracks: rows.map((row) => ({
        id: row.id,
        language: row.language,
        status: row.status,
        content: row.content
      }))
    };
  } catch {
    return { tracks: [] };
  }
}

export async function requestSubtitlesAction(
  movieSlug: string,
  language: string
): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const movie = await getMovieBySlug(movieSlug);
  if (!movie) return { error: "הסרט לא נמצא" };

  if (movie.watchSource.kind !== "archive" && movie.watchSource.kind !== "youtube") {
    return { error: "כתוביות אוטומטיות זמינות רק לתוכן מוטמע מ-YouTube או Internet Archive" };
  }

  try {
    const row = await createSubtitleRequest(db, movie.id, language);
    if (row.status === "pending") {
      await enqueueSubtitleJob(row.id);
    }
    return { ok: true };
  } catch {
    return { error: "לא הצלחנו ליצור בקשת כתוביות" };
  }
}

export interface DubbingStatusDto {
  gateEligibility: "allowed" | "permission_required" | "blocked";
  gateReasonKey: string;
  permissionStatus: "none" | "pending" | "approved" | "denied";
  jobStatus: "none" | "pending" | "processing" | "completed" | "failed";
  resultUrl: string | null;
}

export async function getDubbingStatusAction(movieSlug: string): Promise<DubbingStatusDto | { error: string }> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const movie = await getMovieBySlug(movieSlug);
  if (!movie) return { error: "הסרט לא נמצא" };

  const gate = getDubbingGate(movie.watchSource);

  try {
    const [permission, job] = await Promise.all([
      getDubbingPermissionForUser(db, userId, movie.id),
      getDubbingJobForUser(db, userId, movie.id)
    ]);

    return {
      gateEligibility: gate.eligibility,
      gateReasonKey: gate.reasonKey,
      permissionStatus: permission?.status ?? "none",
      jobStatus: job?.status ?? "none",
      resultUrl: job?.resultUrl ?? null
    };
  } catch {
    return {
      gateEligibility: gate.eligibility,
      gateReasonKey: gate.reasonKey,
      permissionStatus: "none",
      jobStatus: "none",
      resultUrl: null
    };
  }
}

export async function requestDubbingPermissionAction(
  movieSlug: string,
  targetLanguage: string,
  reason?: string
): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const movie = await getMovieBySlug(movieSlug);
  if (!movie) return { error: "הסרט לא נמצא" };

  const gate = getDubbingGate(movie.watchSource);
  if (gate.eligibility !== "permission_required") {
    return { error: "אין צורך בבקשת הרשאה לתוכן זה" };
  }

  try {
    await createDubbingPermissionRequest(db, {
      userId,
      movieId: movie.id,
      targetLanguage,
      ...(reason ? { reason } : {})
    });
    return { ok: true };
  } catch {
    return { error: "לא הצלחנו לשלוח את הבקשה" };
  }
}

export async function startDubbingAction(
  movieSlug: string,
  targetLanguage: string
): Promise<{ jobId?: string; error?: string }> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const movie = await getMovieBySlug(movieSlug);
  if (!movie) return { error: "הסרט לא נמצא" };

  const gate = getDubbingGate(movie.watchSource);

  let permissionId: string | undefined;
  let hasApproved = false;

  try {
    const permission = await getDubbingPermissionForUser(db, userId, movie.id);
    hasApproved = permission?.status === "approved";
    if (permission?.id) permissionId = permission.id;
  } catch {
    // Fall through — gate may still allow.
  }

  if (!canStartDubbing(gate, hasApproved)) {
    return { error: "אין הרשאה חוקית לדיבוב תוכן זה" };
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return { error: "דיבוב מלא יופעל בקרוב — ElevenLabs לא מוגדר בשרת" };
  }

  try {
    await spendCredits(db, userId, DUBBING_CREDITS_PER_JOB, `דיבוב AI — ${movie.title}`);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { error: `אין מספיק קרדיטים (נדרשים ${err.required}, יש לך ${err.available})` };
    }
    throw err;
  }

  try {
    const job = await createDubbingJob(db, {
      userId,
      movieId: movie.id,
      targetLanguage,
      creditsUsed: DUBBING_CREDITS_PER_JOB,
      ...(permissionId ? { permissionRequestId: permissionId } : {})
    });
    return { jobId: job.id };
  } catch {
    return { error: "לא הצלחנו להתחיל דיבוב" };
  }
}
