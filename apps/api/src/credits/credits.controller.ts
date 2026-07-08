import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { CreditsService, CREATION_COSTS, CREDIT_VALUE_NIS } from "./credits.service";

interface InitCreditsDto {
  userId: string;
}

interface UseCreditsDto {
  userId: string;
  amount: number;
  description?: string;
  referenceId?: string;
}

@Controller("credits")
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  /**
   * Get credit pricing information.
   */
  @Get("pricing")
  getPricing() {
    return {
      creditValueNis: CREDIT_VALUE_NIS,
      creationCosts: CREATION_COSTS,
      signupBonus: 10,
    };
  }

  /**
   * Get available credit packages for purchase.
   */
  @Get("packages")
  async getPackages() {
    return this.creditsService.getPackages();
  }

  /**
   * Get user's credit balance.
   * In production, userId would come from JWT token.
   */
  @Get("balance/:userId")
  async getBalance(@Param("userId") userId: string) {
    if (!userId) {
      throw new BadRequestException("userId is required");
    }
    return this.creditsService.getBalance(userId);
  }

  /**
   * Initialize credits for a new user (called on signup).
   */
  @Post("initialize")
  async initializeCredits(@Body() dto: InitCreditsDto) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    return this.creditsService.initializeUserCredits(dto.userId);
  }

  /**
   * Check if user has enough credits.
   */
  @Get("check/:userId")
  async checkCredits(
    @Param("userId") userId: string,
    @Query("amount") amount: string
  ) {
    if (!userId || !amount) {
      throw new BadRequestException("userId and amount are required");
    }
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestException("amount must be a positive number");
    }
    const hasEnough = await this.creditsService.hasEnoughCredits(userId, numAmount);
    const balance = await this.creditsService.getBalance(userId);
    return {
      hasEnough,
      currentBalance: balance.balance,
      required: numAmount,
      missing: hasEnough ? 0 : numAmount - balance.balance,
    };
  }

  /**
   * Use credits for a creation (internal API).
   */
  @Post("use")
  async useCredits(@Body() dto: UseCreditsDto) {
    if (!dto.userId || !dto.amount) {
      throw new BadRequestException("userId and amount are required");
    }
    if (dto.amount <= 0) {
      throw new BadRequestException("amount must be positive");
    }
    return this.creditsService.useCredits(
      dto.userId,
      dto.amount,
      dto.description,
      dto.referenceId
    );
  }

  /**
   * Get user's transaction history.
   */
  @Get("history/:userId")
  async getHistory(
    @Param("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    if (!userId) {
      throw new BadRequestException("userId is required");
    }
    const numLimit = limit ? parseInt(limit, 10) : 50;
    const numOffset = offset ? parseInt(offset, 10) : 0;
    return this.creditsService.getTransactionHistory(userId, numLimit, numOffset);
  }
}
