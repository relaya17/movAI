import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  StudioService,
  CreateVideoDto,
  CreateMusicDto,
  CreateVoiceDto,
} from "./studio.service";

@Controller("studio")
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  /**
   * Create a new video.
   */
  @Post("video")
  async createVideo(
    @Body() dto: CreateVideoDto & { userId: string }
  ) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    if (!dto.prompt?.trim()) {
      throw new BadRequestException("prompt is required");
    }
    return this.studioService.createVideo(dto.userId, dto);
  }

  /**
   * Create a new music track.
   */
  @Post("music")
  async createMusic(
    @Body() dto: CreateMusicDto & { userId: string }
  ) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    if (!dto.prompt?.trim()) {
      throw new BadRequestException("prompt is required");
    }
    return this.studioService.createMusic(dto.userId, dto);
  }

  /**
   * Create a new voice/speech.
   */
  @Post("voice")
  async createVoice(
    @Body() dto: CreateVoiceDto & { userId: string }
  ) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    if (!dto.text?.trim()) {
      throw new BadRequestException("text is required");
    }
    return this.studioService.createVoice(dto.userId, dto);
  }

  /**
   * Get a specific creation status.
   */
  @Get("creations/:id")
  async getCreation(
    @Param("id") creationId: string,
    @Query("userId") userId: string
  ) {
    if (!userId) {
      throw new BadRequestException("userId query param is required");
    }
    const creation = await this.studioService.getCreation(userId, creationId);
    if (!creation) {
      throw new BadRequestException("Creation not found");
    }
    return creation;
  }

  /**
   * Get all creations for a user.
   */
  @Get("creations")
  async getUserCreations(
    @Query("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    if (!userId) {
      throw new BadRequestException("userId query param is required");
    }
    return this.studioService.getUserCreations(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0
    );
  }
}
