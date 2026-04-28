import type { Brief } from "../brief.js";
import type { RadiusTokens } from "./types.js";

const SCALES: Record<NonNullable<Brief["brand"]["radiusScale"]>, RadiusTokens> = {
  sharp: { none: "0", sm: "2px", md: "4px", lg: "8px", full: "9999px" },
  soft: { none: "0", sm: "4px", md: "8px", lg: "12px", full: "9999px" },
  round: { none: "0", sm: "8px", md: "16px", lg: "24px", full: "9999px" },
};

export function synthesizeRadius(brief: Brief): RadiusTokens {
  return SCALES[brief.brand.radiusScale ?? "soft"];
}
