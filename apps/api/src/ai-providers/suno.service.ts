import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MusicGenerationInput {
  prompt: string;
  genre?: string | undefined;
  mood?: string | undefined;
  lyrics?: string | undefined;
  duration?: number | undefined;
}

export interface MusicGenerationResult {
  outputUrl: string;
  durationSeconds: number;
  apiCostUsd: number;
  title?: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class SunoService {
  private readonly logger = new Logger(SunoService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;
  private readonly isEnabled: boolean;

  constructor(@Optional() @Inject(ConfigService) private readonly config?: ConfigService) {
    this.apiKey = this.config?.get<string>("SUNO_API_KEY");
    this.apiUrl = this.config?.get<string>("SUNO_API_URL", "https://api.suno.ai/v1") ?? "https://api.suno.ai/v1";
    this.isEnabled = !!this.apiKey;

    if (this.isEnabled) {
      this.logger.log("Suno service initialized");
    } else {
      this.logger.warn("Suno API key not configured - using mock mode");
    }
  }

  /**
   * Generate music using Suno AI.
   * Supports both instrumental and vocal tracks.
   */
  async generateMusic(input: MusicGenerationInput): Promise<MusicGenerationResult> {
    if (!this.isEnabled) {
      return this.mockMusicGeneration(input);
    }

    this.logger.log(`Generating music: "${input.prompt.slice(0, 50)}..."`);

    try {
      // Build the prompt with genre and mood
      let fullPrompt = input.prompt;
      if (input.genre) {
        fullPrompt = `[Genre: ${input.genre}] ${fullPrompt}`;
      }
      if (input.mood) {
        fullPrompt = `[Mood: ${input.mood}] ${fullPrompt}`;
      }

      // Make request to Suno API
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          lyrics: input.lyrics,
          duration: input.duration || 60,
          instrumental: !input.lyrics,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Suno API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      // Suno typically returns an array of generated tracks
      const track = Array.isArray(data) ? data[0] : data;

      return {
        outputUrl: track.audio_url || track.url,
        durationSeconds: track.duration || input.duration || 60,
        apiCostUsd: this.calculateCost(track.duration || 60),
        title: track.title,
        metadata: {
          genre: input.genre,
          mood: input.mood,
          hasLyrics: !!input.lyrics,
          model: "suno-v4",
        },
      };
    } catch (error) {
      this.logger.error(`Music generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate API cost based on duration.
   * Suno pricing is approximately $0.05 per generation.
   */
  private calculateCost(durationSeconds: number): number {
    // Base cost per generation
    const baseCost = 0.05;
    // Additional cost for longer tracks
    const extraCost = durationSeconds > 60 ? 0.02 : 0;
    return baseCost + extraCost;
  }

  /**
   * Mock music generation for development/testing.
   */
  private async mockMusicGeneration(
    input: MusicGenerationInput
  ): Promise<MusicGenerationResult> {
    this.logger.log(`[MOCK] Music generation: "${input.prompt.slice(0, 50)}..."`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
      outputUrl:
        "https://res.cloudinary.com/demo/video/upload/v1/samples/audio/love.mp3",
      durationSeconds: input.duration || 60,
      apiCostUsd: 0.05,
      title: `Generated: ${input.prompt.slice(0, 30)}`,
      metadata: {
        genre: input.genre,
        mood: input.mood,
        hasLyrics: !!input.lyrics,
        model: "mock",
        mock: true,
      },
    };
  }
}
