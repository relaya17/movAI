"use server";

import { auth } from "@/auth";
import { countUserAiCreations, getCreditBalance } from "@movai/db";
import { db } from "./db";

export interface ProfileStats {
  creationsCount: number;
  creditBalance: number;
}

export async function getProfileStatsAction(): Promise<ProfileStats | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר" };

  const [creationsCount, creditBalance] = await Promise.all([
    countUserAiCreations(db, session.user.id),
    getCreditBalance(db, session.user.id)
  ]);

  return { creationsCount, creditBalance };
}
