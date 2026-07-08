import Image from "next/image";
import type { ReactNode } from "react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const AUTH_BACKGROUND_IMAGE =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468288/kino-xl_3dnoir_1.1_moody_atmosphere_1.1_a_cinematic_photo_of_Create_a_futuristic_cinemat-0_wywut6.jpg";

/** Full-viewport cinematic backdrop shared by /sign-in and /sign-up only. */
export function AuthPageShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="relative isolate min-h-[100dvh] w-full">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src={optimizeCloudinaryUrl(AUTH_BACKGROUND_IMAGE, 1920)}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/15" />
      </div>

      <div className="absolute end-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
