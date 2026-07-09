import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ImageCreator } from "@/components/studio/ImageCreator";
import { StudioSubNav } from "@/components/studio/StudioSubNav";
import { StudioFreeQuota } from "@/components/studio/StudioFreeQuota";
import { StudioCreationShell } from "@/components/studio/StudioGlassShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studio.tabs.image");
  return {
    title: `${t("label")} — סטודיו AI`,
    description: t("description"),
  };
}

export default function StudioImagePage(): React.ReactElement {
  return (
    <StudioCreationShell>
      <StudioSubNav />
      <StudioFreeQuota />
      <ImageCreator />
    </StudioCreationShell>
  );
}
