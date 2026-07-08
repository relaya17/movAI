import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  /** Set by JwtAuthGuard from the verified token's `sub` claim - never trust a userId supplied in the request body/query instead of this. */
  userId: string;
}

/**
 * Every credits/studio route used to trust a plain `userId` field the
 * caller put in the request body or a `?userId=` query param, with nothing
 * verifying it belonged to whoever was actually making the request - any
 * client could deduct credits from, or read the creation history of, any
 * other user just by naming them. This guard replaces that: it requires a
 * `Authorization: Bearer <token>` header containing a JWT signed with
 * API_JWT_SECRET, and the verified token's `sub` claim becomes the only
 * userId the rest of the request is allowed to see (via @CurrentUserId()).
 *
 * The token is minted server-side by whichever caller already knows the
 * real authenticated user (e.g. apps/web's Next.js server, after checking
 * its own Auth.js session) - see apps/web/lib/api-client.ts. A bare client
 * can no longer make up a userId, because it has no way to produce a
 * validly-signed token for one.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Authorization: Bearer <token> header");
    }

    const secret = process.env.API_JWT_SECRET;
    if (!secret) {
      // Fails closed, not open - a missing secret must never be treated as "auth disabled".
      throw new UnauthorizedException("API_JWT_SECRET is not configured on the server");
    }

    const token = authHeader.slice("Bearer ".length);

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || !payload.sub) {
        throw new UnauthorizedException("Token is missing a subject (userId) claim");
      }
      request.userId = payload.sub;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
