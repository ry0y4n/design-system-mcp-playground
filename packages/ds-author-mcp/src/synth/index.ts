/**
 * Compose all synthesizers into a complete DesignTokens object.
 */
import type { Brief } from "../brief.js";
import { synthesizeColors } from "./colors.js";
import { synthesizeRadius } from "./radius.js";
import { synthesizeSpacing } from "./spacing.js";
import { synthesizeTypography } from "./typography.js";
import type { DesignTokens } from "./types.js";

export const SYNTH_VERSION = "0.1.0";

export function synthesizeTokens(brief: Brief): DesignTokens {
  return {
    meta: {
      sourceBriefSlug: brief.meta.slug ?? brief.meta.name,
      sourceBriefVersion: brief.meta.version,
      generatedAt: new Date().toISOString(),
      synthVersion: SYNTH_VERSION,
    },
    color: synthesizeColors(brief),
    space: synthesizeSpacing(brief),
    radius: synthesizeRadius(brief),
    typography: synthesizeTypography(brief),
  };
}
