"use server";

import { z } from "zod";
import { createPendingUpload, finalizeUpload, uploads } from "@movai/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./db";
import { createUploadAuthorization, deriveThumbnailUrl } from "./media-storage";

const createUploadSchema = z.object({
  contentType: z.enum(["standup", "music", "singing"], { errorMap: () => ({ message: "בחרו סוג תוכן" }) }),
  title: z.string().trim().min(1, "כותרת היא שדה חובה").max(200, "כותרת ארוכה מדי"),
  description: z.string().trim().max(2000, "תיאור ארוך מדי").optional()
});

export interface CreateUploadState {
  uploadId?: string;
  error?: string;
}

/**
 * Step 1 of the upload flow (components/studio/UploadForm.tsx): creates a
 * "processing" DB row and hands back both its id and a one-time signature
 * the browser can use to push the actual file straight to Cloudinary - see
 * lib/media-storage.ts for why the file itself never goes through here.
 */
export async function createUploadAction(
  _prevState: CreateUploadState,
  formData: FormData
): Promise<CreateUploadState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "יש להתחבר כדי להעלות תוכן" };
  }

  const parsed = createUploadSchema.safeParse({
    contentType: formData.get("contentType"),
    title: formData.get("title"),
    description: formData.get("description") || undefined
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }

  const uploadId = await createPendingUpload(db, {
    creatorUserId: session.user.id,
    contentType: parsed.data.contentType,
    title: parsed.data.title,
    description: parsed.data.description
  });

  return { uploadId };
}

export interface UploadAuthorizationResult {
  authorization: ReturnType<typeof createUploadAuthorization>;
  error?: never;
}
export interface UploadAuthorizationError {
  authorization?: never;
  error: string;
}

/** Step 2: a fresh signature scoped to this creator's folder, good for a few minutes (Cloudinary enforces the timestamp window server-side). */
export async function getUploadAuthorizationAction(): Promise<UploadAuthorizationResult | UploadAuthorizationError> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "יש להתחבר כדי להעלות תוכן" };
  }

  try {
    const authorization = createUploadAuthorization(`studio/${session.user.id}`);
    return { authorization };
  } catch {
    // MediaStorageNotConfiguredError - deliberately generic to the client; the real cause is logged server-side and fixed via env vars, not something a user can act on.
    return { error: "העלאת קבצים אינה זמינה כרגע - נסו שוב מאוחר יותר" };
  }
}

/** Step 3: called once the browser's direct Cloudinary upload succeeds - flips the row from "processing" to "published". */
export async function finalizeUploadAction(
  uploadId: string,
  videoUrl: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "יש להתחבר כדי להעלות תוכן" };
  }

  const [upload] = await db.select({ creatorUserId: uploads.creatorUserId }).from(uploads).where(eq(uploads.id, uploadId)).limit(1);
  if (!upload || upload.creatorUserId !== session.user.id) {
    return { success: false, error: "ההעלאה לא נמצאה" };
  }

  await finalizeUpload(db, uploadId, {
    videoUrl,
    thumbnailUrl: deriveThumbnailUrl(videoUrl)
  });

  return { success: true };
}
