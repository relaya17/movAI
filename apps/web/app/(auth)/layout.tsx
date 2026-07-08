import type { ReactNode } from "react";
import { AuthPageShell } from "@/components/AuthPageShell";

export default function AuthLayout({ children }: { children: ReactNode }): React.ReactElement {
  return <AuthPageShell>{children}</AuthPageShell>;
}
