import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreationGallery } from "@/components/studio/CreationGallery";
import { StudioSubNav } from "@/components/studio/StudioSubNav";
import { StudioCreationShell } from "@/components/studio/StudioGlassShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studio.gallery");
  return {
    title: `${t("title")} — סטודיו AI`,
    description: t("subtitle")
  };
}

export default function StudioGalleryPage(): React.ReactElement {
  return (
    <StudioCreationShell>
      <StudioSubNav />
      <CreationGallery />
    </StudioCreationShell>
  );
}
