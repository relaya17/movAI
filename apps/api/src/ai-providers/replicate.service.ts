import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Replicate from "replicate";

export interface VideoGenerationInput {
  prompt: string;
  style?: string | undefined;
  duration?: number | undefined;
  imageUrl?: string | undefined;
}

export interface VideoGenerationResult {
  outputUrl: string;
  durationSeconds: number;
  apiCostUsd: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ReplicateService {
  private readonly logger = new Logger(ReplicateService.name);
  private readonly client: Replicate | null;
  private readonly isEnabled: boolean;

  constructor(@Optional() @Inject(ConfigService) private readonly config?: ConfigService) {
    const apiKey = this.config?.get<string>("REPLICATE_API_TOKEN");
    this.isEnabled = !!apiKey;

    if (apiKey) {
      this.client = new Replicate({ auth: apiKey });
      this.logger.log("Replicate service initialized");
    } else {
      this.client = null;
      this.logger.warn("Replicate API key not configured - using mock mode");
    }
  }

  /**
   * Generate a video using Replicate's video models.
   * Currently supports minimax/video-01 for text-to-video.
   */
  async generateVideo(input: VideoGenerationInput): Promise<VideoGenerationResult> {
    if (!this.client || !this.isEnabled) {
      return this.mockVideoGeneration(input);
    }

    this.logger.log(`Generating video: "${input.prompt.slice(0, 50)}..."`);

    try {
      // Use minimax/video-01 for high quality video generation
      const model = "minimax/video-01";
      
      const output = await this.client.run(model, {
        input: {
          prompt: input.prompt,
          prompt_optimizer: true,
        },
      });

      // The output is typically a URL or array of URLs
      const outputUrl = Array.isArray(output) ? output[0] : output;

      if (typeof outputUrl !== "string") {
        throw new Error("Unexpected output format from Replicate");
      }

      // Estimate cost based on model pricing (~$0.05 per generation)
      const apiCostUsd = 0.05;

      return {
        outputUrl,
        durationSeconds: input.duration || 5,
        apiCostUsd,
        metadata: {
          model,
          style: input.style,
          prompt: input.prompt,
        },
      };
    } catch (error) {
      this.logger.error(`Video generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Generate an image using Replicate's image models.
   * Useful for video thumbnails or reference images.
   */
  async generateImage(prompt: string, style?: string): Promise<string> {
    if (!this.client || !this.isEnabled) {
      return "https://via.placeholder.com/1280x720?text=Generated+Image";
    }

    try {
      const model = "black-forest-labs/flux-schnell";

      const output = await this.client.run(model, {
        input: {
          prompt: style ? `${prompt}, ${style} style` : prompt,
          num_outputs: 1,
          aspect_ratio: "16:9",
        },
      });

      const outputUrl = Array.isArray(output) ? output[0] : output;

      if (typeof outputUrl !== "string") {
        throw new Error("Unexpected output format from Replicate");
      }

      return outputUrl;
    } catch (error) {
      this.logger.error(`Image generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Mock video generation for development/testing.
   */
  private async mockVideoGeneration(
    input: VideoGenerationInput
  ): Promise<VideoGenerationResult> {
    this.logger.log(`[MOCK] Video generation: "${input.prompt.slice(0, 50)}..."`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      outputUrl:
        "https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4",
      durationSeconds: input.duration || 5,
      apiCostUsd: 0.05,
      metadata: {
        model: "mock",
        style: input.style,
        prompt: input.prompt,
        mock: true,
      },
    };
  }
}
