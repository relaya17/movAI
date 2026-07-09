import { unstable_cache } from "next/cache";
import type { ContentType, PublicMovie } from "@movai/types";
import { listMovies as listMoviesFromDb, getMovieBySlug as getMovieBySlugFromDb } from "@movai/db";
import { db } from "@/lib/db";

const CATALOG_REVALIDATE_SECONDS = 300;

const cachedListMovies = unstable_cache(
  async (limit: number) => listMoviesFromDb(db, { limit, contentType: "movie" }),
  ["catalog-movies"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog"] }
);

const cachedListByType = unstable_cache(
  async (contentType: Exclude<ContentType, "movie">, limit: number) =>
    listMoviesFromDb(db, { limit, contentType }),
  ["catalog-by-type"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog"] }
);

/**
 * Real data layer, backed by the same Postgres catalog the ingestion
 * pipeline (apps/api/src/worker.ts - daily Archive.org/YouTube crawl +
 * TMDB enrichment) writes into via @movai/db's movies repository. This
 * used to return a fixed 9-title mock array regardless of what had
 * actually been ingested - MOCK_MOVIES below is kept only as the fallback
 * shown when the real catalog is empty (e.g. a fresh local dev environment
 * before the worker process has run its first ingestion), so the browse
 * page never looks broken/empty instead of silently lying about what's in
 * the database.
 */
const MOCK_MOVIES: PublicMovie[] = [
  {
    id: "8f14e45f-ceea-467e-9575-000000000001",
    slug: "night-of-the-living-dead-1968",
    title: "Night of the Living Dead",
    year: 1968,
    genres: ["Horror", "Thriller"],
    synopsis:
      "הקלאסיקה שהמציאה מחדש את ז'אנר הזומבים המודרני. חוקי לצפייה חופשית כי זכויות היוצרים מעולם לא חודשו.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "night_of_the_living_dead",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000002",
    slug: "his-girl-friday-1940",
    title: "His Girl Friday",
    year: 1940,
    genres: ["Comedy", "Romance"],
    synopsis: "קומדיית עיתונאים מהירת קצב, בנחלת הכלל וחוקית לחלוטין לצפייה.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "his_girl_friday",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000003",
    slug: "detour-1945",
    title: "Detour",
    year: 1945,
    genres: ["Thriller", "Crime"],
    synopsis: "נואר אפל וקלאוסטרופובי על נהג טרמפים שנקלע לרצח - יהלום מוכר בנחלת הכלל.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "detour_1945",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000004",
    slug: "doa-1950",
    title: "D.O.A.",
    year: 1950,
    genres: ["Thriller", "Crime"],
    synopsis: "אדם שהורעל למוות מנסה לגלות מי רצח אותו, לפני שהזמן שלו אוזל. מותחן פשע קלאסי.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "doa_1950",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000005",
    slug: "the-hitch-hiker-1953",
    title: "The Hitch-Hiker",
    year: 1953,
    genres: ["Crime", "Thriller"],
    synopsis: "שני דייגים נלקחים בני ערובה על ידי רוצח סדרתי בדרך צלב מדבר. מתח פשע מהודק.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "the_hitch_hiker_1953",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000006",
    slug: "nanook-of-the-north-1922",
    title: "Nanook of the North",
    year: 1922,
    genres: ["Documentary", "History"],
    synopsis: "אחד הסרטים התיעודיים הראשונים בהיסטוריית הקולנוע - מסע היסטורי ומעשיר אל חיי האינואיטים.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "nanook_of_the_north",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000007",
    slug: "a-trip-to-the-moon-1902",
    title: "A Trip to the Moon",
    year: 1902,
    genres: ["Documentary", "History"],
    synopsis: "אבן דרך היסטורית בתולדות הקולנוע והמדע הבדיוני - צפייה חינוכית ומרתקת כאחד.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "a_trip_to_the_moon",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000008",
    slug: "the-dybbuk-1937",
    title: "The Dybbuk",
    year: 1937,
    genres: ["Jewish", "Drama"],
    synopsis: "קלאסיקת קולנוע יידיש אודות אהבה, קבלה ודיבוק - יצירת מופת של תרבות יהודית מזרח-אירופית.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "the_dybbuk_1937",
      license: "public-domain"
    },
    linkStatus: "active"
  },
  {
    id: "8f14e45f-ceea-467e-9575-000000000009",
    slug: "the-39-steps-1935",
    title: "The 39 Steps",
    year: 1935,
    genres: ["British", "Thriller"],
    synopsis: "מותחן ריגול בריטי קלאסי מבימויו של אלפרד היצ'קוק - קולנוע אירופאי בהשראתו של מאסטר המתח.",
    contentType: "movie",
    watchSource: {
      kind: "archive",
      identifier: "the_39_steps_1935",
      license: "public-domain"
    },
    linkStatus: "active"
  }
];

// Same fallback-when-empty pattern as MOCK_MOVIES above, one small set per
// browse category - these used to be the *only* content standup/music/
// singing ever showed (hardcoded directly in browse/page.tsx with no real
// backing data at all). Now that worker.ts actually ingests these
// categories from YouTube (see packages/queue/src/catalog-queries.ts),
// real rows take over the moment the daily sweep has run once; until then
// the browse page still shows something instead of an empty section.
// watchSource is "external-link" (not a fabricated YouTube video id) since
// unlike MOCK_MOVIES's real, licensed public-domain titles, these have no
// real video behind them - an honest "not really playable" placeholder
// beats a fake video id that would 404 inside an embedded player.
const MOCK_CONTENT_BY_TYPE: Record<Exclude<ContentType, "movie">, PublicMovie[]> = {
  standup: [
    {
      id: "8f14e45f-ceea-467e-9575-000000000101",
      slug: "demo-standup-1",
      title: "מופע קומדיה חי",
      year: new Date().getFullYear(),
      genres: ["קומדיה"],
      synopsis: "דמו - יוצג תוכן אמיתי לאחר ריצת הליקוט היומי הראשונה.",
      contentType: "standup",
      watchSource: { kind: "external-link", provider: "other", url: "https://example.com" },
      linkStatus: "active"
    },
    {
      id: "8f14e45f-ceea-467e-9575-000000000102",
      slug: "demo-standup-2",
      title: "צחוקים מהלב",
      year: new Date().getFullYear(),
      genres: ["קומדיה"],
      synopsis: "דמו - יוצג תוכן אמיתי לאחר ריצת הליקוט היומי הראשונה.",
      contentType: "standup",
      watchSource: { kind: "external-link", provider: "other", url: "https://example.com" },
      linkStatus: "active"
    }
  ],
  music: [
    {
      id: "8f14e45f-ceea-467e-9575-000000000103",
      slug: "demo-music-1",
      title: "אקוסטי בלילה",
      year: new Date().getFullYear(),
      genres: ["מוזיקה"],
      synopsis: "דמו - יוצג תוכן אמיתי לאחר ריצת הליקוט היומי הראשונה.",
      contentType: "music",
      watchSource: { kind: "external-link", provider: "other", url: "https://example.com" },
      linkStatus: "active"
    },
    {
      id: "8f14e45f-ceea-467e-9575-000000000104",
      slug: "demo-music-2",
      title: "ג׳אז מודרני",
      year: new Date().getFullYear(),
      genres: ["מוזיקה"],
      synopsis: "דמו - יוצג תוכן אמיתי לאחר ריצת הליקוט היומי הראשונה.",
      contentType: "music",
      watchSource: { kind: "external-link", provider: "other", url: "https://example.com" },
      linkStatus: "active"
    }
  ],
  singing: [
    {
      id: "8f14e45f-ceea-467e-9575-000000000105",
      slug: "demo-singing-1",
      title: "קאבר מרגש",
      year: new Date().getFullYear(),
      genres: ["שירה"],
      synopsis: "דמו - יוצג תוכן אמיתי לאחר ריצת הליקוט היומי הראשונה.",
      contentType: "singing",
      watchSource: { kind: "external-link", provider: "other", url: "https://example.com" },
      linkStatus: "active"
    },
    {
      id: "8f14e45f-ceea-467e-9575-000000000106",
      slug: "demo-singing-2",
      title: "שיר מקורי",
      year: new Date().getFullYear(),
      genres: ["שירה"],
      synopsis: "דמו - יוצג תוכן אמיתי לאחר ריצת הליקוט היומי הראשונה.",
      contentType: "singing",
      watchSource: { kind: "external-link", provider: "other", url: "https://example.com" },
      linkStatus: "active"
    }
  ]
};

export async function listMovies(limit = 100): Promise<PublicMovie[]> {
  try {
    const realMovies = await cachedListMovies(limit);
    return realMovies.length > 0 ? realMovies : MOCK_MOVIES;
  } catch {
    // Build / local-dev without Postgres - fall back to the mock catalog so
    // generateStaticParams and browse pages still succeed.
    return MOCK_MOVIES;
  }
}

/** standup/music/singing browse categories - same real-catalog-first, mock-fallback pattern as listMovies(). */
export async function listContentByType(contentType: Exclude<ContentType, "movie">, limit = 20): Promise<PublicMovie[]> {
  try {
    const realItems = await cachedListByType(contentType, limit);
    return realItems.length > 0 ? realItems : MOCK_CONTENT_BY_TYPE[contentType];
  } catch {
    return MOCK_CONTENT_BY_TYPE[contentType];
  }
}

export async function getMovieBySlug(slug: string): Promise<PublicMovie | undefined> {
  try {
    const realMovie = await getMovieBySlugFromDb(db, slug);
    if (realMovie) return realMovie;
  } catch {
    // Fall through to mock catalog below.
  }
  // A mock-catalog slug (used when the real catalog is still empty) - see
  // listMovies() above for why MOCK_MOVIES exists at all.
  return (
    MOCK_MOVIES.find((movie) => movie.slug === slug) ??
    Object.values(MOCK_CONTENT_BY_TYPE)
      .flat()
      .find((item) => item.slug === slug)
  );
}
