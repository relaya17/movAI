import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { accounts, sessions, users, verificationTokens } from "@movai/db";
import { db } from "./lib/db";

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "development" ? "movai-dev-secret-replace-before-production" : "");

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

/**
 * Auth.js v5 config. Google is the primary provider (lowest-friction sign-in
 * for most users), GitHub stays available as a secondary option, Credentials
 * (email+password) is the fallback for people who don't want to use either.
 *
 * Session strategy is JWT rather than "database" - the Credentials provider
 * only works with JWT sessions (there's no OAuth account-linking step for it
 * to hook into), and using one strategy for every provider keeps the app's
 * auth behavior uniform instead of provider-dependent. DrizzleAdapter is
 * still used for createUser/linkAccount on the OAuth providers.
 *
 * AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_GITHUB_ID / AUTH_GITHUB_SECRET /
 * AUTH_SECRET must be set via environment variables (never committed - see
 * .env.example). AUTH_SECRET falls back to a dev-only placeholder locally so
 * the landing page loads without a .env file; production must set a real secret.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
  session: { strategy: "jwt" },
  providers: [
    Google,
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
        if (!user?.passwordHash) return null; // no password set - Google/GitHub-only account

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      }
    })
  ],
  pages: {
    signIn: "/sign-in"
  }
});
