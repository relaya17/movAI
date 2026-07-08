import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import type { Job } from "bullmq";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { aiCreations } from "@movai/db";
import { DATABASE } from "../infra/tokens";
import { AI_CREATION_QUEUE } from "./constants";
import { ReplicateService } from "../ai-providers/replicate.service";
import { SunoService } from "../ai-providers/suno.service";
import { ElevenLabsService } from "../ai-providers/elevenlabs.service";

export interface AICreationJobData {
  creationId: string;
  userId: string;
  type: "video" | "music" | "voice";
  prompt: string;
  params: Record<string, unknown>;
}

export interface AICreationResult {
  outputUrl: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}

@Processor(AI_CREATION_QUEUE)
export class AICreationProcessor extends WorkerHost {
  private readonly logger = new Logger(AICreationProcessor.name);

  constructor(
    @Inject(DATABASE) private readonly db: PostgresJsDatabase,
    private readonly replicateService: ReplicateService,
    private readonly sunoService: SunoService,
    private readonly elevenLabsService: ElevenLabsService
  ) {
    super();
  }

  async process(job: Job<AICreationJobData>): Promise<AICreationResult> {
    const { creationId, type, prompt, params } = job.data;

    this.logger.log(`Processing AI creation job ${job.id}: ${type}`);

    try {
      // Update status to processing
      await this.db
        .update(aiCreations)
        .set({ status: "processing" })
        .where(eq(aiCreations.id, creationId));

      // Call the appropriate AI service based on type
      let result: AICreationResult;

      switch (type) {
        case "video":
          result = await this.processVideo(prompt, params);
          break;
        case "music":
          result = await this.processMusic(prompt, params);
          break;
        case "voice":
          result = await this.processVoice(prompt, params);
          break;
        default:
          throw new Error(`Unknown creation type: ${type}`);
      }

      // Update with success
      await this.db
        .update(aiCreations)
        .set({
          status: "completed",
          resultUrl: result.outputUrl,
          durationSeconds: result.durationSeconds ?? null,
          completedAt: new Date(),
        })
        .where(eq(aiCreations.id, creationId));

      this.logger.log(`AI creation ${creationId} completed successfully`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Update with failure
      await this.db
        .update(aiCreations)
        .set({
          status: "failed",
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(aiCreations.id, creationId));

      this.logger.error(`AI creation ${creationId} failed: ${errorMessage}`);
      throw error;
    }
  }

  private async processVideo(
    prompt: string,
    params: Record<string, unknown>
  ): Promise<AICreationResult> {
    this.logger.log(`Video generation: "${prompt.slice(0, 50)}..."`);

    const result = await this.replicateService.generateVideo({
      prompt,
      style: params.style as string | undefined,
      duration: params.duration as number | undefined,
      imageUrl: params.imageUrl as string | undefined,
    });

    return {
      outputUrl: result.outputUrl,
      durationSeconds: result.durationSeconds,
      metadata: result.metadata,
    };
  }

  private async processMusic(
    prompt: string,
    params: Record<string, unknown>
  ): Promise<AICreationResult> {
    this.logger.log(`Music generation: "${prompt.slice(0, 50)}..."`);

    const result = await this.sunoService.generateMusic({
      prompt,
      genre: params.genre as string | undefined,
      mood: params.mood as string | undefined,
      lyrics: params.lyrics as string | undefined,
    });

    return {
      outputUrl: result.outputUrl,
      durationSeconds: result.durationSeconds,
      metadata: result.metadata,
    };
  }

  private async processVoice(
    prompt: string,
    params: Record<string, unknown>
  ): Promise<AICreationResult> {
    this.logger.log(`Voice generation: "${prompt.slice(0, 50)}..."`);

    const result = await this.elevenLabsService.generateVoice({
      text: prompt,
      voiceType: params.voiceType as string | undefined,
      language: params.language as string | undefined,
    });

    return {
      outputUrl: result.outputUrl,
      durationSeconds: result.durationSeconds,
      metadata: result.metadata,
    };
  }
}
