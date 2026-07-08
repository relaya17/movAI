import jwt from "jsonwebtoken";

/**
 * Mints a short-lived token proving *this* Next.js server already verified
 * the caller's Auth.js session belongs to `userId` - apps/api's
 * JwtAuthGuard requires this on every credits/studio route instead of
 * trusting a client-supplied userId. Only ever call this with a userId
 * you've just read from `auth()` on the server, never with anything that
 * came from the request body/params.
 */
export function mintApiToken(userId: string): string {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    throw new Error("API_JWT_SECRET is not configured - set it to the same value in apps/web and apps/api's env");
  }
  return jwt.sign({ sub: userId }, secret, { algorithm: "HS256", expiresIn: "5m" });
}
