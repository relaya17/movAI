"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { generateVideoAction } from "@/lib/ai-studio-actions";
import { getUploadAuthorizationAction } from "@/lib/upload-actions";
import { uploadStudioImageToCloudinary } from "@/lib/studio-upload";
import { useAiGeneration } from "@/lib/use-ai-generation";
import { StudioResultShare } from "./StudioResultShare";

const STYLE_IDS = ["cinematic", "anime", "realistic", "3d", "cartoon", "noir"] as const;
const STYLE_EMOJIS: Record<(typeof STYLE_IDS)[number], string> = {
  cinematic: "🎬", anime: "🎌", realistic: "📷", "3d": "🎮", cartoon: "🎨", noir: "🖤"
};

const DURATION_CONFIG = [
  { id: "5", free: true },
  { id: "15", free: true },
  { id: "30", free: false },
  { id: "60", free: false },
] as const;

export function VideoCreator(): React.ReactElement {
  const t = useTranslations("studio.video");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const STYLES = STYLE_IDS.map((id) => ({ id, label: t(`styles.${id}`), emoji: STYLE_EMOJIS[id] }));
  const DURATIONS = DURATION_CONFIG.map((d) => ({ ...d, label: t(`durations.${d.id}`) }));

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("15");
  const [quality, setQuality] = useState<"standard" | "pro">("standard");
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { phase, resultUrl, error, start } = useAiGeneration();
  const isGenerating = phase === "starting" || phase === "processing";

  async function handleImageFile(file: File): Promise<void> {
    setUploadError(null);
    setUploadingImage(true);
    try {
      const authResult = await getUploadAuthorizationAction();
      if ("error" in authResult) {
        setUploadError(authResult.error);
        return;
      }
      const url = await uploadStudioImageToCloudinary(file, authResult.authorization);
      setBaseImageUrl(url);
      setBaseImagePreview(URL.createObjectURL(file));
    } catch {
      setUploadError(t("baseImageUploadError"));
    } finally {
      setUploadingImage(false);
    }
  }

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim()) return;
    await start(() =>
      generateVideoAction({
        prompt,
        style,
        durationSeconds: Number(duration),
        quality,
        ...(baseImageUrl ? { baseImageUrl } : {})
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Prompt input */}
      <div>
        <label htmlFor="video-prompt" className="mb-2 block text-sm font-medium text-neutral-300">
          {t("promptLabel")}
        </label>
        <textarea
          id="video-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("promptPlaceholder")}
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <p className="mt-1 text-xs text-neutral-500">{t("promptHint")}</p>
      </div>

      {/* Style selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("styleLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all ${
                style === s.id
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("durationLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDuration(d.id)}
              className={`relative rounded-lg px-4 py-2 text-sm transition-all ${
                duration === d.id
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              } ${!d.free ? "pr-12" : ""}`}
            >
              {d.label}
              {!d.free && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {t("proLabel")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quality tier */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="mb-3 text-sm font-medium text-neutral-300">{t("qualityLabel")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setQuality("standard")}
            className={`rounded-lg px-3 py-3 text-sm transition-all ${
              quality === "standard"
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                : "bg-white/5 text-neutral-400 hover:bg-white/10"
            }`}
          >
            <div className="font-semibold">{t("qualityStandard")}</div>
            <div className="text-xs opacity-80">{t("qualityStandardCost")}</div>
          </button>
          <button
            type="button"
            onClick={() => setQuality("pro")}
            className={`rounded-lg px-3 py-3 text-sm transition-all ${
              quality === "pro"
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 ring-1 ring-amber-500/50"
                : "bg-white/5 text-neutral-400 hover:bg-white/10"
            }`}
          >
            <div className="font-semibold">{t("qualityPro")}</div>
            <div className="text-xs opacity-80">{t("qualityProCost")}</div>
          </button>
        </div>
      </div>

      {/* Image upload (optional) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("baseImageLabel")}</label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 p-6 transition-all hover:border-white/30"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageFile(file);
            }}
          />
          {baseImagePreview ? (
            <div className="text-center">
              <Image src={baseImagePreview} alt="" width={256} height={128} unoptimized className="mx-auto mb-2 max-h-32 rounded-lg object-contain" />
              <p className="text-sm text-cyan-400">{t("baseImageReady")}</p>
              <button
                type="button"
                className="mt-2 text-xs text-neutral-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setBaseImageUrl(null);
                  setBaseImagePreview(null);
                }}
              >
                {t("baseImageRemove")}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <svg className="mx-auto mb-2 h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-neutral-400">
                {uploadingImage ? t("baseImageUploading") : t("baseImagePrompt")}
              </p>
            </div>
          )}
        </div>
        {uploadError ? <p className="mt-1 text-xs text-red-400">{uploadError}</p> : null}
      </div>

      {/* Generate button */}
      <Button
        onClick={() => void handleGenerate()}
        disabled={!prompt.trim() || isGenerating || uploadingImage}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-3 font-semibold text-white hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t("generating")}
          </span>
        ) : (
          t("generate")
        )}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Result */}
      {phase === "done" && resultUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <video src={resultUrl} controls className="w-full" />
          <div className="p-3">
            <StudioResultShare resultUrl={resultUrl} mediaType="video" />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/30 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span className="text-3xl">🎬</span>
          </div>
          <p className="text-neutral-400">{t("resultPlaceholder")}</p>
          <p className="mt-1 text-xs text-neutral-500">{t("resultHint")}</p>
        </div>
      )}
    </div>
  );
}
