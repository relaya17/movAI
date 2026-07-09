"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { generateImageAction } from "@/lib/ai-studio-actions";
import { useAiGeneration } from "@/lib/use-ai-generation";
import { StudioResultShare } from "./StudioResultShare";

const STYLE_IDS = ["cinematic", "photorealistic", "illustration", "anime", "poster", "3d"] as const;

export function ImageCreator(): React.ReactElement {
  const t = useTranslations("studio.image");
  const STYLES = STYLE_IDS.map((id) => ({ id, label: t(`styles.${id}`) }));

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<(typeof STYLE_IDS)[number]>("cinematic");
  const [quality, setQuality] = useState<"standard" | "pro">("standard");
  const { phase, resultUrl, error, start } = useAiGeneration();
  const isGenerating = phase === "starting" || phase === "processing";

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim()) return;
    await start(() => generateImageAction({ prompt, style, quality }));
  };

  return (
    <div className="space-y-6">
      {/* Prompt input */}
      <div>
        <label htmlFor="image-prompt" className="mb-2 block text-sm font-medium text-neutral-300">
          {t("promptLabel")}
        </label>
        <textarea
          id="image-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("promptPlaceholder")}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Style selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("styleLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`rounded-lg px-3 py-2 text-sm transition-all ${
                style === s.id
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality tier - standard (fast/cheap) vs pro (Flux 1.1 Pro, higher fidelity) */}
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

      {/* Generate button */}
      <Button
        onClick={() => void handleGenerate()}
        disabled={!prompt.trim() || isGenerating}
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
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <Image src={resultUrl} alt={prompt} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" unoptimized />
          </div>
          <StudioResultShare resultUrl={resultUrl} mediaType="image" />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20">
          <p className="px-6 text-center text-sm text-neutral-500">{t("resultPlaceholder")}</p>
        </div>
      )}
    </div>
  );
}
