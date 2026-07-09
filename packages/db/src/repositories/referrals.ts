import { randomBytes } from "node:crypto";
import { and, eq, gte, lt, notExists } from "drizzle-orm";
import type { Database } from "../client";
import { referralCodes, referralRedemptions, onboardingDripLog } from "../schema/growth";
import { users } from "../schema/auth";
import { grantPromoCredits } from "./credits";
import { REFERRAL_BONUS_CREDITS } from "@movai/types";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex");
}

export async function ensureReferralCode(db: Database, userId: string): Promise<string> {
  const [existing] = await db.select({ code: referralCodes.code }).from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      await db.insert(referralCodes).values({ userId, code });
      return code;
    } catch {
      // Collision — retry.
    }
  }
  throw new Error("Failed to generate referral code");
}

export async function getUserIdByReferralCode(db: Database, code: string): Promise<string | null> {
  const normalized = code.trim().toLowerCase();
  const [row] = await db.select({ userId: referralCodes.userId }).from(referralCodes).where(eq(referralCodes.code, normalized)).limit(1);
  return row?.userId ?? null;
}

export async function getReferralCodeForUser(db: Database, userId: string): Promise<string | null> {
  const [row] = await db.select({ code: referralCodes.code }).from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  return row?.code ?? null;
}

/** Award referral bonuses to referrer + referred user (idempotent per referred user). */
export async function redeemReferralCode(db: Database, referredUserId: string, code: string): Promise<boolean> {
  const referrerUserId = await getUserIdByReferralCode(db, code);
  if (!referrerUserId || referrerUserId === referredUserId) return false;

  const [already] = await db
    .select({ id: referralRedemptions.id })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referredUserId, referredUserId))
    .limit(1);
  if (already) return false;

  await db.insert(referralRedemptions).values({
    referrerUserId,
    referredUserId,
    creditsAwarded: REFERRAL_BONUS_CREDITS
  });

  await Promise.all([
    grantPromoCredits(db, referrerUserId, REFERRAL_BONUS_CREDITS, "בונוס הפניה", `referral:from:${referredUserId}`),
    grantPromoCredits(db, referredUserId, REFERRAL_BONUS_CREDITS, "בונוס הצטרפות בהפניה", `referral:to:${referrerUserId}`)
  ]);

  return true;
}

export async function logOnboardingDripSent(db: Database, userId: string, dripDay: number): Promise<void> {
  await db
    .insert(onboardingDripLog)
    .values({ userId, dripDay })
    .onConflictDoNothing({ target: [onboardingDripLog.userId, onboardingDripLog.dripDay] });
}

export async function hasOnboardingDripSent(db: Database, userId: string, dripDay: number): Promise<boolean> {
  const [row] = await db
    .select({ id: onboardingDripLog.id })
    .from(onboardingDripLog)
    .where(and(eq(onboardingDripLog.userId, userId), eq(onboardingDripLog.dripDay, dripDay)))
    .limit(1);
  return Boolean(row);
}

export interface OnboardingDripCandidate {
  id: string;
  email: string;
  name: string | null;
}

/** Users in the drip-day window who have not yet received that drip email. */
export async function listUsersDueForOnboardingDrip(
  db: Database,
  dripDay: 3 | 7,
  batchSize = 50
): Promise<OnboardingDripCandidate[]> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (dripDay + 1));
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() - dripDay);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name
    })
    .from(users)
    .where(
      and(
        gte(users.createdAt, windowStart),
        lt(users.createdAt, windowEnd),
        notExists(
          db
            .select({ id: onboardingDripLog.id })
            .from(onboardingDripLog)
            .where(and(eq(onboardingDripLog.userId, users.id), eq(onboardingDripLog.dripDay, dripDay)))
        )
      )
    )
    .limit(batchSize);

  return rows;
}
