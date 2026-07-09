import type { ReactNode } from "react";
import { STUDIO_BACKGROUND } from "@/components/studio/studio-config";

/** Full-page promo background — landing page only (/studio). */
export function StudioLandingBackground(): React.ReactElement {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: `url('${STUDIO_BACKGROUND}')`, backgroundPosition: "center -52%" }}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-black/55" />
    </>
  );
}

export function StudioLandingShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="relative min-h-[calc(100dvh-7rem)]">
      <StudioLandingBackground />
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
