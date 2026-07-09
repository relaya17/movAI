import type { ReactNode } from "react";
import { studioPanelClass } from "./studio-ui";

export function StudioPanel({ children }: { children: ReactNode }): React.ReactElement {
  return <div className={studioPanelClass}>{children}</div>;
}
