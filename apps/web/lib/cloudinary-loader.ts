import type { ImageLoaderProps } from "next/image";
import { optimizeCloudinaryUrl } from "./cloudinary";

/**
 * Bypass Next's `/_next/image` proxy for Cloudinary assets.
 *
 * Cloudinary already serves resized/compressed variants via
 * optimizeCloudinaryUrl(); routing them through Next's optimizer is
 * redundant and, on machines with TLS interception (corporate proxy /
 * antivirus), causes UNABLE_TO_VERIFY_LEAF_SIGNATURE → 500s and multi-second
 * page stalls while the optimizer retries the fetch.
 *
 * Non-Cloudinary srcs (e.g. TMDB posters) are returned as-is so the browser
 * loads them directly too under this custom loader.
 */
export default function cloudinaryLoader({ src, width }: ImageLoaderProps): string {
  if (src.includes("res.cloudinary.com")) {
    return optimizeCloudinaryUrl(src, width);
  }
  return src;
}
