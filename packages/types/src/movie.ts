import { z } from "zod";
import { WatchSourceSchema } from "./watch-source";

/**
 * Structured content-classification tags produced by the LLM pipeline
 * (architecture plan §5, layer 3). Deliberately NOT free text: every field
 * is an enum/bool so it stays filterable and type-safe end to end.
 */
export const ContentClassificationSchema = z.object({
  tone: z.array(z.enum(["dark", "lighthearted", "tense", "comedic", "romantic", "melancholic"])),
  hasTwistEnding: z.boolean(),
  violenceLevel: z.enum(["none", "mild", "moderate", "graphic"]),
  classifiedAt: z.string().datetime()
});
export type ContentClassification = z.infer<typeof ContentClassificationSchema>;

export const MovieLinkStatusSchema = z.enum(["active", "dead", "unchecked"]);
export type MovieLinkStatus = z.infer<typeof MovieLinkStatusSchema>;

/**
 * What kind of watchable this catalog row actually is. Added alongside the
 * standup/music/singing browse categories (previously hardcoded UI mock
 * data with no backing content at all) - "movie" is the default so every
 * pre-existing row (and every call site that doesn't care about the
 * distinction, e.g. link-checking) keeps working unchanged. TMDB enrichment
 * (worker.ts) and the "movie" browse category only ever query rows with
 * contentType "movie" - TMDB is a film database, matching a standup special
 * or a music cover against it would be nonsensical.
 */
export const ContentTypeSchema = z.enum(["movie", "standup", "music", "singing"]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const MovieSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  originalTitle: z.string().min(1).optional(),
  year: z.number().int().min(1888).max(2100),
  genres: z.array(z.string().min(1)).default([]),
  synopsis: z.string().min(1),
  posterUrl: z.string().url().optional(),
  /** TMDB attribution is mandatory wherever this id is used in the UI. See legal/tmdb-attribution.md */
  tmdbId: z.number().int().positive().optional(),
  contentType: ContentTypeSchema.default("movie"),
  watchSource: WatchSourceSchema,
  linkStatus: MovieLinkStatusSchema.default("unchecked"),
  linkLastCheckedAt: z.string().datetime().optional(),
  classification: ContentClassificationSchema.optional(),
  /** pgvector embedding for semantic search - kept optional/omitted from API responses by default */
  embedding: z.array(z.number()).optional()
});
export type Movie = z.infer<typeof MovieSchema>;

/** Shape returned by public API endpoints - never leaks the raw embedding vector. */
export const PublicMovieSchema = MovieSchema.omit({ embedding: true });
export type PublicMovie = z.infer<typeof PublicMovieSchema>;
