import { createHash } from "node:crypto";

/**
 * Signed direct-to-Cloudinary upload (server-only signing, browser does the
 * actual upload). Video files never pass through the Next.js server: a
 * multi-hundred-MB file routed through a server action would hit body-size
 * limits and burn serverless execution time for no reason. Instead the
 * server only produces a short-lived signature; the browser uploads
 * straight to Cloudinary using it - see components/studio/UploadForm.tsx.
 *
 * Signing algorithm is Cloudinary's documented one, implemented directly
 * with node:crypto instead of pulling in the full `cloudinary` SDK (which
 * is a management-API client, not just a signer) for one function:
 * https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export interface UploadAuthorization {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export class MediaStorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Cloudinary is not configured - set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (see .env.example)."
    );
    this.name = "MediaStorageNotConfiguredError";
  }
}

function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

/** `folder` scopes uploads per creator (e.g. "studio/<userId>") so one user's files are never listed under another's. */
export function createUploadAuthorization(folder: string): UploadAuthorization {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new MediaStorageNotConfiguredError();
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ folder, timestamp }, apiSecret);

  return { cloudName, apiKey, timestamp, folder, signature };
}

/**
 * Cloudinary can derive a JPEG poster frame from an uploaded video purely
 * via URL transformation (no separate upload/processing step needed) -
 * swap the resource type segment and extension.
 */
export function deriveThumbnailUrl(videoUrl: string): string | null {
  if (!videoUrl.includes("/video/upload/")) return null;
  const withImagePath = videoUrl.replace("/video/upload/", "/video/upload/so_1/");
  return withImagePath.replace(/\.[a-zA-Z0-9]+$/, ".jpg");
}
