import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { sponsors } from "../schema/sponsors";

/** Shown to non-subscribers only (see apps/web/components/dashboard/SponsorBanner.tsx). */
export async function listActiveSponsors(db: Database) {
  return db.select().from(sponsors).where(eq(sponsors.isActive, 1)).orderBy(sponsors.sortOrder);
}

/** Every sponsor regardless of active status - the admin management page (manual control, no ad network). */
export async function listAllSponsors(db: Database) {
  return db.select().from(sponsors).orderBy(sponsors.sortOrder);
}

export interface CreateSponsorInput {
  name: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder?: number;
}

export async function createSponsor(db: Database, input: CreateSponsorInput) {
  const [row] = await db
    .insert(sponsors)
    .values({ name: input.name, imageUrl: input.imageUrl, linkUrl: input.linkUrl, sortOrder: input.sortOrder ?? 0 })
    .returning();
  return row;
}

export interface UpdateSponsorInput {
  name?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function updateSponsor(db: Database, sponsorId: string, input: UpdateSponsorInput) {
  const [row] = await db
    .update(sponsors)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive ? 1 : 0 } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date()
    })
    .where(eq(sponsors.id, sponsorId))
    .returning();
  return row;
}

export async function deleteSponsor(db: Database, sponsorId: string): Promise<void> {
  await db.delete(sponsors).where(eq(sponsors.id, sponsorId));
}
