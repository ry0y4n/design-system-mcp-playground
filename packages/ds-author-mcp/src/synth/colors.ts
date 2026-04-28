/**
 * Deterministic color token synthesis.
 *
 * Given a Brand Brief, produces a complete light+dark color role matrix that
 * (by construction) satisfies the WCAG role-pair contrast targets in
 * plan.md §5.7. No LLM involvement; same input → same output.
 *
 * Strategy:
 *  - Start from the brand `primarySeed` in OKLCH.
 *  - Pick fixed L values for foundational roles (background / text / border / etc.)
 *    in both modes. Neutral hue is biased per `neutralBase` (cool/neutral/warm).
 *  - For brand-derived roles, preserve hue from seed; adjust L (and chroma if
 *    needed) until the role's contrast target is met.
 *  - For semantic colors (danger / success / focus), pick canonical hues and
 *    again clamp L for contrast.
 */
import type { Brief } from "../brief.js";
import {
  adjustForContrast,
  clampToGamut,
  contrast,
  hexToOklch,
  oklchToHex,
  pickReadableForeground,
  withChroma,
  withLightness,
  type OKLCH,
} from "../util/color.js";
import type { ColorRolePair, ColorTokens } from "./types.js";

const NEUTRAL_HUE: Record<NonNullable<Brief["brand"]["colors"]["neutralBase"]>, number> = {
  cool: 240,
  neutral: 270,
  warm: 30,
};

const NEUTRAL_CHROMA = 0.005; // very faint tint

interface NeutralPalette {
  bgBase: string;
  bgSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  borderDefault: string;
  borderSubtle: string;
}

function neutralOklch(hue: number, l: number): OKLCH {
  return { l, c: NEUTRAL_CHROMA, h: hue };
}

function buildNeutrals(hue: number, mode: "light" | "dark"): NeutralPalette {
  if (mode === "light") {
    return {
      bgBase: oklchToHex(neutralOklch(hue, 0.99)),
      bgSubtle: oklchToHex(neutralOklch(hue, 0.965)),
      textPrimary: oklchToHex(neutralOklch(hue, 0.18)),
      textSecondary: oklchToHex(neutralOklch(hue, 0.42)),
      // Disabled text only needs 3:1 (large text); we use 0.6 lightness on white.
      textDisabled: oklchToHex(neutralOklch(hue, 0.6)),
      borderDefault: oklchToHex(neutralOklch(hue, 0.62)),
      borderSubtle: oklchToHex(neutralOklch(hue, 0.88)),
    };
  }
  return {
    bgBase: oklchToHex(neutralOklch(hue, 0.13)),
    bgSubtle: oklchToHex(neutralOklch(hue, 0.18)),
    textPrimary: oklchToHex(neutralOklch(hue, 0.96)),
    textSecondary: oklchToHex(neutralOklch(hue, 0.74)),
    textDisabled: oklchToHex(neutralOklch(hue, 0.52)),
    borderDefault: oklchToHex(neutralOklch(hue, 0.50)),
    borderSubtle: oklchToHex(neutralOklch(hue, 0.30)),
  };
}

/**
 * Derive a brand color whose contrast vs background.base reaches the UI-component
 * target (3:1). Keeps the hue of the seed; adjusts L outwards from the background.
 */
function brandPrimary(seed: OKLCH, bgHex: string, target = 3.5): string {
  const seedHex = oklchToHex(seed);
  const seedRatio = contrast(seedHex, bgHex);
  if (seedRatio >= target) return seedHex;
  // Background is light → make brand darker. Background is dark → make brand lighter.
  const bgL = hexToOklch(bgHex).l;
  const direction = bgL > 0.5 ? "darker" : "lighter";
  return adjustForContrast(seed, bgHex, target, direction);
}

/** Light-mode hover/active: darker by ~0.05 L. Dark-mode: lighter by ~0.05. */
function nudgePrimary(hex: string, mode: "light" | "dark", deltaL: number): string {
  const o = hexToOklch(hex);
  const sign = mode === "light" ? -1 : +1;
  return oklchToHex(withLightness(o, o.l + sign * deltaL));
}

function brandSubtle(seedHue: number, mode: "light" | "dark"): string {
  return mode === "light"
    ? oklchToHex(clampToGamut({ l: 0.95, c: 0.04, h: seedHue }))
    : oklchToHex(clampToGamut({ l: 0.27, c: 0.04, h: seedHue }));
}

const SEMANTIC_HUE = { danger: 25, success: 145 };

function semanticColor(role: keyof typeof SEMANTIC_HUE, mode: "light" | "dark", bgHex: string): string {
  const baseL = mode === "light" ? 0.55 : 0.7;
  const baseC = 0.16;
  const oklch = clampToGamut({ l: baseL, c: baseC, h: SEMANTIC_HUE[role] });
  // Ensure 3:1 against bg
  const hex = oklchToHex(oklch);
  if (contrast(hex, bgHex) >= 3.0) return hex;
  const direction = mode === "light" ? "darker" : "lighter";
  return adjustForContrast(oklch, bgHex, 3.0, direction);
}

function focusRing(seed: OKLCH, mode: "light" | "dark", bgHex: string): string {
  // High-chroma, high-visibility ring derived from brand hue.
  const target = mode === "light" ? { l: 0.55, c: 0.18, h: seed.h } : { l: 0.78, c: 0.16, h: seed.h };
  const hex = oklchToHex(clampToGamut(target));
  if (contrast(hex, bgHex) >= 3.0) return hex;
  return adjustForContrast(target, bgHex, 3.0, mode === "light" ? "darker" : "lighter");
}

export function synthesizeColors(brief: Brief): ColorTokens {
  const neutralKey = brief.brand.colors.neutralBase ?? "neutral";
  const hue = NEUTRAL_HUE[neutralKey];
  const seed = hexToOklch(brief.brand.colors.primarySeed);

  const lightN = buildNeutrals(hue, "light");
  const darkN = buildNeutrals(hue, "dark");

  const brandPrimaryLight = brandPrimary(seed, lightN.bgBase);
  const brandPrimaryDark = brandPrimary(seed, darkN.bgBase);

  const onBrandLight = pickReadableForeground(brandPrimaryLight);
  const onBrandDark = pickReadableForeground(brandPrimaryDark);

  const pair = (l: string, d: string): ColorRolePair => ({ light: l, dark: d });

  return {
    background: {
      base: pair(lightN.bgBase, darkN.bgBase),
      subtle: pair(lightN.bgSubtle, darkN.bgSubtle),
    },
    text: {
      primary: pair(lightN.textPrimary, darkN.textPrimary),
      secondary: pair(lightN.textSecondary, darkN.textSecondary),
      disabled: pair(lightN.textDisabled, darkN.textDisabled),
      onBrand: pair(onBrandLight, onBrandDark),
    },
    border: {
      default: pair(lightN.borderDefault, darkN.borderDefault),
      subtle: pair(lightN.borderSubtle, darkN.borderSubtle),
    },
    brand: {
      primary: pair(brandPrimaryLight, brandPrimaryDark),
      primaryHover: pair(
        nudgePrimary(brandPrimaryLight, "light", 0.05),
        nudgePrimary(brandPrimaryDark, "dark", 0.05)
      ),
      primaryActive: pair(
        nudgePrimary(brandPrimaryLight, "light", 0.1),
        nudgePrimary(brandPrimaryDark, "dark", 0.1)
      ),
      primarySubtle: pair(brandSubtle(seed.h, "light"), brandSubtle(seed.h, "dark")),
    },
    semantic: {
      danger: pair(
        semanticColor("danger", "light", lightN.bgBase),
        semanticColor("danger", "dark", darkN.bgBase)
      ),
      success: pair(
        semanticColor("success", "light", lightN.bgBase),
        semanticColor("success", "dark", darkN.bgBase)
      ),
    },
    focus: {
      ring: pair(focusRing(seed, "light", lightN.bgBase), focusRing(seed, "dark", darkN.bgBase)),
    },
  };
}
