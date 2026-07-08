import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, desc, and } from "drizzle-orm";
import { IsString, IsOptional, IsNumber, IsUrl, MinLength, MaxLength, Min, Max } from "class-validator";
import { aiCreations } from "@movai/db";
import { DATABASE } from "../infra/tokens";
import { CreditsService, AI_CREATION_COSTS } from "../credits/credits.service";
import { AI_CREATION_QUEUE } from "../queue/queue.module";
import type { AICreationJobData } from "../queue/ai-creation.processor";
import { randomUUID } from "crypto";

/**
 * Classes (not `interface`) on purpose - the global ValidationPipe
 * (main.ts) only has anything to validate against when Nest's reflection
 * metadata points at a real class. These were plain interfaces before,
 * which meant a request body was never actually checked against its
 * declared shape - only the controllers' own `if (!dto.prompt?.trim())`
 * spot-checks stood between a malformed/oversized body and the AI
 * provider calls & credit charges downstream.
 */
export class CreateVideoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  style?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  duration?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class CreateMusicDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lyrics?: string;
}

export class CreateVoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  voiceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;
}

export interface CreationStatus {
  id: string;
  type: string;
  status: string;
  prompt: string;
  outputUrl?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  creditsUsed: number;
}

@Injectable()
export class StudioService {
  constructor(
    @Inject(DATABASE) private readonly db: PostgresJsDatabase,
    @InjectQueue(AI_CREATION_QUEUE) private readonly creationQueue: Queue<AICreationJobData>,
    private readonly creditsService: CreditsService
  ) {}

  /**
   * Create a new video generation job.
   */
  async createVideo(userId: string, dto: CreateVideoDto): Promise<CreationStatus> {
    const creditCost = AI_CREATION_COSTS.video;

    // Check and reserve credits
    const canAfford = await this.creditsService.hasEnoughCredits(userId, creditCost);
    if (!canAfford) {
      throw new BadRequestException(
        `אין מספיק קרדיטים. נדרש: ${creditCost} קרדיטים ליצירת וידאו.`
      );
    }

    const creationId = randomUUID();

    // Deduct credits
    const creditResult = await this.creditsService.useCredits(
      userId,
      creditCost,
      "יצירת וידאו AI",
      creationId
    );

    if (!creditResult.success) {
      throw new BadRequestException("אין מספיק קרדיטים");
    }

    // Create DB record
    const [creation] = await this.db
      .insert(aiCreations)
      .values({
        id: creationId,
        userId,
        type: "video",
        prompt: dto.prompt,
        status: "pending",
        creditsUsed: creditCost,
        settings: JSON.stringify({
          style: dto.style,
          duration: dto.duration || 5,
          imageUrl: dto.imageUrl,
        }),
      })
      .returning();

    if (!creation) {
      throw new Error("Failed to create AI creation record");
    }

    // Add to processing queue
    await this.creationQueue.add(
      "create-video",
      {
        creationId,
        userId,
        type: "video",
        prompt: dto.prompt,
        creditsUsed: creditCost,
        params: {
          style: dto.style,
          duration: dto.duration || 5,
          imageUrl: dto.imageUrl,
        },
      },
      { jobId: creationId }
    );

    return this.mapCreation(creation);
  }

  /**
   * Create a new music generation job.
   */
  async createMusic(userId: string, dto: CreateMusicDto): Promise<CreationStatus> {
    const creditCost = AI_CREATION_COSTS.music;

    const canAfford = await this.creditsService.hasEnoughCredits(userId, creditCost);
    if (!canAfford) {
      throw new BadRequestException(
        `אין מספיק קרדיטים. נדרש: ${creditCost} קרדיטים ליצירת מוזיקה.`
      );
    }

    const creationId = randomUUID();

    const creditResult = await this.creditsService.useCredits(
      userId,
      creditCost,
      "יצירת מוזיקה AI",
      creationId
    );

    if (!creditResult.success) {
      throw new BadRequestException("אין מספיק קרדיטים");
    }

    const [creation] = await this.db
      .insert(aiCreations)
      .values({
        id: creationId,
        userId,
        type: "music",
        prompt: dto.prompt,
        status: "pending",
        creditsUsed: creditCost,
        settings: JSON.stringify({
          genre: dto.genre,
          mood: dto.mood,
          lyrics: dto.lyrics,
        }),
      })
      .returning();

    if (!creation) {
      throw new Error("Failed to create AI creation record");
    }

    await this.creationQueue.add(
      "create-music",
      {
        creationId,
        userId,
        type: "music",
        prompt: dto.prompt,
        creditsUsed: creditCost,
        params: {
          genre: dto.genre,
          mood: dto.mood,
          lyrics: dto.lyrics,
        },
      },
      { jobId: creationId }
    );

    return this.mapCreation(creation);
  }

  /**
   * Create a new voice generation job.
   */
  async createVoice(userId: string, dto: CreateVoiceDto): Promise<CreationStatus> {
    const creditCost = AI_CREATION_COSTS.voice;

    const canAfford = await this.creditsService.hasEnoughCredits(userId, creditCost);
    if (!canAfford) {
      throw new BadRequestException(
        `אין מספיק קרדיטים. נדרש: ${creditCost} קרדיטים ליצירת קול.`
      );
    }

    const creationId = randomUUID();

    const creditResult = await this.creditsService.useCredits(
      userId,
      creditCost,
      "יצירת קול AI",
      creationId
    );

    if (!creditResult.success) {
      throw new BadRequestException("אין מספיק קרדיטים");
    }

    const [creation] = await this.db
      .insert(aiCreations)
      .values({
        id: creationId,
        userId,
        type: "voice",
        prompt: dto.text,
        status: "pending",
        creditsUsed: creditCost,
        settings: JSON.stringify({
          voiceType: dto.voiceType,
          language: dto.language,
        }),
      })
      .returning();

    if (!creation) {
      throw new Error("Failed to create AI creation record");
    }

    await this.creationQueue.add(
      "create-voice",
      {
        creationId,
        userId,
        type: "voice",
        prompt: dto.text,
        creditsUsed: creditCost,
        params: {
          voiceType: dto.voiceType,
          language: dto.language,
        },
      },
      { jobId: creationId }
    );

    return this.mapCreation(creation);
  }

  /**
   * Get status of a specific creation.
   */
  async getCreation(userId: string, creationId: string): Promise<CreationStatus | null> {
    const [creation] = await this.db
      .select()
      .from(aiCreations)
      .where(and(eq(aiCreations.id, creationId), eq(aiCreations.userId, userId)));

    return creation ? this.mapCreation(creation) : null;
  }

  /**
   * Get all creations for a user.
   */
  async getUserCreations(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<CreationStatus[]> {
    const creations = await this.db
      .select()
      .from(aiCreations)
      .where(eq(aiCreations.userId, userId))
      .orderBy(desc(aiCreations.createdAt))
      .limit(limit)
      .offset(offset);

    return creations.map((c) => this.mapCreation(c));
  }

  private mapCreation(creation: typeof aiCreations.$inferSelect): CreationStatus {
    return {
      id: creation.id,
      type: creation.type,
      status: creation.status,
      prompt: creation.prompt,
      outputUrl: creation.resultUrl,
      errorMessage: creation.errorMessage,
      createdAt: creation.createdAt,
      completedAt: creation.completedAt,
      creditsUsed: creation.creditsUsed,
    };
  }
}
