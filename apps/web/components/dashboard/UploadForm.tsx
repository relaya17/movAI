"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { createUploadAction, finalizeUploadAction, getUploadAuthorizationAction } from "@/lib/upload-actions";

const CONTENT_TYPE_IDS = ["standup", "music", "singing"] as const;
const CONTENT_TYPE_ICONS: Record<(typeof CONTENT_TYPE_IDS)[number], string> = {
  standup: "🎤",
  music: "🎵",
  singing: "🎙️"
};

type ContentTypeId = (typeof CONTENT_TYPE_IDS)[number];
type UploadPhase = "idle" | "creating" | "uploading" | "finalizing" | "done" | "error";

interface CloudinaryUploadErrors {
  cloudinaryNoUrl: string;
  invalidResponse: string;
  uploadFailedStatus: (status: number) => string;
  networkError: string;
}

/** Uploads the raw file straight to Cloudinary via XHR (not fetch) specifically to get upload-progress events for the progress bar. */
function uploadFileToCloudinary(
  file: File,
  auth: { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string },
  onProgress: (percent: number) => void,
  errors: CloudinaryUploadErrors
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", auth.apiKey);
    formData.append("timestamp", String(auth.timestamp));
    formData.append("signature", auth.signature);
    formData.append("folder", auth.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${auth.cloudName}/video/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as { secure_url?: string };
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error(errors.cloudinaryNoUrl));
          }
        } catch {
          reject(new Error(errors.invalidResponse));
        }
      } else {
        reject(new Error(errors.uploadFailedStatus(xhr.status)));
      }
    };
    xhr.onerror = () => reject(new Error(errors.networkError));

    xhr.send(formData);
  });
}

export function UploadForm(): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("upload");
  const tContent = useTranslations("contentTypes");
  const CONTENT_TYPES = CONTENT_TYPE_IDS.map((id) => ({ id, label: tContent(id), icon: CONTENT_TYPE_ICONS[id] }));
  const [selectedType, setSelectedType] = useState<ContentTypeId | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = phase === "creating" || phase === "uploading" || phase === "finalizing";

  const handleDrag = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!selectedType) return setError(t("errors.selectContentType"));
    if (!title.trim()) return setError(t("errors.titleRequired"));
    if (!file) return setError(t("errors.selectFile"));

    try {
      setPhase("creating");
      const formData = new FormData();
      formData.set("contentType", selectedType);
      formData.set("title", title);
      formData.set("description", description);
      const created = await createUploadAction({}, formData);
      if (created.error || !created.uploadId) {
        setError(created.error ?? t("errors.createFailed"));
        setPhase("error");
        return;
      }

      const authResult = await getUploadAuthorizationAction();
      if (authResult.error || !authResult.authorization) {
        setError(authResult.error ?? t("errors.authError"));
        setPhase("error");
        return;
      }

      setPhase("uploading");
      const videoUrl = await uploadFileToCloudinary(file, authResult.authorization, setProgress, {
        cloudinaryNoUrl: t("errors.cloudinaryNoUrl"),
        invalidResponse: t("errors.invalidResponse"),
        uploadFailedStatus: (status) => t("errors.uploadFailedStatus", { status }),
        networkError: t("errors.networkError")
      });

      setPhase("finalizing");
      const finalized = await finalizeUploadAction(created.uploadId, videoUrl);
      if (!finalized.success) {
        setError(finalized.error);
        setPhase("error");
        return;
      }

      setPhase("done");
      router.push("/browse");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("errors.genericUploadError"));
      setPhase("error");
    }
  };

  return (
    <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
      {/* Content type selection */}
      <div>
        <label className="mb-3 block text-sm font-medium text-neutral-300">{t("contentTypeLabel")}</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(type.id)}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedType === type.id
                  ? "border-cyan-400 bg-cyan-400/10 text-white"
                  : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="text-2xl">{type.icon}</span>
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-medium text-neutral-300">
          {t("titleLabel")}
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          placeholder={t("titlePlaceholder")}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-neutral-300">
          {t("descriptionLabel")}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
        />
      </div>

      {/* File upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("fileLabel")}</label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
            dragActive
              ? "border-cyan-400 bg-cyan-400/10"
              : "border-white/20 bg-white/5 hover:border-white/30"
          } ${isSubmitting ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        >
          <input
            type="file"
            accept="video/*"
            disabled={isSubmitting}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <svg className="mb-3 h-10 w-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {file ? (
            <p className="text-sm font-medium text-white">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-neutral-400">{t("dragPrompt")}</p>
              <p className="mt-1 text-xs text-neutral-500">{t("fileFormats")}</p>
            </>
          )}
        </div>
      </div>

      {/* Gift settings (informational - gifts are always enabled on published uploads for now) */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <h3 className="font-semibold text-white">{t("giftsHeading")}</h3>
            <p className="mt-1 text-sm text-neutral-400">{t("giftsDescription")}</p>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-neutral-300">
            <span>
              {phase === "creating" && t("phaseCreating")}
              {phase === "uploading" && t("phaseUploading", { progress })}
              {phase === "finalizing" && t("phaseFinalizing")}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${phase === "uploading" ? progress : phase === "finalizing" ? 100 : 10}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-3 font-semibold text-white hover:from-cyan-400 hover:to-blue-400"
      >
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
