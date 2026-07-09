import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { STUDIO_TYPES } from "./studio-config";
import { studioChooserLink } from "./studio-ui";

export async function StudioChooser(): Promise<React.ReactElement> {
  const t = await getTranslations("studio");
  const [video, music, voice] = STUDIO_TYPES;

  const renderCard = (type: (typeof STUDIO_TYPES)[number]): React.ReactElement => {
    const label = t(`tabs.${type.id}.label`);

    return (
      <Link key={type.id} href={type.href} prefetch className={studioChooserLink}>
        <span className="text-xl transition-transform group-hover:scale-110">{type.icon}</span>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-md">
      {renderCard(video)}
      {renderCard(music)}
      <div className="col-span-2 flex justify-center">
        <div className="w-full max-w-[calc(50%-0.375rem)]">{renderCard(voice)}</div>
      </div>
    </div>
  );
}
