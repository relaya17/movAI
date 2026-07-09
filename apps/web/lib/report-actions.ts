"use server";

import { z } from "zod";
import { auth } from "@/auth";
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
  const rateLimitKey = `movai:report:${uploadId}:${reporterEmail ?? "anon"}`;

  const rateLimit = await checkRateLimit(rateLimitKey, { max: 3, windowSeconds: 3600 });
  if (!rateLimit.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  try {
    await sendContentReportEmail({ uploadId: parsed.data.uploadId, uploadTitle: parsed.data.uploadTitle, reason: parsed.data.reason, reporterEmail });
    return { ok: true };
  } catch (error) {
    console.error("[report] failed to send report", error);
    return { ok: false, error: "send_failed" };
  }
}
