/**
 * WCAG contrast validator against a role-pair matrix.
 * Returns a list of failures (empty array = pass).
 */
import { contrast } from "../util/color.js";
import { DEFAULT_ROLE_PAIRS, type DesignTokens, type RolePair } from "../synth/types.js";
import { resolveRole } from "../synth/resolve.js";

export interface ContrastFailure {
  pair: RolePair;
  mode: "light" | "dark";
  fgHex: string;
  bgHex: string;
  ratio: number;
  required: number;
}

function requiredRatio(p: RolePair): number {
  if (p.uiComponent) return 3.0;
  if (p.largeText) return p.level === "AAA" ? 4.5 : 3.0;
  return p.level === "AAA" ? 7.0 : 4.5;
}

export function checkContrast(
  tokens: DesignTokens,
  pairs: RolePair[] = DEFAULT_ROLE_PAIRS
): ContrastFailure[] {
  const failures: ContrastFailure[] = [];
  for (const mode of ["light", "dark"] as const) {
    for (const pair of pairs) {
      const fgHex = resolveRole(tokens.color, pair.fg, mode);
      const bgHex = resolveRole(tokens.color, pair.bg, mode);
      if (!fgHex || !bgHex) {
        // Treat unresolved as a failure with ratio 0 to surface naming bugs early.
        failures.push({
          pair,
          mode,
          fgHex: fgHex ?? "(unresolved)",
          bgHex: bgHex ?? "(unresolved)",
          ratio: 0,
          required: requiredRatio(pair),
        });
        continue;
      }
      const ratio = contrast(fgHex, bgHex);
      const required = requiredRatio(pair);
      if (ratio < required - 1e-3) {
        failures.push({ pair, mode, fgHex, bgHex, ratio, required });
      }
    }
  }
  return failures;
}
