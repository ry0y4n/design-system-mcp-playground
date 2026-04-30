/**
 * do-and-dont.md — derived from `constraints`.
 *
 * Sections:
 *   - Must have (constraints.mustHave[])
 *   - Must not (constraints.mustNot[])
 *   - References (constraints.references[]) — pass-through, not validated
 *
 * Pure function: same Brief → same Markdown.
 */
import type { Brief } from "../brief.js";

export function renderDoAndDont(brief: Brief): string {
    const { mustHave, mustNot, references } = brief.constraints;
    const lines: string[] = [];

    lines.push(
        "## Must have",
        "",
        "Hard requirements. Every approved proposal MUST satisfy each item.",
        "",
    );
    if (mustHave.length === 0) {
        lines.push("_(no must-have constraints declared in the Brief)_");
    } else {
        for (const m of mustHave) lines.push(`- ✓ ${m}`);
    }
    lines.push("");

    lines.push(
        "## Must not",
        "",
        "Hard prohibitions. Any proposal that triggers one of these is rejected.",
        "",
    );
    if (!mustNot || mustNot.length === 0) {
        lines.push("_(no must-not constraints declared in the Brief)_");
    } else {
        for (const m of mustNot) lines.push(`- ✗ ${m}`);
    }
    lines.push("");

    if (references && references.length > 0) {
        lines.push(
            "## References",
            "",
            "Inspirations cited in the Brief. These are *not* targets to copy —",
            "they are mood-anchors for the spirit of the product.",
            "",
        );
        for (const r of references) {
            // Render as link if it looks like a URL, otherwise as plain text.
            if (/^https?:\/\//.test(r)) {
                lines.push(`- [${r}](${r})`);
            } else {
                lines.push(`- ${r}`);
            }
        }
        lines.push("");
    }

    lines.push(
        "## How this list is enforced",
        "",
        "- `mustHave` / `mustNot` are written verbatim from the Brand Brief.",
        '- Token-level constraints (e.g. "strong red is not a success color")',
        "  are caught automatically by `ds-check:contrast` and `ds-check:tokens`.",
        '- Behavioural constraints (e.g. "no flashing animations") are reviewer',
        "  responsibilities — they cannot be machine-verified by this pipeline.",
        "- To change either list, edit `brief.yaml > constraints` and regenerate.",
        "",
    );

    return lines.join("\n");
}
