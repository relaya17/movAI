import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MusicCreator } from "@/components/studio/MusicCreator";
import { StudioPanel } from "@/components/studio/StudioPanel";
import { StudioSubNav } from "@/components/studio/StudioSubNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studio.tabs.music");
  return {
    title: `${t("label")} — סטודיו AI`,
    description: t("description"),
  };
}

export default function StudioMusicPage(): React.ReactElement {
  return (
    <div className="w-full py-2">
      <StudioSubNav />
      <StudioPanel>
        <MusicCreator />
      </StudioPanel>
    </div>
  );
}
