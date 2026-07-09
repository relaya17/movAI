export const STUDIO_BACKGROUND =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783618062/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_ob1xlt.jpg";

export const STUDIO_TYPES = [
  { id: "video", href: "/studio/video", icon: "🎬" },
  { id: "music", href: "/studio/music", icon: "🎵" },
  { id: "voice", href: "/studio/voice", icon: "🎤" },
] as const;

export type StudioTypeId = (typeof STUDIO_TYPES)[number]["id"];
