/** Client-side direct upload of a Studio reference image to Cloudinary. */
export function uploadStudioImageToCloudinary(
  file: File,
  auth: { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", auth.apiKey);
    formData.append("timestamp", String(auth.timestamp));
    formData.append("signature", auth.signature);
    formData.append("folder", auth.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${auth.cloudName}/image/upload`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as { secure_url?: string };
          if (response.secure_url) resolve(response.secure_url);
          else reject(new Error("no_url"));
        } catch {
          reject(new Error("invalid_response"));
        }
      } else {
        reject(new Error(`upload_${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(formData);
  });
}
