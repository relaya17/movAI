"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserPreferences, saveOnboardingGenres } from "@movai/db";
import { db } from "./db";

const GenresSchema = z.array(z.string().trim().min(1)).min(1).max(8);

export type OnboardingActionState = { ok: true } | { ok: false; error: string };

export async function submitOnboardingGenres(genres: string[]): Promise<OnboardingActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "auth_required" };
  }

  const parsed = GenresSchema.safeParse(genres);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  await saveOnboardingGenres(db, userId, parsed.data);
  revalidatePath("/browse");
  return { ok: true };
}

/** Used by the browse page to decide whether to show the "tell us what you like" prompt - only for users with no signal at all yet. */
export async function hasOnboardingPreferences(): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return true; // Logged-out users aren't prompted - nothing to persist against.

  const prefs = await getUserPreferences(db, userId);
  return Boolean(prefs && prefs.favoriteGenres.length > 0);
}
