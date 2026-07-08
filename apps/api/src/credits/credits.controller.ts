import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";
import { CreditsService, CREATION_COSTS, CREDIT_VALUE_NIS } from "./credits.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUserId } from "../auth/current-user-id.decorator";

/** A class, not an interface - see studio.service.ts DTOs for why that matters to the global ValidationPipe. */
class UseCreditsDto {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referenceId?: string;
}

@Controller("credits")
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  /**
   * Get credit pricing information. Public - no user data involved.
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
   * Get available credit packages for purchase. Public - no user data involved.
   */
  @Get("packages")
  async getPackages() {
    return this.creditsService.getPackages();
  }

  /**
   * Get the caller's own credit balance. userId comes from the verified
   * JWT, never from the request - there is no way to ask for anyone else's
   * balance through this endpoint.
   */
  @UseGuards(JwtAuthGuard)
  @Get("balance")
  async getBalance(@CurrentUserId() userId: string) {
    return this.creditsService.getBalance(userId);
  }

  /**
   * Initialize credits for the caller (called on signup).
   */
  @UseGuards(JwtAuthGuard)
  @Post("initialize")
  async initializeCredits(@CurrentUserId() userId: string) {
    return this.creditsService.initializeUserCredits(userId);
  }

  /**
   * Check if the caller has enough credits for an amount.
   */
  @UseGuards(JwtAuthGuard)
  @Get("check")
  async checkCredits(@CurrentUserId() userId: string, @Query("amount") amount: string) {
    if (!amount) {
      throw new BadRequestException("amount is required");
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
   * Spend credits from the caller's own balance for a creation.
   */
  @UseGuards(JwtAuthGuard)
  @Post("use")
  async useCredits(@CurrentUserId() userId: string, @Body() dto: UseCreditsDto) {
    if (!dto.amount) {
      throw new BadRequestException("amount is required");
    }
    if (dto.amount <= 0) {
      throw new BadRequestException("amount must be positive");
    }
    return this.creditsService.useCredits(
      userId,
      dto.amount,
      dto.description,
      dto.referenceId
    );
  }

  /**
   * Get the caller's own transaction history.
   */
  @UseGuards(JwtAuthGuard)
  @Get("history")
  async getHistory(
    @CurrentUserId() userId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    const numOffset = offset ? parseInt(offset, 10) : 0;
    return this.creditsService.getTransactionHistory(userId, numLimit, numOffset);
  }
}
