/**
 * accessibility.md — derived from `audience.accessibility` + DesignTokens.
 *
 * Embeds a full WCAG contrast matrix (every entry of DEFAULT_ROLE_PAIRS
 * × {light, dark}) with computed ratios and pass/fail marks against the
 * Brief's declared `wcagLevel`.
 *
 * Pure function: same Brief + same tokens → same Markdown.
 */
import type { Brief } from "../brief.js";
import {
    DEFAULT_ROLE_PAIRS,
    type DesignTokens,
    type RolePair,
} from "../synth/types.js";
import { resolveRole } from "../synth/resolve.js";
import { contrast } from "../util/color.js";

function requiredRatio(p: RolePair, level: "AA" | "AAA"): number {
    // The Brief's `wcagLevel` raises the bar above each pair's declared `level`
    // when the Brief asks for AAA. We always honor the stricter of the two.
    const effLevel: "AA" | "AAA" = level === "AAA" ? "AAA" : p.level;
    if (p.uiComponent) return 3.0;
    if (p.largeText) return effLevel === "AAA" ? 4.5 : 3.0;
    return effLevel === "AAA" ? 7.0 : 4.5;
}

function kindLabel(p: RolePair): string {
    if (p.uiComponent) return "UI";
    if (p.largeText) return "Large text";
    return "Body text";
}

export function renderAccessibility(
    brief: Brief,
    tokens: DesignTokens,
): string {
    const a11y = brief.audience.accessibility ?? {};
    const wcagLevel: "AA" | "AAA" = a11y.wcagLevel === "AAA" ? "AAA" : "AA";
    const darkMode = a11y.darkMode === true;
    const reducedMotion = a11y.reducedMotion === true;

    const lines: string[] = [];

    // ── Targets ────────────────────────────────────────────────────────
    lines.push(
        "## Targets",
        "",
        "| Setting | Value |",
        "|---|---|",
        `| WCAG level | \`${wcagLevel}\` |`,
        `| Dark mode | ${darkMode ? "✓ supported (must reach parity with light)" : "— light only"} |`,
        `| Reduced motion | ${reducedMotion ? "✓ honor `prefers-reduced-motion`" : "— not required"} |`,
        "",
    );

    // ── Contrast matrix ────────────────────────────────────────────────
    lines.push(
        "## Contrast matrix",
        "",
        "Every role-pair below is checked against the Brief's WCAG level by",
        "`ds-check:contrast`. The numbers are computed from the synthesized",
        "tokens — they update every time you regenerate.",
        "",
        "| Foreground | Background | Kind | Required | Light | Dark |",
        "|---|---|---|---|---|---|",
    );

    for (const pair of DEFAULT_ROLE_PAIRS) {
        const required = requiredRatio(pair, wcagLevel);
        const fgLight = resolveRole(tokens.color, pair.fg, "light");
        const bgLight = resolveRole(tokens.color, pair.bg, "light");
        const fgDark = resolveRole(tokens.color, pair.fg, "dark");
        const bgDark = resolveRole(tokens.color, pair.bg, "dark");

        const cellFor = (fg: string | null, bg: string | null): string => {
            if (!fg || !bg) return "_(unresolved)_";
            const r = contrast(fg, bg);
            const ok = r >= required - 1e-3;
            return `${ok ? "✓" : "✗"} ${r.toFixed(2)} (\`${fg}\` on \`${bg}\`)`;
        };

        lines.push(
            `| \`${pair.fg}\` | \`${pair.bg}\` | ${kindLabel(pair)} | ≥ ${required.toFixed(1)} | ${cellFor(fgLight, bgLight)} | ${cellFor(fgDark, bgDark)} |`,
        );
    }
    lines.push("");

    // ── Keyboard / focus ───────────────────────────────────────────────
    lines.push(
        "## Keyboard & focus",
        "",
        "- All interactive elements MUST be reachable and operable via keyboard alone.",
        "- Focus state uses the synthesized token `var(--color-focus-ring)` with an",
        "  `outline-offset` of 2px. Do not suppress `:focus-visible` styling.",
        "- Tab order follows DOM order; do not override with `tabindex > 0`.",
        "",
    );

    // ── Motion ─────────────────────────────────────────────────────────
    if (reducedMotion) {
        lines.push(
            "## Motion",
            "",
            "The Brief asks us to honor `prefers-reduced-motion`. Wrap every",
            "non-essential animation in:",
            "",
            "```css",
            "@media (prefers-reduced-motion: no-preference) {",
            "  /* animations here */",
            "}",
            "```",
            "",
            "Essential motion (loading spinners, progress bars) may remain but",
            "should be reduced in amplitude.",
            "",
        );
    }

    // ── Dark mode ──────────────────────────────────────────────────────
    if (darkMode) {
        lines.push(
            "## Dark mode parity",
            "",
            "Dark mode is a first-class target. Every component MUST be tested in",
            'both `[data-theme="light"]` and `[data-theme="dark"]`. The contrast',
            "matrix above already validates both modes — if any cell shows ✗,",
            "fix the seed colors in the Brief and regenerate before approving.",
            "",
        );
    }

    return lines.join("\n");
}
