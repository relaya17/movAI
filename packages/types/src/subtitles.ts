import { z } from "zod";

export const SubtitleSourceSchema = z.enum(["whisper", "youtube_native", "manual"]);
export type SubtitleSource = z.infer<typeof SubtitleSourceSchema>;

export const SubtitleStatusSchema = z.enum(["pending", "processing", "ready", "failed"]);
export type SubtitleStatus = z.infer<typeof SubtitleStatusSchema>;

export const SubtitleFormatSchema = z.enum(["vtt", "srt"]);
export type SubtitleFormat = z.infer<typeof SubtitleFormatSchema>;

export interface MovieSubtitleTrack {
  id: string;
  movieId: string;
  language: string;
  format: SubtitleFormat;
  source: SubtitleSource;
  status: SubtitleStatus;
  content: string | null;
  errorMessage: string | null;
  createdAt: Date;
}
