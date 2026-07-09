import Replicate from "replicate";

/** Thrown whenever a Studio generation is attempted without REPLICATE_API_TOKEN configured, instead of silently pretending to generate something. */
export class AiGenerationNotConfiguredError extends Error {
  constructor() {
    super("AI generation is not configured (missing REPLICATE_API_TOKEN)");
    this.name = "AiGenerationNotConfiguredError";
  }
}

let cachedClient: Replicate | null = null;

function getClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new AiGenerationNotConfiguredError();
  if (!cachedClient) cachedClient = new Replicate({ auth: token });
  return cachedClient;
}

/**
 * Model identifiers use Replicate's hash-free "owner/name" shorthand (resolves
 * to that model's latest version at request time) rather than a pinned
 * version hash, which would silently go stale as the model owner ships
 * updates. Override via env if you want to swap models without a deploy.
 */
export const REPLICATE_MODELS = {
  video: process.env.REPLICATE_VIDEO_MODEL ?? "minimax/video-01",
  videoPro: process.env.REPLICATE_VIDEO_MODEL_PRO ?? "luma/ray-flash-2-720p",
  music: process.env.REPLICATE_MUSIC_MODEL ?? "meta/musicgen",
  musicPro: process.env.REPLICATE_MUSIC_MODEL_PRO ?? "meta/musicgen",
  voice: process.env.REPLICATE_VOICE_MODEL ?? "lucataco/xtts-v2",
  whisper: process.env.REPLICATE_WHISPER_MODEL ?? "openai/whisper",
  // Schnell = standard tier (fast, cheap); Pro = paid tier, noticeably
  // higher fidelity (see imageCreditCost in ai-studio-actions.ts) - both
  // from the same Black Forest Labs family so prompts behave consistently
  // between tiers.
  image: process.env.REPLICATE_IMAGE_MODEL ?? "black-forest-labs/flux-schnell",
  imagePro: process.env.REPLICATE_IMAGE_MODEL_PRO ?? "black-forest-labs/flux-1.1-pro"
} as const;

export interface StartPredictionResult {
  predictionId: string;
  status: string;
}

/** Kicks a generation off and returns immediately with a prediction id to poll - generations can take well past a server action's execution budget, so this deliberately does not wait for completion. */
export async function startPrediction(model: string, input: Record<string, unknown>): Promise<StartPredictionResult> {
  const replicate = getClient();
  const prediction = await replicate.predictions.create({ model, input });
  return { predictionId: prediction.id, status: prediction.status };
}

export interface PredictionStatus {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  /** Normalized to a single URL - Replicate models return either a bare string or an array of output URLs depending on the model. */
  resultUrl: string | null;
  error: string | null;
}

export async function getPredictionStatus(predictionId: string): Promise<PredictionStatus> {
  const replicate = getClient();
  const prediction = await replicate.predictions.get(predictionId);
  const rawOutput = prediction.output as unknown;
  const resultUrl = Array.isArray(rawOutput) ? (rawOutput[0] as string | undefined) ?? null : (rawOutput as string | null) ?? null;

  return {
    status: prediction.status as PredictionStatus["status"],
    resultUrl,
    error: prediction.error ? String(prediction.error) : null
  };
}
