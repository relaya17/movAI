"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { STUDIO_TYPES } from "./studio-config";
import { studioNavLinkActive, studioNavLinkBase, studioNavLinkIdle } from "./studio-ui";

export function StudioSubNav(): React.ReactElement {
  const pathname = usePathname();
  const t = useTranslations("studio");

  return (
    <nav aria-label={t("navLabel")} className="mb-6 w-full text-center">
      <Link
        href="/studio"
        prefetch
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-cyan-400"
      >
        <span aria-hidden="true">←</span>
        {t("backToStudio")}
      </Link>

      <div className="flex flex-wrap justify-center gap-2">
        {STUDIO_TYPES.map((type) => {
          const isActive = pathname === type.href;
          const label = t(`tabs.${type.id}.label`);

          return (
            <Link
              key={type.id}
              href={type.href}
              prefetch
              aria-current={isActive ? "page" : undefined}
              className={`${studioNavLinkBase} ${isActive ? studioNavLinkActive : studioNavLinkIdle}`}
            >
              <span aria-hidden="true">{type.icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
