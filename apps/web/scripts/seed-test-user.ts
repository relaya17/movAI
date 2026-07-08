import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { createDb, users, userProfiles } from "@movai/db";

/**
 * One-off dev utility: creates a dummy Credentials-login account so you can
 * test /sign-in without going through Google/GitHub OAuth. Safe to re-run -
 * it no-ops if the account already exists. Requires the local docker-compose
 * Postgres to be running (see DATABASE_URL fallback below).
 *
 * Usage: pnpm --filter @movai/web seed:test-user
 */
const TEST_EMAIL = "test@movai.dev";
const TEST_PASSWORD = "Test1234!";
const TEST_USERNAME = "test_user";
const BCRYPT_COST = 12;

async function main(): Promise<void> {
  const db = createDb({
    connectionString: process.env.DATABASE_URL ?? "postgres://movai:movai@localhost:5433/movai",
    ssl: false,
    maxConnections: 1
  });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
  if (existing.length > 0) {
    console.log(`חשבון הדמה כבר קיים - אימייל: ${TEST_EMAIL} | סיסמה: ${TEST_PASSWORD}`);
    process.exit(0);
  }

  const passwordHash = await hash(TEST_PASSWORD, BCRYPT_COST);

  const [createdUser] = await db
    .insert(users)
    .values({ email: TEST_EMAIL, name: "משתמש דמה", passwordHash })
    .returning({ id: users.id });

  if (!createdUser) {
    throw new Error("יצירת המשתמש נכשלה - לא התקבל id בחזרה מה-insert");
  }

  await db.insert(userProfiles).values({
    userId: createdUser.id,
    firstName: "דמה",
    lastName: "טסט",
    username: TEST_USERNAME,
    dateOfBirth: "2000-01-01"
  });

  console.log("חשבון דמה נוצר בהצלחה:");
  console.log(`  אימייל:  ${TEST_EMAIL}`);
  console.log(`  סיסמה:   ${TEST_PASSWORD}`);
  console.log(`  יוזרניים: ${TEST_USERNAME}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("שגיאה ביצירת חשבון הדמה:", error);
  process.exit(1);
});
