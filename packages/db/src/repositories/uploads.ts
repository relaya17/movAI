import { desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { uploads, type uploadContentTypeEnum } from "../schema/creator";

export interface CreateUploadInput {
  creatorUserId: string;
  contentType: (typeof uploadContentTypeEnum.enumValues)[number];
  title: string;
  description?: string | undefined;
}

/** Row is created in "processing" status before the file finishes uploading - see finalizeUpload. */
export async function createPendingUpload(db: Database, input: CreateUploadInput): Promise<string> {
  const [row] = await db
    .insert(uploads)
    .values({
      creatorUserId: input.creatorUserId,
      contentType: input.contentType,
      title: input.title,
      description: input.description ?? null,
      status: "processing"
    })
    .returning({ id: uploads.id });

  if (!row) throw new Error("Failed to create upload row");
  return row.id;
}

/** Called once the storage adapter (lib/media-storage.ts) confirms the file landed - flips the row to "published". */
export async function finalizeUpload(
  db: Database,
  uploadId: string,
  media: { videoUrl: string; thumbnailUrl: string | null }
): Promise<void> {
  await db
    .update(uploads)
    .set({
      videoUrl: media.videoUrl,
      thumbnailUrl: media.thumbnailUrl,
      status: "published",
      updatedAt: new Date()
    })
    .where(eq(uploads.id, uploadId));
}

export async function getPublishedUploads(db: Database, limit = 50) {
  return db
    .select()
    .from(uploads)
    .where(eq(uploads.status, "published"))
    .orderBy(desc(uploads.createdAt))
    .limit(limit);
}

export async function getUploadsByCreator(db: Database, creatorUserId: string) {
  return db.select().from(uploads).where(eq(uploads.creatorUserId, creatorUserId)).orderBy(desc(uploads.createdAt));
}
