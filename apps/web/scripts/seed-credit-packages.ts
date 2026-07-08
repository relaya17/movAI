/**
 * Seed default credit packages for MoVAI Studio.
 * Run: pnpm --filter @movai/web seed:packages
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { creditPackages } from "@movai/db";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://movai:movai@localhost:5433/movai";

const PACKAGES = [
  {
    name: "סטארטר",
    credits: 20,
    priceNis: "10.00",
    priceUsd: "2.70",
    bonusCredits: 0,
    sortOrder: 1,
  },
  {
    name: "בייסיק",
    credits: 50,
    priceNis: "25.00",
    priceUsd: "6.75",
    bonusCredits: 5,
    sortOrder: 2,
  },
  {
    name: "פופולרי",
    credits: 100,
    priceNis: "50.00",
    priceUsd: "13.50",
    bonusCredits: 15,
    sortOrder: 3,
  },
  {
    name: "יוצר",
    credits: 200,
    priceNis: "100.00",
    priceUsd: "27.00",
    bonusCredits: 40,
    sortOrder: 4,
  },
  {
    name: "סטודיו",
    credits: 500,
    priceNis: "225.00",
    priceUsd: "60.75",
    bonusCredits: 125,
    sortOrder: 5,
  },
];

async function seed() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  console.log("Seeding credit packages...");

  for (const pkg of PACKAGES) {
    await db
      .insert(creditPackages)
      .values({
        name: pkg.name,
        credits: pkg.credits,
        priceNis: pkg.priceNis,
        priceUsd: pkg.priceUsd,
        bonusCredits: pkg.bonusCredits,
        sortOrder: pkg.sortOrder,
        isActive: 1,
      })
      .onConflictDoNothing();

    console.log(`  ✓ ${pkg.name}: ${pkg.credits} credits (+ ${pkg.bonusCredits} bonus) = ₪${pkg.priceNis}`);
  }

  console.log("\nDone!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
