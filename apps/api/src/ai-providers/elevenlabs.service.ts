import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface VoiceGenerationInput {
  text: string;
  voiceType?: string | undefined;
  language?: string | undefined;
  speed?: number | undefined;
}

export interface VoiceGenerationResult {
  outputUrl: string;
  durationSeconds: number;
  apiCostUsd: number;
  characterCount: number;
  metadata: Record<string, unknown>;
}

// Available voice IDs in ElevenLabs
const VOICE_MAP: Record<string, string> = {
  male_deep: "pNInz6obpgDQGcFmaJgB", // Adam
  male_narrative: "VR6AewLTigWG4xSOukaG", // Arnold
  female_warm: "EXAVITQu4vr4xnSDxMaL", // Sarah
  female_young: "21m00Tcm4TlvDq8ikWAM", // Rachel
  neutral: "AZnzlk1XvdvUeBnXmlld", // Domi
  hebrew_male: "pNInz6obpgDQGcFmaJgB", // Default to Adam for Hebrew
  hebrew_female: "EXAVITQu4vr4xnSDxMaL", // Default to Sarah for Hebrew
};

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl = "https://api.elevenlabs.io/v1";
  private readonly isEnabled: boolean;

  constructor(@Optional() @Inject(ConfigService) private readonly config?: ConfigService) {
    this.apiKey = this.config?.get<string>("ELEVENLABS_API_KEY");
    this.isEnabled = !!this.apiKey;

    if (this.isEnabled) {
      this.logger.log("ElevenLabs service initialized");
    } else {
      this.logger.warn("ElevenLabs API key not configured - using mock mode");
    }
  }

  /**
   * Generate speech from text using ElevenLabs.
   */
  async generateVoice(input: VoiceGenerationInput): Promise<VoiceGenerationResult> {
    if (!this.isEnabled) {
      return this.mockVoiceGeneration(input);
    }

    this.logger.log(
      `Generating voice: "${input.text.slice(0, 50)}..." (${input.voiceType})`
    );

    try {
      const voiceId = this.getVoiceId(input.voiceType, input.language);

      const response = await fetch(
        `${this.apiUrl}/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: input.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.5,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      // Get the audio as a blob
      const audioBlob = await response.blob();

      // Upload to cloud storage (would need to implement)
      const outputUrl = await this.uploadAudio(audioBlob);

      // Estimate duration based on character count
      const characterCount = input.text.length;
      const durationSeconds = Math.ceil(characterCount / 15); // ~15 chars per second

      return {
        outputUrl,
        durationSeconds,
        apiCostUsd: this.calculateCost(characterCount),
        characterCount,
        metadata: {
          voiceId,
          voiceType: input.voiceType,
          language: input.language,
          model: "eleven_multilingual_v2",
        },
      };
    } catch (error) {
      this.logger.error(`Voice generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get available voices from ElevenLabs.
   */
  async getVoices(): Promise<Array<{ id: string; name: string; language: string }>> {
    if (!this.isEnabled) {
      return Object.entries(VOICE_MAP).map(([name, id]) => ({
        id,
        name: name.replace(/_/g, " "),
        language: name.includes("hebrew") ? "he" : "en",
      }));
    }

    try {
      const response = await fetch(`${this.apiUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = (await response.json()) as {
        voices: Array<{ voice_id: string; name: string }>;
      };
      return data.voices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        language: "multi",
      }));
    } catch (error) {
      this.logger.error(`Failed to get voices: ${error}`);
      return [];
    }
  }

  /**
   * Get the appropriate voice ID based on type and language.
   */
  private getVoiceId(voiceType?: string | undefined, language?: string | undefined): string {
    const defaultVoice = "AZnzlk1XvdvUeBnXmlld"; // Domi - neutral
    const hebrewVoice = "pNInz6obpgDQGcFmaJgB"; // Adam - for Hebrew

    if (voiceType) {
      const voiceMapEntry = VOICE_MAP[voiceType];
      if (voiceMapEntry) {
        return voiceMapEntry;
      }
    }

    // Default based on language
    if (language === "he" || language === "hebrew") {
      return hebrewVoice;
    }

    return defaultVoice;
  }

  /**
   * Calculate API cost based on character count.
   * ElevenLabs pricing: ~$0.30 per 1000 characters
   */
  private calculateCost(characterCount: number): number {
    const costPer1000Chars = 0.30;
    return (characterCount / 1000) * costPer1000Chars;
  }

  /**
   * Upload audio blob to cloud storage.
   * In production, this would upload to Cloudinary or S3.
   */
  private async uploadAudio(blob: Blob): Promise<string> {
    // TODO: Implement actual upload to Cloudinary/S3
    // For now, convert to base64 data URL (not recommended for production)
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    
    this.logger.warn(
      "Audio upload not implemented - returning placeholder URL"
    );
    
    // In production, upload to cloud storage and return URL
    return `data:audio/mpeg;base64,${base64.slice(0, 100)}...`;
  }

  /**
   * Mock voice generation for development/testing.
   */
  private async mockVoiceGeneration(
    input: VoiceGenerationInput
  ): Promise<VoiceGenerationResult> {
    this.logger.log(
      `[MOCK] Voice generation: "${input.text.slice(0, 50)}..."`
    );

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const characterCount = input.text.length;
    const durationSeconds = Math.ceil(characterCount / 15);

    return {
      outputUrl:
        "https://res.cloudinary.com/demo/video/upload/v1/samples/audio/love.mp3",
      durationSeconds,
      apiCostUsd: this.calculateCost(characterCount),
      characterCount,
      metadata: {
        voiceType: input.voiceType,
        language: input.language,
        model: "mock",
        mock: true,
      },
    };
  }
}
