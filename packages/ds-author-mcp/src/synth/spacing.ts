/** Deterministic spacing scale derived from `brand.spacingScale`. */
import type { Brief } from "../brief.js";
import type { SpacingTokens } from "./types.js";

const BASE_PX: Record<NonNullable<Brief["brand"]["spacingScale"]>, number> = {
  tight: 3,
  normal: 4,
  spacious: 5,
};

const STEPS = [0, 1, 2, 3, 4, 6, 8, 12, 16];

export function synthesizeSpacing(brief: Brief): SpacingTokens {
  const base = BASE_PX[brief.brand.spacingScale ?? "normal"];
  const out: SpacingTokens = {};
  for (const step of STEPS) {
    out[String(step)] = step === 0 ? "0" : `${step * base}px`;
  }
  return out;
}
