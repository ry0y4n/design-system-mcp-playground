/**
 * Token-coverage validator.
 *
 * For every .module.css under a proposal's `proposed/`, verify that no raw
 * color/length literals leak in. All design values must come from `var(--*)`.
 *
 * Allowed:
 *   - var(--anything)
 *   - CSS keywords: transparent, currentColor, inherit, initial, unset, none, auto, white, black
 *   - 0 (without unit)
 *   - opacity numbers (0..1)
 *   - timings (ms, s) — purely behavioural, not visual
 *   - small ratios in line-height (treated as unitless)
 *
 * Rejected:
 *   - hex literals (#abc, #abcdef, #abcdef00)
 *   - rgb()/rgba()/hsl()/hsla()/oklch()/oklab() literals
 *   - lengths in px / rem / em / vw / vh / % (anything that smells like a design value)
 *
 * The point: a single source of truth for visual tokens. If you need a value
 * you don't yet have a token for, propose a new token first.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CssLeak {
  file: string;
  line: number;
  text: string;
  reason: string;
}

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FN_RE = /\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\s*\(/g;
const LENGTH_RE = /(?<![\w-])-?\d*\.?\d+(px|rem|em|vw|vh|vmin|vmax|%)\b/g;

const COMMENT_BLOCK_RE = /\/\*[\s\S]*?\*\//g;

function findCssFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      // Only check component-scoped CSS Modules. Global `tokens.css` files are
      // by-definition allowed to hold raw values — that's the whole point.
      else if (s.isFile() && /\.module\.css$/.test(name)) out.push(p);
    }
  };
  walk(root);
  return out;
}

export function checkTokenCoverage(rootDir: string): CssLeak[] {
  const leaks: CssLeak[] = [];
  for (const file of findCssFiles(rootDir)) {
    const raw = readFileSync(file, "utf8");
    const stripped = raw.replace(COMMENT_BLOCK_RE, (m) => m.replace(/[^\n]/g, " "));
    const lines = stripped.split("\n");
    lines.forEach((rawLine, idx) => {
      // Mask `var(...)` so we don't flag tokens-as-defaults like `var(--x, 0)`.
      const line = rawLine.replace(/var\([^)]*\)/g, "");

      const flag = (text: string, reason: string) => {
        leaks.push({ file, line: idx + 1, text: text.trim(), reason });
      };

      const hex = line.match(HEX_RE);
      if (hex) for (const h of hex) flag(h, "raw hex literal");

      const colorFn = line.match(COLOR_FN_RE);
      if (colorFn) for (const c of colorFn) flag(c, "raw color function");

      const lengths = line.match(LENGTH_RE);
      if (lengths) {
        for (const l of lengths) {
          // Allow `0` and `100%`.
          if (/^-?0(px|rem|em|vw|vh|vmin|vmax|%)$/.test(l)) continue;
          // Allow 1px / 2px (border / outline widths — universally acceptable as raw).
          if (/^[12]px$/.test(l)) continue;
          flag(l, "raw length literal — use var(--space-*) / var(--radius-*) / var(--typography-*)");
        }
      }
    });
  }
  return leaks;
}
