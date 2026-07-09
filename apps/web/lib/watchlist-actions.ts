"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addToWatchlist,
  getMovieBySlug,
  isInWatchlist,
  listWatchlist,
  removeFromWatchlist
} from "@movai/db";
import type { PublicMovie } from "@movai/types";
import { db } from "./db";

export type WatchlistActionResult = { ok: true; inWatchlist: boolean } | { ok: false; error: string };

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getWatchlistForCurrentUser(): Promise<PublicMovie[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  return listWatchlist(db, userId);
}

export async function getIsInWatchlist(movieId: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!userId) return false;
  return isInWatchlist(db, userId, movieId);
}

export async function toggleWatchlistBySlug(slug: string): Promise<WatchlistActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "auth_required" };
  }

  const movie = await getMovieBySlug(db, slug);
  if (!movie) {
    return { ok: false, error: "not_found" };
  }

  const already = await isInWatchlist(db, userId, movie.id);
  if (already) {
    await removeFromWatchlist(db, userId, movie.id);
    revalidatePath("/watchlist");
    revalidatePath(`/movie/${slug}`);
    revalidatePath("/browse");
    return { ok: true, inWatchlist: false };
  }

  await addToWatchlist(db, userId, movie.id);
  revalidatePath("/watchlist");
  revalidatePath(`/movie/${slug}`);
  revalidatePath("/browse");
  return { ok: true, inWatchlist: true };
}
