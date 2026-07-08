import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import {
  StudioService,
  CreateVideoDto,
  CreateMusicDto,
  CreateVoiceDto,
} from "./studio.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUserId } from "../auth/current-user-id.decorator";

@UseGuards(JwtAuthGuard)
@Controller("studio")
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  /**
   * Create a new video. userId comes from the verified JWT - a caller can
   * only ever spend their own credits, never someone else's.
   */
  @Post("video")
  async createVideo(@CurrentUserId() userId: string, @Body() dto: CreateVideoDto) {
    if (!dto.prompt?.trim()) {
      throw new BadRequestException("prompt is required");
    }
    return this.studioService.createVideo(userId, dto);
  }

  /**
   * Create a new music track.
   */
  @Post("music")
  async createMusic(@CurrentUserId() userId: string, @Body() dto: CreateMusicDto) {
    if (!dto.prompt?.trim()) {
      throw new BadRequestException("prompt is required");
    }
    return this.studioService.createMusic(userId, dto);
  }

  /**
   * Create a new voice/speech.
   */
  @Post("voice")
  async createVoice(@CurrentUserId() userId: string, @Body() dto: CreateVoiceDto) {
    if (!dto.text?.trim()) {
      throw new BadRequestException("text is required");
    }
    return this.studioService.createVoice(userId, dto);
  }

  /**
   * Get a specific creation status - ownership (userId match) is enforced
   * in the service query itself, so this can never leak another user's
   * creation even if they guess a valid id.
   */
  @Get("creations/:id")
  async getCreation(@CurrentUserId() userId: string, @Param("id") creationId: string) {
    const creation = await this.studioService.getCreation(userId, creationId);
    if (!creation) {
      throw new BadRequestException("Creation not found");
    }
    return creation;
  }

  /**
   * Get all creations for the caller.
   */
  @Get("creations")
  async getUserCreations(
    @CurrentUserId() userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.studioService.getUserCreations(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0
    );
  }
}
