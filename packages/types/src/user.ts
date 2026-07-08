import { z } from "zod";

export const UserPreferencesSchema = z.object({
  favoriteGenres: z.array(z.string().min(1)).default([]),
  favoriteDecades: z.array(z.number().int()).default([]),
  seedMovieIds: z.array(z.string().uuid()).default([])
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  createdAt: z.string().datetime(),
  preferences: UserPreferencesSchema.optional()
});
export type User = z.infer<typeof UserSchema>;

export const WatchlistItemSchema = z.object({
  userId: z.string().uuid(),
  movieId: z.string().uuid(),
  addedAt: z.string().datetime()
});
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

export const RatingSchema = z.object({
  userId: z.string().uuid(),
  movieId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  ratedAt: z.string().datetime()
});
export type Rating = z.infer<typeof RatingSchema>;
