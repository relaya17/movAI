import type { PublicMovie } from "@movai/types";

/** Fixed dimension — matches pgvector migration target when enabled. */
export const EMBEDDING_DIMENSIONS = 384;

const HEBREW_GENRE_ALIASES: Record<string, string> = {
  דרמה: "drama",
  קומדיה: "comedy",
  אקשן: "action",
  מדע: "sci-fi",
  "מדע בדיוני": "sci-fi",
  אימה: "horror",
  רומנטי: "romance",
  מותחן: "thriller",
  פשע: "crime",
  הרפתקאות: "adventure",
  פנטזיה: "fantasy",
  מלחמה: "war",
  וסטן: "western",
  דוקומנטרי: "documentary",
  אנימציה: "animation",
  משפחה: "family",
  מוזיקה: "music",
  היסטוריה: "history"
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

/** Deterministic local embedding — no external API; good enough for MVP semantic ranking. */
export function embedText(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vector = new Array<number>(dimensions).fill(0);

  for (const token of tokenize(text)) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    const index = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] = (vector[index] ?? 0) + sign;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

export function buildMovieEmbeddingText(movie: Pick<PublicMovie, "title" | "synopsis" | "genres" | "year">): string {
  const genres = movie.genres.map((genre) => HEBREW_GENRE_ALIASES[genre] ?? genre).join(", ");
  return `${movie.title}. ${genres}. ${movie.year}. ${movie.synopsis}`;
}

export interface ConciergeFilters {
  genres: string[];
  yearFrom?: number | undefined;
  yearTo?: number | undefined;
  keywords: string[];
}

/** Rule-based NL query parser (Hebrew + English) — used when no LLM key is set. */
export function parseConciergeQuery(query: string): ConciergeFilters {
  const normalized = query.trim().toLowerCase();
  const genres: string[] = [];
  const keywords: string[] = [];

  for (const [hebrew, english] of Object.entries(HEBREW_GENRE_ALIASES)) {
    if (normalized.includes(hebrew) || normalized.includes(english)) {
      genres.push(english);
    }
  }

  const decadeMatch = normalized.match(/(?:שנות|from|ב)?\s*(\d{4})s?/u) ?? normalized.match(/(\d{4})/u);
  let yearFrom: number | undefined;
  let yearTo: number | undefined;

  const HEBREW_DECADES: Record<string, number> = {
    "השישים": 1960,
    "שישים": 1960,
    "השבעים": 1970,
    "שבעים": 1970,
    "השמונים": 1980,
    "שמונים": 1980,
    "התשעים": 1990,
    "תשעים": 1990
  };

  for (const [word, start] of Object.entries(HEBREW_DECADES)) {
    if (normalized.includes(word)) {
      yearFrom = start;
      yearTo = start + 9;
      break;
    }
  }

  if (!yearFrom && decadeMatch?.[1]) {
    const year = Number.parseInt(decadeMatch[1], 10);
    if (year >= 1900 && year <= 2030) {
      if (normalized.includes("s") || normalized.includes("שנות")) {
        yearFrom = year;
        yearTo = year + 9;
      } else {
        yearFrom = year - 2;
        yearTo = year + 2;
      }
    }
  }

  for (const token of tokenize(normalized)) {
    if (token.length > 2 && !genres.includes(token)) {
      keywords.push(token);
    }
  }

  return { genres, yearFrom, yearTo, keywords };
}
