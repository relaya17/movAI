import tokens from "./tokens.json" with { type: "json" };

/**
 * Single source of truth for brand colors/spacing/radius (architecture plan
 * §16.1). apps/web's tailwind.config.ts currently hardcodes a copy of the
 * brand color scale for MVP speed - wiring it through this package instead
 * is a Phase 4 polish item so a rebrand is a one-line change, not a grep.
 */
export const designTokens = tokens;
