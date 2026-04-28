/** Run all validators against a tokens.json file path; report human-readable. */
import { checkContrast } from "./contrast.js";
import { checkSchema } from "./schema.js";
import { checkTokenCoverage, type CssLeak } from "./tokenCoverage.js";
import type { DesignTokens } from "../synth/types.js";

export interface ValidationReport {
  ok: boolean;
  schemaErrors: string[];
  contrastFailures: ReturnType<typeof checkContrast>;
  cssLeaks: CssLeak[];
}

export function runAllValidators(
  tokens: unknown,
  opts: { cssRoot?: string } = {}
): ValidationReport {
  const schemaErrors = checkSchema(tokens);
  if (schemaErrors.length > 0) {
    return { ok: false, schemaErrors, contrastFailures: [], cssLeaks: [] };
  }
  const contrastFailures = checkContrast(tokens as DesignTokens);
  const cssLeaks = opts.cssRoot ? checkTokenCoverage(opts.cssRoot) : [];
  return {
    ok: contrastFailures.length === 0 && cssLeaks.length === 0,
    schemaErrors,
    contrastFailures,
    cssLeaks,
  };
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];
  if (report.schemaErrors.length > 0) {
    lines.push("Schema errors:");
    for (const e of report.schemaErrors) lines.push(`  - ${e}`);
  }
  if (report.contrastFailures.length > 0) {
    lines.push("Contrast failures (WCAG):");
    for (const f of report.contrastFailures) {
      lines.push(
        `  - [${f.mode}] ${f.pair.fg} (${f.fgHex}) on ${f.pair.bg} (${f.bgHex}): ${f.ratio.toFixed(2)} < ${f.required.toFixed(1)}`
      );
    }
  }
  if (report.cssLeaks.length > 0) {
    lines.push("CSS token-coverage leaks (use var(--*) instead of raw values):");
    for (const l of report.cssLeaks) {
      lines.push(`  - ${l.file}:${l.line}  "${l.text}"  ${l.reason}`);
    }
  }
  if (report.ok) lines.push("✓ all validators passed");
  return lines.join("\n");
}
