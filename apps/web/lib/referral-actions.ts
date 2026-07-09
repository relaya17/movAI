"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "./db";
import { ensureReferralCode, getReferralCodeForUser, redeemReferralCode } from "@movai/db";

const REFERRAL_COOKIE = "movai_ref";

export async function getReferralLinkAction(): Promise<{ code: string; link: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר" };

  const code = await ensureReferralCode(db, session.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
  return { code, link: `${appUrl}/sign-up?ref=${code}` };
}

export async function getReferralCodeAction(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getReferralCodeForUser(db, session.user.id);
}

/** Apply referral from cookie or explicit code (idempotent). */
export async function applyReferralFromCookieAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value;
  if (!code) return;

  await redeemReferralCode(db, session.user.id, code);
  jar.delete(REFERRAL_COOKIE);
}

export async function applyReferralCodeAction(code: string, userId: string): Promise<void> {
  if (!code.trim()) return;
  await redeemReferralCode(db, userId, code.trim());
}

export { REFERRAL_COOKIE };
