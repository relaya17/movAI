"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { generateMusicAction } from "@/lib/ai-studio-actions";
import { useAiGeneration } from "@/lib/use-ai-generation";
import { StudioResultShare } from "./StudioResultShare";

const GENRE_IDS = ["pop", "rock", "electronic", "jazz", "classical", "hiphop", "ambient", "cinematic"] as const;
const GENRE_EMOJIS: Record<(typeof GENRE_IDS)[number], string> = {
  pop: "🎤", rock: "🎸", electronic: "🎧", jazz: "🎷", classical: "🎻", hiphop: "🎤", ambient: "🌊", cinematic: "🎬"
};

const MOOD_IDS = ["happy", "sad", "energetic", "calm", "dramatic", "romantic"] as const;

export function MusicCreator(): React.ReactElement {
  const t = useTranslations("studio.music");
  const GENRES = GENRE_IDS.map((id) => ({ id, label: t(`genres.${id}`), emoji: GENRE_EMOJIS[id] }));
  const MOODS = MOOD_IDS.map((id) => ({ id, label: t(`moods.${id}`) }));

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("pop");
  const [mood, setMood] = useState("happy");
  const [withLyrics, setWithLyrics] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const { phase, resultUrl, error, start } = useAiGeneration();
  const isGenerating = phase === "starting" || phase === "processing";

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim()) return;
    await start(() => generateMusicAction({ prompt, genre, mood, withLyrics, lyrics: withLyrics ? lyrics : undefined }));
  };

  return (
    <div className="space-y-6">
      {/* Prompt input */}
      <div>
        <label htmlFor="music-prompt" className="mb-2 block text-sm font-medium text-neutral-300">
          {t("promptLabel")}
        </label>
        <textarea
          id="music-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("promptPlaceholder")}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Genre selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("genreLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all ${
                genre === g.id
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              <span>{g.emoji}</span>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">{t("moodLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`rounded-lg px-3 py-2 text-sm transition-all ${
                mood === m.id
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* With lyrics toggle */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="font-medium text-white">{t("addLyricsHeading")}</p>
            <p className="text-sm text-neutral-400">{t("addLyricsDescription")}</p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={withLyrics}
              onChange={(e) => setWithLyrics(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-white/10 peer-checked:bg-cyan-500 transition-colors" />
            <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-5" />
          </div>
        </label>

        {withLyrics && (
          <div className="mt-4">
            <label htmlFor="lyrics" className="mb-2 block text-sm font-medium text-neutral-300">
              {t("lyricsLabel")}
            </label>
            <textarea
              id="lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={t("lyricsPlaceholder")}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        )}
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
        <div className="rounded-xl border border-white/10 bg-black/30 p-6">
          <audio src={resultUrl} controls className="w-full" />
          <StudioResultShare resultUrl={resultUrl} mediaType="audio" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/30 p-6">
          <div className="flex items-center gap-4">
            <button className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="mb-2 h-2 rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>0:00</span>
                <span>0:30</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-neutral-400">{t("resultPlaceholder")}</p>
        </div>
      )}
    </div>
  );
}
