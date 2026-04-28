/**
 * Convert a DesignTokens object to a CSS file with two themes.
 *
 *   :root { ... light values ... }
 *   [data-theme="dark"] { ... dark values ... }
 *
 * Deterministic: same tokens.json → same CSS.
 */
import type { DesignTokens } from "../synth/types.js";

interface Decl {
  prop: string;
  light: string;
  dark: string;
}

function flattenColor(tokens: DesignTokens["color"]): Decl[] {
  const out: Decl[] = [];
  const walk = (obj: any, prefix: string[]) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = [...prefix, k];
      if (v && typeof v === "object" && "light" in (v as any) && "dark" in (v as any)) {
        const pair = v as { light: string; dark: string };
        // role-pair leaf
        out.push({
          prop: `--color-${path.map(kebab).join("-")}`,
          light: pair.light,
          dark: pair.dark,
        });
      } else if (v && typeof v === "object") {
        walk(v, path);
      }
    }
  };
  walk(tokens, []);
  return out;
}

function flattenSpace(space: DesignTokens["space"]): Decl[] {
  return Object.entries(space).map(([k, v]) => ({
    prop: `--space-${k}`,
    light: v,
    dark: v,
  }));
}

function flattenRadius(radius: DesignTokens["radius"]): Decl[] {
  return Object.entries(radius).map(([k, v]) => ({
    prop: `--radius-${k}`,
    light: v,
    dark: v,
  }));
}

function flattenTypography(typo: DesignTokens["typography"]): Decl[] {
  const out: Decl[] = [];
  for (const [name, t] of Object.entries(typo)) {
    out.push(
      { prop: `--typography-${kebab(name)}-font-size`, light: t.fontSize, dark: t.fontSize },
      { prop: `--typography-${kebab(name)}-line-height`, light: t.lineHeight, dark: t.lineHeight },
      { prop: `--typography-${kebab(name)}-font-weight`, light: String(t.fontWeight), dark: String(t.fontWeight) }
    );
  }
  return out;
}

function kebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function tokensToCss(
  tokens: DesignTokens,
  opts: { fontStack?: string; scope?: string } = {}
): string {
  const decls = [
    ...flattenColor(tokens.color),
    ...flattenSpace(tokens.space),
    ...flattenRadius(tokens.radius),
    ...flattenTypography(tokens.typography),
  ];
  const lightLines = decls.map((d) => `  ${d.prop}: ${d.light};`);
  const darkLines = decls
    .filter((d) => d.light !== d.dark)
    .map((d) => `  ${d.prop}: ${d.dark};`);

  const fontDecl = opts.fontStack ? `\n  --font-stack: ${opts.fontStack};` : "";
  const scope = opts.scope ?? ":root";
  // Dark theme override is scoped twice so [data-brief=...] X [data-theme=dark] both apply.
  const darkSel =
    scope === ":root"
      ? `[data-theme="dark"]`
      : `${scope}[data-theme="dark"], ${scope} [data-theme="dark"]`;
  return [
    `/* Generated from Brand Brief "${tokens.meta.sourceBriefSlug}" v${tokens.meta.sourceBriefVersion}`,
    ` * synth: ds-author-mcp@${tokens.meta.synthVersion}`,
    ` * generated-at: ${tokens.meta.generatedAt}`,
    ` * DO NOT EDIT — regenerate via \`propose_tokens\`.`,
    ` */`,
    `${scope} {${fontDecl}`,
    ...lightLines,
    `}`,
    ``,
    `${darkSel} {`,
    ...darkLines,
    `}`,
    ``,
  ].join("\n");
}
