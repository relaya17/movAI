import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrowseHero } from "@/components/dashboard/BrowseHero";
import { ContentGrid } from "@/components/dashboard/ContentGrid";
import { RealUploadsSection } from "@/components/dashboard/RealUploadsSection";

export const metadata: Metadata = {
  title: "גלה תוכן",
};

// Titles are translated at render time (see CATEGORY_IDS below) - only the
// demo catalog items (mock movie/creator names) stay Hebrew-only for now,
// since they're placeholder content rather than UI chrome.
const CATEGORY_ITEMS = [
  {
    id: "movies",
    items: [
      { id: "1", title: "לילה של המתים החיים", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468294/kino-xl_a_cinematic_photo_of_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-p-0_kykzup.jpg", creator: "George Romero", views: 12500, gifts: 340 },
      { id: "2", title: "סידנה שלו", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468288/kino-xl_3dnoir_1.1_moody_atmosphere_1.1_a_cinematic_photo_of_Create_a_futuristic_cinemat-0_wywut6.jpg", creator: "Alfred Hitchcock", views: 8900, gifts: 210 },
      { id: "3", title: "מטרופוליס", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg", creator: "Fritz Lang", views: 15600, gifts: 520 },
      { id: "4", title: "הפנטומה של האופרה", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468294/kino-xl_a_cinematic_photo_of_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-p-0_kykzup.jpg", creator: "Rupert Julian", views: 6300, gifts: 150 },
    ],
  },
  {
    id: "standup",
    items: [
      { id: "5", title: "מופע קומדיה חי", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468288/kino-xl_3dnoir_1.1_moody_atmosphere_1.1_a_cinematic_photo_of_Create_a_futuristic_cinemat-0_wywut6.jpg", creator: "יוצר מתחיל", views: 2300, gifts: 89 },
      { id: "6", title: "צחוקים מהלב", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg", creator: "קומיקאי חדש", views: 1800, gifts: 45 },
    ],
  },
  {
    id: "music",
    items: [
      { id: "7", title: "אקוסטי בלילה", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468294/kino-xl_a_cinematic_photo_of_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-p-0_kykzup.jpg", creator: "מוזיקאי עצמאי", views: 4500, gifts: 230 },
      { id: "8", title: "ג׳אז מודרני", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468288/kino-xl_3dnoir_1.1_moody_atmosphere_1.1_a_cinematic_photo_of_Create_a_futuristic_cinemat-0_wywut6.jpg", creator: "הרכב ג׳אז", views: 3200, gifts: 178 },
    ],
  },
  {
    id: "singing",
    items: [
      { id: "9", title: "קאבר מרגש", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg", creator: "זמרת צעירה", views: 7800, gifts: 410 },
      { id: "10", title: "שיר מקורי", thumbnail: "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468294/kino-xl_a_cinematic_photo_of_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-p-0_kykzup.jpg", creator: "יוצר חדש", views: 1200, gifts: 67 },
    ],
  },
];

interface BrowsePageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps): Promise<React.ReactElement> {
  const { category } = await searchParams;
  const tBrowse = await getTranslations("browse.categoryPills");
  const tContent = await getTranslations("contentTypes");

  const CATEGORY_TITLES: Record<string, string> = {
    movies: tBrowse("movies"),
    standup: tContent("standup"),
    music: tContent("music"),
    singing: tContent("singing")
  };
  const CATEGORIES = CATEGORY_ITEMS.map((entry) => ({ ...entry, title: CATEGORY_TITLES[entry.id] ?? entry.id }));

  const isKnownCategory = CATEGORIES.some((entry) => entry.id === category);
  const activeCategory = isKnownCategory && category ? category : "all";
  const visibleCategories = activeCategory === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <>
      <BrowseHero activeCategory={activeCategory} />
      <div className="mt-10 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          {activeCategory === "all" && <RealUploadsSection />}
          {visibleCategories.map((category) => (
            <ContentGrid key={category.id} id={category.id} title={category.title} items={category.items} />
          ))}
        </div>
      </div>
    </>
  );
}
