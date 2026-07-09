const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export class ElevenLabsNotConfiguredError extends Error {
  constructor() {
    super("ElevenLabs is not configured (missing ELEVENLABS_API_KEY)");
    this.name = "ElevenLabsNotConfiguredError";
  }
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsNotConfiguredError();
  return key;
}

export async function startElevenLabsDubbing(input: {
  sourceUrl: string;
  targetLanguage: string;
  name: string;
}): Promise<string> {
  const response = await fetch(`${ELEVENLABS_BASE}/dubbing`, {
    method: "POST",
    headers: {
      "xi-api-key": getApiKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: input.name,
      source_url: input.sourceUrl,
      target_lang: input.targetLanguage
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs dubbing start failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as { dubbing_id?: string };
  if (!data.dubbing_id) throw new Error("ElevenLabs returned no dubbing_id");
  return data.dubbing_id;
}

export async function getElevenLabsDubbingStatus(dubbingId: string): Promise<{
  status: string;
  targetUrl: string | null;
}> {
  const response = await fetch(`${ELEVENLABS_BASE}/dubbing/${dubbingId}`, {
    headers: { "xi-api-key": getApiKey() }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs dubbing status failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as { status?: string; target_url?: string };
  return { status: data.status ?? "unknown", targetUrl: data.target_url ?? null };
}
