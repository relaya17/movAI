import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VideoCreator } from "@/components/studio/VideoCreator";
import { StudioPanel } from "@/components/studio/StudioPanel";
import { StudioSubNav } from "@/components/studio/StudioSubNav";
import { StudioFreeQuota } from "@/components/studio/StudioFreeQuota";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studio.tabs.video");
  return {
    title: `${t("label")} — סטודיו AI`,
    description: t("description"),
  };
}

export default function StudioVideoPage(): React.ReactElement {
  return (
    <div className="w-full py-2">
      <StudioSubNav />
      <StudioFreeQuota />
      <StudioPanel>
        <VideoCreator />
      </StudioPanel>
    </div>
  );
}
