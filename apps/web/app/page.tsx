import { AuthButtons } from "@/components/AuthButtons";
import { HeroPromo } from "@/components/HeroPromo";

/** Landing splash only — no server auth round-trip so first paint stays fast. */
export default function HomePage(): React.ReactElement {
  return <HeroPromo authButtons={<AuthButtons />} />;
}
