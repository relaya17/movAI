import Replicate from "replicate";

let cached: Replicate | null = null;

function getReplicate(): Replicate | null {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;
  if (!cached) cached = new Replicate({ auth: token });
  return cached;
}

export async function runWhisperVtt(audioUrl: string, language?: string): Promise<string> {
  const replicate = getReplicate();
  if (!replicate) throw new Error("REPLICATE_API_TOKEN not configured");

  const model = process.env.REPLICATE_WHISPER_MODEL ?? "openai/whisper";
  const output = await replicate.run(model as `${string}/${string}`, {
    input: {
      audio: audioUrl,
      transcription: "vtt",
      ...(language ? { language } : {})
    }
  });

  if (typeof output === "string") return output;
  if (output && typeof output === "object" && "transcription" in output) {
    return String((output as { transcription: unknown }).transcription);
  }
  return String(output);
}

export async function translateVtt(vtt: string, targetLanguage: string): Promise<string> {
  const replicate = getReplicate();
  if (!replicate) throw new Error("REPLICATE_API_TOKEN not configured");

  const model = process.env.REPLICATE_TRANSLATE_MODEL ?? "meta/meta-llama-3-8b-instruct";
  const langNames: Record<string, string> = { he: "Hebrew", en: "English", ar: "Arabic", ru: "Russian", es: "Spanish" };
  const target = langNames[targetLanguage] ?? targetLanguage;

  const output = await replicate.run(model as `${string}/${string}`, {
    input: {
      prompt: `Translate the following WebVTT subtitle file to ${target}. Keep WEBVTT headers, cue numbers, and timestamps exactly as they are. Translate only the spoken text lines.\n\n${vtt}`,
      max_tokens: 4096,
      temperature: 0.2
    }
  });

  const text = Array.isArray(output) ? output.join("") : String(output);
  const match = text.match(/WEBVTT[\s\S]*/);
  return match ? match[0].trim() : text.trim();
}
