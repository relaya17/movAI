"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCreditBalance, getFreeCreationsRemaining } from "@movai/db";
import { MONTHLY_FREE_CREATIONS } from "@movai/types";

export interface StudioQuotaInfo {
  freeRemaining: number;
  freeMonthly: number;
  creditBalance: number;
}

export async function getStudioQuotaAction(): Promise<StudioQuotaInfo | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [freeRemaining, creditBalance] = await Promise.all([
    getFreeCreationsRemaining(db, session.user.id),
    getCreditBalance(db, session.user.id),
  ]);

  return { freeRemaining, freeMonthly: MONTHLY_FREE_CREATIONS, creditBalance };
}
