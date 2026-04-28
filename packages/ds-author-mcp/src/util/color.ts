/**
 * Color math helpers built on culori (OKLCH).
 *
 * We use OKLCH because:
 *  - Lightness (L) is perceptually uniform → "make this 20% lighter" actually works.
 *  - Chroma is decoupled from L, so we can tune saturation without shifting brightness.
 *  - WCAG contrast still relies on sRGB relative luminance, so we convert when needed.
 */
import { converter, formatHex, parse, wcagContrast } from "culori";

const toOklch = converter("oklch");
const toRgb = converter("rgb");

export interface OKLCH {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // 0..360 (degrees)
  alpha?: number;
}

export function hexToOklch(hex: string): OKLCH {
  const parsed = parse(hex);
  if (!parsed) throw new Error(`Invalid color: ${hex}`);
  const o = toOklch(parsed);
  if (!o) throw new Error(`Cannot convert to OKLCH: ${hex}`);
  return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0, alpha: o.alpha };
}

export function oklchToHex({ l, c, h, alpha }: OKLCH): string {
  const rgb = toRgb({ mode: "oklch", l, c, h, alpha });
  if (!rgb) throw new Error(`Cannot convert OKLCH to hex: ${l},${c},${h}`);
  return formatHex(rgb)!;
}

/** Set lightness while preserving chroma+hue. Clamps to in-gamut sRGB. */
export function withLightness(base: OKLCH, l: number): OKLCH {
  return clampToGamut({ ...base, l: Math.max(0, Math.min(1, l)) });
}

/** Multiply chroma (saturation in OKLCH terms). */
export function withChroma(base: OKLCH, c: number): OKLCH {
  return clampToGamut({ ...base, c: Math.max(0, c) });
}

/** Reduce chroma until the color is in-gamut sRGB at the given L. */
export function clampToGamut(c: OKLCH): OKLCH {
  let cur = { ...c };
  for (let i = 0; i < 30; i++) {
    const rgb = toRgb({ mode: "oklch", ...cur });
    if (
      rgb &&
      rgb.r !== undefined &&
      rgb.g !== undefined &&
      rgb.b !== undefined &&
      rgb.r >= 0 &&
      rgb.r <= 1 &&
      rgb.g >= 0 &&
      rgb.g <= 1 &&
      rgb.b >= 0 &&
      rgb.b <= 1
    ) {
      return cur;
    }
    cur.c *= 0.92;
  }
  return cur;
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrast(hexA: string, hexB: string): number {
  return wcagContrast(hexA, hexB);
}

/** Returns "#000000" or "#ffffff" — whichever has better contrast against bg. */
export function pickReadableForeground(bgHex: string): string {
  const cBlack = contrast(bgHex, "#000000");
  const cWhite = contrast(bgHex, "#ffffff");
  return cBlack >= cWhite ? "#000000" : "#ffffff";
}

/**
 * Adjust lightness of a base OKLCH color until it reaches the target
 * contrast ratio against `against`. Direction = "darker" or "lighter".
 * Returns the final hex (best-effort).
 */
export function adjustForContrast(
  base: OKLCH,
  againstHex: string,
  targetRatio: number,
  direction: "lighter" | "darker"
): string {
  let lo = direction === "darker" ? 0 : base.l;
  let hi = direction === "darker" ? base.l : 1;
  let bestHex = oklchToHex(base);
  let bestRatio = contrast(bestHex, againstHex);

  for (let i = 0; i < 32; i++) {
    const midL = (lo + hi) / 2;
    const candidate = withLightness(base, midL);
    const hex = oklchToHex(candidate);
    const ratio = contrast(hex, againstHex);
    if (ratio >= targetRatio) {
      bestHex = hex;
      bestRatio = ratio;
      // We hit target; try to walk back closer to the original L (less aggressive).
      if (direction === "darker") lo = midL;
      else hi = midL;
    } else {
      if (direction === "darker") hi = midL;
      else lo = midL;
    }
  }
  return bestHex;
}

/** Rotate hue by `deg`. */
export function rotateHue(base: OKLCH, deg: number): OKLCH {
  return { ...base, h: ((base.h + deg) % 360 + 360) % 360 };
}
