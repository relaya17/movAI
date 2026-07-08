"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { generateVoiceAction } from "@/lib/ai-studio-actions";
import { useAiGeneration } from "@/lib/use-ai-generation";

const VOICE_TYPE_IDS = ["narrator", "singer_male", "singer_female", "character"] as const;
const VOICE_TYPE_EMOJIS: Record<(typeof VOICE_TYPE_IDS)[number], string> = {
  narrator: "🎙️", singer_male: "👨‍🎤", singer_female: "👩‍🎤", character: "🎭"
};

const LANGUAGE_IDS = ["he", "en", "ar", "ru", "fr", "es"] as const;

export function VoiceCreator(): React.ReactElement {
  const t = useTranslations("studio.voice");
  const VOICE_TYPES = VOICE_TYPE_IDS.map((id) => ({
    id,
    label: t(`types.${id}.label`),
    description: t(`types.${id}.description`),
    emoji: VOICE_TYPE_EMOJIS[id]
  }));
  const LANGUAGES = LANGUAGE_IDS.map((id) => ({ id, label: t(`languages.${id}`) }));

  const [text, setText] = useState("");
  const [voiceType, setVoiceType] = useState("narrator");
  const [language, setLanguage] = useState("he");
  const { phase, resultUrl, error, start } = useAiGeneration();
  const isGenerating = phase === "starting" || phase === "processing";

  const handleGenerate = async (): Promise<void> => {
    if (!text.trim()) return;
    await start(() => generateVoiceAction({ text, voiceType, language }));
  };

  return (
    <div className="space-y-6">
      {/* Voice type selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("typeLabel")}</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VOICE_TYPES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVoiceType(v.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all ${
                voiceType === v.id
                  ? "bg-cyan-500/20 text-white ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              <span className="text-2xl">{v.emoji}</span>
              <span className="text-sm font-medium">{v.label}</span>
              <span className="text-xs text-neutral-500">{v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("languageLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`rounded-lg px-4 py-2 text-sm transition-all ${
                language === l.id
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text/Lyrics input */}
      <div>
        <label htmlFor="voice-text" className="mb-2 block text-sm font-medium text-neutral-300">
          {voiceType.includes("singer") ? t("lyricsTextLabel") : t("narrationTextLabel")}
        </label>
        <textarea
          id="voice-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={voiceType.includes("singer") ? t("lyricsPlaceholder") : t("narrationPlaceholder")}
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          {t("charCount", { count: text.length })}
        </p>
      </div>

      {/* Voice cloning notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-medium text-amber-200">{t("cloningHeading")}</p>
            <p className="mt-1 text-sm text-amber-200/70">
              {t("cloningDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={() => void handleGenerate()}
        disabled={!text.trim() || isGenerating}
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
        <div className="rounded-xl border border-white/10 bg-black/30 p-6">
          <audio src={resultUrl} controls className="w-full" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/30 p-6">
          <div className="flex items-center gap-4">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="h-8 rounded-lg bg-white/5">
                {/* Waveform visualization placeholder */}
                <div className="flex h-full items-center justify-center gap-0.5 px-2">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-cyan-500/30"
                      style={{ height: `${Math.random() * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-neutral-400">{t("resultPlaceholder")}</p>
        </div>
      )}
    </div>
  );
}
