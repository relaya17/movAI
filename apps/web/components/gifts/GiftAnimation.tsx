"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";

interface GiftAnimationProps {
  emoji: string;
  name: string;
  onComplete: () => void;
}

/** Gift tier determines animation intensity */
function getGiftTier(emoji: string): "small" | "medium" | "large" | "epic" {
  const epicGifts = ["🦁", "👑", "🚀"];
  const largeGifts = ["💎", "🔥"];
  const mediumGifts = ["⭐", "❤️"];

  if (epicGifts.includes(emoji)) return "epic";
  if (largeGifts.includes(emoji)) return "large";
  if (mediumGifts.includes(emoji)) return "medium";
  return "small";
}

/** Get theme colors based on gift */
function getGiftTheme(emoji: string): { primary: string; secondary: string; glow: string } {
  const themes: Record<string, { primary: string; secondary: string; glow: string }> = {
    "🌹": { primary: "from-rose-500", secondary: "to-pink-600", glow: "rgba(244, 63, 94, 0.8)" },
    "❤️": { primary: "from-red-500", secondary: "to-rose-600", glow: "rgba(239, 68, 68, 0.8)" },
    "⭐": { primary: "from-yellow-400", secondary: "to-amber-500", glow: "rgba(251, 191, 36, 0.8)" },
    "🔥": { primary: "from-orange-500", secondary: "to-red-600", glow: "rgba(249, 115, 22, 0.8)" },
    "💎": { primary: "from-cyan-400", secondary: "to-blue-500", glow: "rgba(34, 211, 238, 0.8)" },
    "👑": { primary: "from-yellow-400", secondary: "to-amber-600", glow: "rgba(251, 191, 36, 0.9)" },
    "🚀": { primary: "from-violet-500", secondary: "to-purple-600", glow: "rgba(139, 92, 246, 0.8)" },
    "🦁": { primary: "from-amber-500", secondary: "to-orange-600", glow: "rgba(245, 158, 11, 0.9)" },
  };
  return themes[emoji] ?? { primary: "from-amber-400", secondary: "to-orange-500", glow: "rgba(251, 191, 36, 0.8)" };
}

/**
 * Dramatic TikTok-style gift animation overlay.
 * Shows the gift entering with sparkles and scaling effects.
 * Animation intensity scales with gift value.
 */
export function GiftAnimation({ emoji, name, onComplete }: GiftAnimationProps) {
  const t = useTranslations("gifts");
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const tier = useMemo(() => getGiftTier(emoji), [emoji]);
  const theme = useMemo(() => getGiftTheme(emoji), [emoji]);

  // Longer animation for bigger gifts
  const showDuration = tier === "epic" ? 3000 : tier === "large" ? 2500 : 2000;

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("show"), 100);
    const showTimer = setTimeout(() => setPhase("exit"), showDuration);
    const exitTimer = setTimeout(onComplete, showDuration + 500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete, showDuration]);

  // Number of sparkles/particles scales with tier
  const sparkleCount = tier === "epic" ? 40 : tier === "large" ? 30 : tier === "medium" ? 20 : 15;
  const burstCount = tier === "epic" ? 24 : tier === "large" ? 18 : 12;

  // Size scales with tier
  const emojiSize = tier === "epic" ? "text-[180px] sm:text-[240px]" : tier === "large" ? "text-[150px] sm:text-[200px]" : "text-[120px] sm:text-[160px]";

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* Dark overlay with gradient */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          phase === "exit" ? "opacity-0" : "opacity-100"
        } ${tier === "epic" ? "bg-black/70" : "bg-gradient-to-t from-black/60 via-transparent to-black/30"}`}
      />

      {/* Sparkles background */}
      <div className="absolute inset-0">
        {Array.from({ length: sparkleCount }, (_, i) => (
          <Sparkle key={i} delay={i * 80} phase={phase} theme={theme} tier={tier} />
        ))}
      </div>

      {/* Epic: Multiple pulsing rings */}
      {tier === "epic" && phase === "show" && (
        <>
          <div className="absolute h-[500px] w-[500px] animate-ping rounded-full border-4 border-amber-500/30" />
          <div className="absolute h-[600px] w-[600px] animate-ping rounded-full border-2 border-orange-500/20" style={{ animationDelay: "0.2s" }} />
          <div className="absolute h-[700px] w-[700px] animate-ping rounded-full border border-yellow-500/10" style={{ animationDelay: "0.4s" }} />
        </>
      )}

      {/* Radial glow - larger for bigger gifts */}
      <div
        className={`absolute rounded-full bg-gradient-to-r ${theme.primary} ${theme.secondary} blur-3xl transition-all duration-700 ${
          tier === "epic" ? "h-[500px] w-[500px]" : tier === "large" ? "h-[400px] w-[400px]" : "h-96 w-96"
        } ${
          phase === "enter"
            ? "scale-0 opacity-0"
            : phase === "show"
              ? "scale-150 opacity-40"
              : "scale-200 opacity-0"
        }`}
      />

      {/* Main gift container */}
      <div
        className={`relative flex flex-col items-center transition-all ${tier === "epic" ? "duration-1000" : "duration-700"} ${
          phase === "enter"
            ? "translate-y-[100vh] scale-50 opacity-0 rotate-180"
            : phase === "show"
              ? "translate-y-0 scale-100 opacity-100 rotate-0"
              : "-translate-y-20 scale-150 opacity-0"
        }`}
      >
        {/* Gift emoji with glow */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className={`absolute inset-0 animate-ping rounded-full bg-gradient-to-r ${theme.primary} ${theme.secondary} opacity-40 blur-xl ${
              phase === "show" ? "" : "hidden"
            }`}
            style={{ transform: "scale(2)" }}
          />

          {/* Rotating ring */}
          <div
            className={`absolute -inset-10 rounded-full border-4 border-dashed opacity-50 transition-all ${
              phase === "show" ? "animate-spin-slow" : ""
            }`}
            style={{ borderColor: theme.glow }}
          />

          {/* Second rotating ring - only for medium+ */}
          {tier !== "small" && (
            <div
              className={`absolute -inset-16 rounded-full border-2 border-dotted opacity-30 ${
                phase === "show" ? "animate-spin-reverse" : ""
              }`}
              style={{ borderColor: theme.glow }}
            />
          )}

          {/* Third rotating ring - only for epic */}
          {tier === "epic" && (
            <div
              className={`absolute -inset-24 rounded-full border border-dashed opacity-20 ${
                phase === "show" ? "animate-spin-slow" : ""
              }`}
              style={{ borderColor: theme.glow, animationDirection: "reverse" }}
            />
          )}

          {/* The gift emoji */}
          <span
            className={`relative block drop-shadow-2xl filter transition-transform duration-500 ${emojiSize} ${
              phase === "show" ? "animate-bounce-soft" : ""
            }`}
            style={{
              textShadow: `0 0 60px ${theme.glow}, 0 0 120px ${theme.glow}`,
              filter: tier === "epic" ? "drop-shadow(0 0 30px " + theme.glow + ")" : undefined,
            }}
          >
            {emoji}
          </span>
        </div>

        {/* Gift name with gradient */}
        <div
          className={`mt-8 transition-all delay-300 duration-500 ${
            phase === "show" ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <h2
            className={`bg-gradient-to-r ${theme.primary} via-white ${theme.secondary} bg-clip-text text-center font-orbitron font-bold text-transparent ${
              tier === "epic" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl"
            }`}
          >
            {name}
          </h2>
          <p className={`mt-3 text-center text-white/90 ${tier === "epic" ? "text-xl" : "text-lg"}`}>
            {tier === "epic" ? t("epicSentMessage") : t("sentMessage")}
          </p>
        </div>
      </div>

      {/* Bottom burst particles */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        {phase === "show" &&
          Array.from({ length: burstCount }, (_, i) => <BurstParticle key={i} index={i} total={burstCount} />)}
      </div>

      {/* Side bursts for epic gifts */}
      {tier === "epic" && phase === "show" && (
        <>
          <div className="absolute left-10 top-1/2 -translate-y-1/2">
            {Array.from({ length: 8 }, (_, i) => <SideBurst key={`left-${i}`} index={i} side="left" />)}
          </div>
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            {Array.from({ length: 8 }, (_, i) => <SideBurst key={`right-${i}`} index={i} side="right" />)}
          </div>
        </>
      )}
    </div>
  );
}

/** Individual sparkle particle */
function Sparkle({ 
  delay, 
  phase, 
  theme, 
  tier 
}: { 
  delay: number; 
  phase: string; 
  theme: { primary: string; secondary: string; glow: string };
  tier: "small" | "medium" | "large" | "epic";
}) {
  const [style] = useState(() => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${delay}ms`,
    fontSize: `${(tier === "epic" ? 16 : 12) + Math.random() * (tier === "epic" ? 30 : 20)}px`,
    color: theme.glow,
  }));

  if (phase === "exit") return null;

  const sparkleChars = tier === "epic" 
    ? ["✦", "✧", "★", "☆", "✴", "✵", "❋", "✺"]
    : ["✦", "✧", "★"];

  return (
    <span
      className="absolute animate-sparkle"
      style={style}
    >
      {sparkleChars[Math.floor(Math.random() * sparkleChars.length)]}
    </span>
  );
}

/** Burst particle from bottom */
function BurstParticle({ 
  index, 
  total, 
}: { 
  index: number; 
  total: number;
}) {
  const angle = (index / total) * 360;
  const distance = 150 + Math.random() * 150;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = -Math.abs(Math.sin((angle * Math.PI) / 180) * distance) - 50;

  const emojis = ["✨", "⭐", "💫", "🌟", "💥", "🎇"];

  return (
    <span
      className="absolute animate-burst text-2xl"
      style={{
        "--tx": `${x}px`,
        "--ty": `${y}px`,
        animationDelay: `${index * 30}ms`,
      } as React.CSSProperties}
    >
      {emojis[index % emojis.length]}
    </span>
  );
}

/** Side burst particles for epic gifts */
function SideBurst({ index, side }: { index: number; side: "left" | "right" }) {
  const yOffset = (index - 4) * 40;
  const xDistance = side === "left" ? -100 - Math.random() * 50 : 100 + Math.random() * 50;
  
  return (
    <span
      className="absolute animate-burst text-3xl"
      style={{
        "--tx": `${xDistance}px`,
        "--ty": `${yOffset + (Math.random() - 0.5) * 60}px`,
        animationDelay: `${index * 100}ms`,
        animationDuration: "1s",
      } as React.CSSProperties}
    >
      {["🌟", "⭐", "✨", "💫", "🎆", "🎇", "💥", "🔥"][index]}
    </span>
  );
}
