import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

/**
 * Minimal shared-secret guard for internal/admin endpoints, until real
 * role-based auth exists (tracked as a Phase 2+ item). Never apply this to
 * end-user-facing routes - it's a stopgap for operator-only actions like
 * manually triggering ingestion.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers["x-admin-key"];
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException("Admin endpoints are disabled - ADMIN_API_KEY is not configured");
    }
    if (providedKey !== expectedKey) {
      throw new UnauthorizedException("Invalid admin key");
    }
    return true;
  }
}
