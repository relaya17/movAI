import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { aiCreations } from "../schema/index";

export type CreationType = "video" | "music" | "voice";
export type CreationStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface CreateAiCreationInput {
  userId: string;
  type: CreationType;
  creditsUsed: number;
  prompt: string;
  /** Arbitrary per-type generation params (style, duration, genre, voice type, provider prediction id, ...), stored as a JSON string. */
  settings: Record<string, unknown>;
  apiProvider: string;
}

export async function createAiCreation(db: Database, input: CreateAiCreationInput) {
  const [row] = await db
    .insert(aiCreations)
    .values({
      userId: input.userId,
      type: input.type,
      status: "pending",
      creditsUsed: input.creditsUsed,
      prompt: input.prompt,
      settings: JSON.stringify(input.settings),
      apiProvider: input.apiProvider
    })
    .returning();

  if (!row) throw new Error("Failed to create AI creation record");
  return row;
}

export async function getAiCreationById(db: Database, id: string, userId: string) {
  const [row] = await db
    .select()
    .from(aiCreations)
    .where(and(eq(aiCreations.id, id), eq(aiCreations.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getUserAiCreations(db: Database, userId: string, type?: CreationType, limit = 20) {
  const conditions = type ? and(eq(aiCreations.userId, userId), eq(aiCreations.type, type)) : eq(aiCreations.userId, userId);
  return db.select().from(aiCreations).where(conditions).orderBy(desc(aiCreations.createdAt)).limit(limit);
}

export interface UpdateAiCreationInput {
  status?: CreationStatus | undefined;
  resultUrl?: string | undefined;
  thumbnailUrl?: string | undefined;
  durationSeconds?: number | undefined;
  errorMessage?: string | undefined;
  apiCostUsd?: string | undefined;
  /** Merged into the existing settings JSON rather than replacing it (e.g. to stash the provider's prediction id right after creation). */
  mergeSettings?: Record<string, unknown> | undefined;
}

export async function updateAiCreation(db: Database, id: string, patch: UpdateAiCreationInput) {
  let settingsJson: string | undefined;

  if (patch.mergeSettings) {
    const [existing] = await db.select({ settings: aiCreations.settings }).from(aiCreations).where(eq(aiCreations.id, id)).limit(1);
    const current = existing?.settings ? (JSON.parse(existing.settings) as Record<string, unknown>) : {};
    settingsJson = JSON.stringify({ ...current, ...patch.mergeSettings });
  }

  const isTerminal = patch.status === "completed" || patch.status === "failed" || patch.status === "cancelled";

  const [row] = await db
    .update(aiCreations)
    .set({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.resultUrl !== undefined ? { resultUrl: patch.resultUrl } : {}),
      ...(patch.thumbnailUrl !== undefined ? { thumbnailUrl: patch.thumbnailUrl } : {}),
      ...(patch.durationSeconds !== undefined ? { durationSeconds: patch.durationSeconds } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(patch.apiCostUsd !== undefined ? { apiCostUsd: patch.apiCostUsd } : {}),
      ...(settingsJson !== undefined ? { settings: settingsJson } : {}),
      ...(isTerminal ? { completedAt: new Date() } : {})
    })
    .where(eq(aiCreations.id, id))
    .returning();

  return row ?? null;
}
