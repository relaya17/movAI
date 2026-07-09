import type { ReactNode } from "react";

export default function StudioLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="relative min-h-screen pb-8 pt-20">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
