import type { ReactNode } from "react";
import { STUDIO_BACKGROUND } from "./studio-config";

/** Frosted glass card — needs visual content behind it to show the blur. */
export function StudioGlassShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-neutral-900/55 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6">
      {children}
    </div>
  );
}

/** Sub-page wrapper: muted promo image + neutral dark veil + glass form on top. */
export function StudioCreationShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="relative w-full py-2">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat brightness-[0.45] saturate-[0.55]"
          style={{ backgroundImage: `url('${STUDIO_BACKGROUND}')`, backgroundPosition: "center 35%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/92 via-neutral-950/88 to-black/95" />
      </div>

      <div className="relative z-10">
        <StudioGlassShell>{children}</StudioGlassShell>
      </div>
    </div>
  );
}
