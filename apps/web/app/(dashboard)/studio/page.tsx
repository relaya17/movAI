import type { Metadata } from "next";
import { StudioChooser } from "@/components/studio/StudioChooser";
import { StudioHeroTitle } from "@/components/studio/StudioHeroTitle";
import { StudioFreeQuota } from "@/components/studio/StudioFreeQuota";

export const metadata: Metadata = {
  title: "סטודיו AI",
  description: "צרו וידאו, מוזיקה ושירה באמצעות בינה מלאכותית",
};

export default function StudioPage(): React.ReactElement {
  return (
    <div className="flex w-full min-h-[calc(100dvh-7rem)] flex-col items-center">
      <StudioHeroTitle />
      <div className="mt-auto flex w-full flex-col items-center justify-center pb-4">
        <StudioFreeQuota />
        <StudioChooser />
      </div>
    </div>
  );
}
