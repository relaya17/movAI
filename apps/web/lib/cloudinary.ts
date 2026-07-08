/** Insert Cloudinary auto-format/quality + width cap so full-screen backdrops stay fast and sharp. */
export function optimizeCloudinaryUrl(url: string, width = 1920): string {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return url;

  const transform = `f_auto,q_auto:good,w_${width},c_limit`;
  return `${url.slice(0, index + marker.length)}${transform}/${url.slice(index + marker.length)}`;
}
