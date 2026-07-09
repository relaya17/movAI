import type { ReactNode } from "react";
import { STUDIO_BACKGROUND } from "@/components/studio/studio-config";

export default function StudioLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="relative min-h-screen pb-8 pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: `url('${STUDIO_BACKGROUND}')`, backgroundPosition: "center -52%" }}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-black/55" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
