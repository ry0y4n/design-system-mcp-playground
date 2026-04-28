import type { Brief } from "../brief.js";
import type { TypographyToken, TypographyTokens } from "./types.js";

const FONT_STACKS: Record<NonNullable<Brief["brand"]["typography"]>["fontStackPreference"] & string, string> = {
  "geometric-sans":
    "'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif",
  "humanist-sans":
    "'Source Sans 3', 'Open Sans', system-ui, sans-serif",
  "neo-grotesque":
    "'Helvetica Neue', 'Arial', system-ui, sans-serif",
  serif: "'Source Serif 4', 'Georgia', serif",
  system:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
};

export function fontStackFor(brief: Brief): string {
  const pref = brief.brand.typography?.fontStackPreference ?? "system";
  return FONT_STACKS[pref];
}

export function synthesizeTypography(brief: Brief): TypographyTokens {
  const ratio = brief.brand.typography?.scaleRatio ?? 1.25;
  const base = 16; // px

  const at = (steps: number, weight: number): TypographyToken => {
    const fs = base * Math.pow(ratio, steps);
    const fsPx = Math.round(fs * 100) / 100;
    const lh = steps >= 2 ? 1.25 : 1.5;
    return {
      fontSize: `${fsPx}px`,
      lineHeight: String(lh),
      fontWeight: weight,
    };
  };

  return {
    body: at(0, 400),
    bodySmall: at(-1, 400),
    caption: at(-2, 400),
    heading3: at(1, 600),
    heading2: at(2, 700),
    heading1: at(3, 700),
  };
}
