import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MusicCreator } from "@/components/studio/MusicCreator";
import { StudioSubNav } from "@/components/studio/StudioSubNav";
import { StudioFreeQuota } from "@/components/studio/StudioFreeQuota";
import { StudioCreationShell } from "@/components/studio/StudioGlassShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studio.tabs.music");
  return {
    title: `${t("label")} — סטודיו AI`,
    description: t("description"),
  };
}

export default function StudioMusicPage(): React.ReactElement {
  return (
    <StudioCreationShell>
      <StudioSubNav />
      <StudioFreeQuota />
      <MusicCreator />
    </StudioCreationShell>
  );
}
