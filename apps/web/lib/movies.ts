import type { PublicMovie } from "@movai/types";

/**
 * Placeholder data layer. In Phase 1 this calls the NestJS API
 * (apps/api) via the generated type-safe client instead of returning
 * fixtures - kept as static data for now so the frontend is runnable and
 * demoable without the backend + DB provisioned yet.
 *
 * Genres are tagged deliberately so the home page can group titles into
 * Netflix-style category rows (see components/CategoryRow.tsx). Only
 * genuinely public-domain / legally-free titles are used - no fabricated
 * licensing claims.
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
    watchSource: {
      kind: "archive",
      identifier: "the_39_steps_1935",
      license: "public-domain"
    },
    linkStatus: "active"
  }
];

export async function listMovies(): Promise<PublicMovie[]> {
  return MOCK_MOVIES;
}

export async function getMovieBySlug(slug: string): Promise<PublicMovie | undefined> {
  return MOCK_MOVIES.find((movie) => movie.slug === slug);
}
