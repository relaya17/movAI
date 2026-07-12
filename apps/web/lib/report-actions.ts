"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "./db";
import { createContentReport } from "@movai/db";
import { checkRateLimit } from "./rate-limit";
import { sendContentReportEmail } from "./email";

const ReportSchema = z.object({
  uploadId: z.string().trim().min(1),
  uploadTitle: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(200)
});

export type ReportActionState = { ok: true } | { ok: false; error: string };

/**
 * Trust & safety reporting for user uploads - a real channel for "this
 * violates copyright/is spam/is inappropriate", not just a dead end. Same
 * rate-limit + email-notification shape as contact-actions.ts, keyed per
 * upload+reporter so one person can't spam-report the same item.
 */
export async function reportUploadAction(
  uploadId: string,
  uploadTitle: string,
  reason: string
): Promise<ReportActionState> {
  const parsed = ReportSchema.safeParse({ uploadId, uploadTitle, reason });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  const session = await auth();
  const reporterEmail = session?.user?.email ?? undefined;
  const reporterUserId = session?.user?.id ?? undefined;
  const rateLimitKey = `movai:report:${uploadId}:${reporterEmail ?? "anon"}`;

  const rateLimit = await checkRateLimit(rateLimitKey, { max: 3, windowSeconds: 3600 });
  if (!rateLimit.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  // The DB row is the source of truth an admin can actually review
  // (/admin/reports) - if this fails, surface the error, since the email
  // alone left nothing durable for anyone to act on later.
  try {
    await createContentReport(db, {
      uploadId: parsed.data.uploadId,
      reason: parsed.data.reason,
      ...(reporterUserId ? { reporterUserId } : {}),
      ...(reporterEmail ? { reporterEmail } : {})
    });
  } catch (error) {
    console.error("[report] failed to save report", error);
    return { ok: false, error: "send_failed" };
  }

  // Best-effort notification - a missing RESEND_API_KEY or a transient send
  // failure shouldn't erase the report the DB already saved.
  try {
    await sendContentReportEmail({
      uploadId: parsed.data.uploadId,
      uploadTitle: parsed.data.uploadTitle,
      reason: parsed.data.reason,
      ...(reporterEmail ? { reporterEmail } : {})
    });
  } catch (error) {
    console.error("[report] failed to email report notification", error);
  }

  return { ok: true };
}
