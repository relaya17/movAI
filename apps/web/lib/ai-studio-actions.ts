"use server";

import { auth } from "@/auth";
import { db } from "./db";
import {
  createAiCreation,
  getAiCreationById,
  updateAiCreation,
  spendCredits,
  refundCredits,
  getFreeCreationsRemaining,
  getUserAiCreations,
  InsufficientCreditsError,
  type CreationType
} from "@movai/db";
import { REPLICATE_MODELS, startPrediction, getPredictionStatus, AiGenerationNotConfiguredError } from "./replicate";
import { ESTIMATED_PROVIDER_USD_PER_CREDIT } from "@movai/types";

/** Maps Studio voice-type picks to XTTS style hints (lucataco/xtts-v2 has no preset IDs). */
const VOICE_STYLE_HINTS: Record<string, string> = {
  narrator: "Speak clearly as a professional narrator:",
  singer_male: "Sing with a male vocal tone:",
  singer_female: "Sing with a female vocal tone:",
  character: "Perform with an expressive character voice:"
};

/** 12 credits / 30s standard; Pro tier doubles the rate (higher-fidelity model). */
function videoCreditCost(durationSeconds: number, quality: "standard" | "pro"): number {
  const base = Math.max(1, Math.ceil((durationSeconds * 12) / 30));
  return quality === "pro" ? base * 2 : base;
}

/** Standard MusicGen vs Pro (stereo-large, longer render). */
function musicCreditCost(quality: "standard" | "pro"): number {
  return quality === "pro" ? 6 : 2;
}

/** Standard tier (Flux Schnell) vs Pro tier (Flux 1.1 Pro) - same split as the Studio pricing plan discussion (Stage A). */
function imageCreditCost(quality: "standard" | "pro"): number {
  return quality === "pro" ? 5 : 1;
}

/** 1 credit / 1000 characters of narration or lyrics (matches /pricing), minimum 1 so a short line still costs something. */
function voiceCreditCost(textLength: number): number {
  return Math.max(1, Math.ceil(textLength / 1000));
}

export interface StartGenerationResult {
  creationId?: string | undefined;
  error?: string | undefined;
}

async function requireUserId(): Promise<string | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר כדי ליצור תוכן" };
  return session.user.id;
}

/** Shared happy/unhappy path for all three generators: charge credits up front, record a pending creation, kick off the Replicate prediction, and roll the charge back if anything between those two steps throws. */
async function chargeAndStart(
  userId: string,
  type: CreationType,
  cost: number,
  prompt: string,
  settings: Record<string, unknown>,
  model: string,
  input: Record<string, unknown>
): Promise<StartGenerationResult> {
  const freeRemaining = await getFreeCreationsRemaining(db, userId);
  const effectiveCost = freeRemaining > 0 ? 0 : cost;

  if (effectiveCost > 0) {
    try {
      const typeLabel = type === "video" ? "וידאו" : type === "music" ? "מוזיקה" : type === "image" ? "תמונה" : "קול";
      await spendCredits(db, userId, effectiveCost, `יצירת ${typeLabel} ב-AI Studio`);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return { error: `אין מספיק קרדיטים (נדרשים ${err.required}, יש לך ${err.available})` };
      }
      throw err;
    }
  }

  const creation = await createAiCreation(db, {
    userId,
    type,
    creditsUsed: effectiveCost,
    prompt,
    settings: { ...settings, usedFreeTier: effectiveCost === 0 },
    apiProvider: "replicate"
  });

  try {
    const { predictionId } = await startPrediction(model, input);
    await updateAiCreation(db, creation.id, { status: "processing", mergeSettings: { predictionId } });
    return { creationId: creation.id };
  } catch (err) {
    const message = err instanceof AiGenerationNotConfiguredError ? "יצירת AI לא מוגדרת - חסר REPLICATE_API_TOKEN" : "שגיאה בהתחלת היצירה";
    await updateAiCreation(db, creation.id, { status: "failed", errorMessage: message });
    if (effectiveCost > 0) {
      await refundCredits(db, userId, effectiveCost, `החזר - ${message}`, creation.id);
    }
    return { error: message };
  }
}

export interface GenerateVideoInput {
  prompt: string;
  style: string;
  durationSeconds: number;
  quality: "standard" | "pro";
  baseImageUrl?: string | undefined;
}

export async function generateVideoAction(input: GenerateVideoInput): Promise<StartGenerationResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  if (!input.prompt.trim()) return { error: "כתבו תיאור לסרטון" };

  const cost = videoCreditCost(input.durationSeconds, input.quality);
  const fullPrompt = `${input.prompt.trim()}, ${input.style} style`;
  const model = input.quality === "pro" ? REPLICATE_MODELS.videoPro : REPLICATE_MODELS.video;

  return chargeAndStart(
    userId,
    "video",
    cost,
    input.prompt.trim(),
    { style: input.style, durationSeconds: input.durationSeconds, quality: input.quality },
    model,
    {
      prompt: fullPrompt,
      ...(input.baseImageUrl ? { first_frame_image: input.baseImageUrl } : {})
    }
  );
}

export interface GenerateMusicInput {
  prompt: string;
  genre: string;
  mood: string;
  withLyrics: boolean;
  quality: "standard" | "pro";
  lyrics?: string | undefined;
}

export async function generateMusicAction(input: GenerateMusicInput): Promise<StartGenerationResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  if (!input.prompt.trim()) return { error: "כתבו תיאור למוזיקה" };

  const cost = musicCreditCost(input.quality);
  let fullPrompt = `${input.prompt.trim()}, ${input.genre} genre, ${input.mood} mood`;
  if (input.withLyrics) {
    if (input.lyrics?.trim()) {
      fullPrompt = `${fullPrompt}. Lyrics: ${input.lyrics.trim()}`;
    } else {
      fullPrompt = `${fullPrompt}, with vocals and lyrics`;
    }
  }
  const model = input.quality === "pro" ? REPLICATE_MODELS.musicPro : REPLICATE_MODELS.music;

  return chargeAndStart(
    userId,
    "music",
    cost,
    input.prompt.trim(),
    {
      genre: input.genre,
      mood: input.mood,
      withLyrics: input.withLyrics,
      quality: input.quality,
      ...(input.lyrics?.trim() ? { lyrics: input.lyrics.trim() } : {})
    },
    model,
    {
      prompt: fullPrompt,
      duration: input.quality === "pro" ? 60 : 30,
      model_version: input.quality === "pro" ? "stereo-large" : "stereo-melody-large"
    }
  );
}

export interface GenerateVoiceInput {
  text: string;
  voiceType: string;
  language: string;
}

export async function generateVoiceAction(input: GenerateVoiceInput): Promise<StartGenerationResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  if (!input.text.trim()) return { error: "כתבו טקסט ליצירה" };

  const cost = voiceCreditCost(input.text.length);
  const styleHint = VOICE_STYLE_HINTS[input.voiceType] ?? "";
  const styledText = styleHint ? `${styleHint} ${input.text.trim()}` : input.text.trim();

  return chargeAndStart(
    userId,
    "voice",
    cost,
    input.text.trim(),
    { voiceType: input.voiceType, language: input.language },
    REPLICATE_MODELS.voice,
    {
      text: styledText,
      language: input.language
    }
  );
}

export interface GenerateImageInput {
  prompt: string;
  style: string;
  quality: "standard" | "pro";
}

export async function generateImageAction(input: GenerateImageInput): Promise<StartGenerationResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  if (!input.prompt.trim()) return { error: "כתבו תיאור לתמונה" };

  const cost = imageCreditCost(input.quality);
  const fullPrompt = `${input.prompt.trim()}, ${input.style} style`;
  const model = input.quality === "pro" ? REPLICATE_MODELS.imagePro : REPLICATE_MODELS.image;

  return chargeAndStart(userId, "image", cost, input.prompt.trim(), { style: input.style, quality: input.quality }, model, {
    prompt: fullPrompt,
    aspect_ratio: "1:1",
    output_format: "webp"
  });
}

export interface GenerationStatusResult {
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  resultUrl?: string | null | undefined;
  error?: string | undefined;
}

/** Polled by the client every couple of seconds while a generation is in flight - checks Replicate directly only while still processing, and persists the terminal result (or refunds on failure) exactly once. */
export async function getGenerationStatusAction(creationId: string): Promise<GenerationStatusResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return { status: "failed", error: userId.error };

  const creation = await getAiCreationById(db, creationId, userId);
  if (!creation) return { status: "failed", error: "היצירה לא נמצאה" };

  if (creation.status === "completed" || creation.status === "failed" || creation.status === "cancelled") {
    return { status: creation.status, resultUrl: creation.resultUrl, error: creation.errorMessage ?? undefined };
  }

  const settings = creation.settings ? (JSON.parse(creation.settings) as Record<string, unknown>) : {};
  const predictionId = settings.predictionId as string | undefined;
  if (!predictionId) {
    return { status: "processing" };
  }

  try {
    const prediction = await getPredictionStatus(predictionId);

    if (prediction.status === "succeeded") {
      const apiCostUsd =
        creation.creditsUsed > 0
          ? (creation.creditsUsed * ESTIMATED_PROVIDER_USD_PER_CREDIT).toFixed(4)
          : "0";
      await updateAiCreation(db, creationId, {
        status: "completed",
        resultUrl: prediction.resultUrl ?? undefined,
        apiCostUsd
      });
      return { status: "completed", resultUrl: prediction.resultUrl };
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const message = prediction.error ?? "היצירה נכשלה בצד הספק";
      await updateAiCreation(db, creationId, { status: "failed", errorMessage: message });
      await refundCredits(db, userId, creation.creditsUsed, `החזר - ${message}`, creationId);
      return { status: "failed", error: message };
    }

    return { status: "processing" };
  } catch {
    return { status: "processing" };
  }
}

export interface CreationListItem {
  id: string;
  type: CreationType;
  status: string;
  prompt: string;
  resultUrl: string | null;
  creditsUsed: number;
  createdAt: string;
}

/** Gallery page — lists the signed-in user's past AI Studio creations. */
export async function listCreationsAction(type?: CreationType): Promise<{ items: CreationListItem[]; error?: string }> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return { items: [], error: userId.error };

  const rows = await getUserAiCreations(db, userId, type, 50);
  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      prompt: row.prompt,
      resultUrl: row.resultUrl,
      creditsUsed: row.creditsUsed,
      createdAt: row.createdAt.toISOString()
    }))
  };
}
