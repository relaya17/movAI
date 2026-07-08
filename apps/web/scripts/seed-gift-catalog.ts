/**
 * Seed the gift catalog with TikTok-style gift tiers.
 * Run: pnpm --filter @movai/web seed:gifts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { giftCatalog } from "@movai/db";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://movai:movai@localhost:5433/movai";

const GIFTS = [
  { id: "rose", name: "ורד", emoji: "🌹", costInCredits: 1, sortOrder: 1 },
  { id: "heart", name: "לב", emoji: "❤️", costInCredits: 5, sortOrder: 2 },
  { id: "star", name: "כוכב", emoji: "⭐", costInCredits: 10, sortOrder: 3 },
  { id: "fire", name: "אש", emoji: "🔥", costInCredits: 20, sortOrder: 4 },
  { id: "diamond", name: "יהלום", emoji: "💎", costInCredits: 50, sortOrder: 5 },
  { id: "crown", name: "כתר", emoji: "👑", costInCredits: 100, sortOrder: 6 },
  { id: "rocket", name: "רקטה", emoji: "🚀", costInCredits: 200, sortOrder: 7 },
  { id: "lion", name: "אריה", emoji: "🦁", costInCredits: 500, sortOrder: 8 },
];

async function seed() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  console.log("Seeding gift catalog...\n");

  for (const gift of GIFTS) {
    await db
      .insert(giftCatalog)
      .values(gift)
      .onConflictDoNothing();

    console.log(`  ${gift.emoji} ${gift.name}: ${gift.costInCredits} קרדיטים`);
  }

  console.log("\n✓ Gift catalog seeded!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
