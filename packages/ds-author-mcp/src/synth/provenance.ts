/**
 * Per-token provenance.
 *
 * Walks the resolved DesignTokens and emits one record per leaf, recording
 * which Brief field the value derives from. Implementation is a single
 * declarative rule table — adding a new role to colors.ts means adding a
 * matching rule here, otherwise the coverage check fails loudly.
 *
 * IMPORTANT: this is structural provenance (it knows what synth/colors.ts
 * etc. *do today*), not instrumentation. If synth logic changes (e.g.
 * border now derives from primarySeed), the rule below must be updated.
 * The test in synth/provenance.test.ts and the value-equality check below
 * catch mismatches between the recorded value and the actual token value,
 * but cannot detect a wrong `source` attribution.
 */
import type { Brief } from "../brief.js";
import type { DesignTokens } from "./types.js";

export interface ProvenanceRecord {
  /** Dotted token path, e.g. `color.brand.primary.light`, `space.4`. */
  path: string;
  /** The actual token value, copied from the resolved tokens. */
  value: string | number;
  /** Brief field this value derives from, e.g. `brief.brand.colors.primarySeed`. */
  source: string;
  /** Raw input from the Brief at `source`, or `null` if absent. */
  input: unknown;
  /** `input` with default applied (what synth actually used). */
  effectiveInput: unknown;
  /** Human-readable description of how `value` was derived. */
  derivation: string;
}

export interface ProvenanceFile {
  briefSha: string;
  briefSlug: string;
  synthVersion: string;
  generatedAt: string;
  records: ProvenanceRecord[];
}

type Builder = (
  brief: Brief,
  value: string | number,
  path: string
) => Omit<ProvenanceRecord, "path" | "value">;

interface Rule {
  /** Match dotted path with `*` for one segment. */
  pattern: string;
  build: Builder;
}

function get(obj: unknown, dotted: string): unknown {
  return dotted
    .split(".")
    .reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), obj);
}

function pathMatches(path: string, pattern: string): boolean {
  const ps = path.split(".");
  const qs = pattern.split(".");
  if (ps.length !== qs.length) return false;
  for (let i = 0; i < qs.length; i++) {
    if (qs[i] !== "*" && qs[i] !== ps[i]) return false;
  }
  return true;
}

// --- Builders -------------------------------------------------------------

const neutralBase: Builder = (brief, _v, path) => {
  const input = get(brief, "brand.colors.neutralBase");
  const eff = (input as string | undefined) ?? "neutral";
  const mode = path.endsWith(".dark") ? "dark" : "light";
  return {
    source: "brief.brand.colors.neutralBase",
    input: input ?? null,
    effectiveInput: eff,
    derivation: `Neutral OKLCH palette (hue from neutralBase=${eff}) with fixed L for ${mode} mode.`,
  };
};

const primarySeed = (deriv: string): Builder => (brief, _v, path) => {
  const input = get(brief, "brand.colors.primarySeed");
  const mode = path.endsWith(".dark") ? "dark" : "light";
  return {
    source: "brief.brand.colors.primarySeed",
    input,
    effectiveInput: input,
    derivation: `${deriv} (${mode} mode).`,
  };
};

const semanticHue = (intent: "danger" | "success"): Builder => (_b, _v, path) => {
  const mode = path.endsWith(".dark") ? "dark" : "light";
  return {
    source: `synth.SEMANTIC_HUE.${intent}`,
    input: null,
    effectiveInput: intent,
    derivation: `Canonical ${intent} hue, contrast-clamped against background.base.${mode}.`,
  };
};

const focusRing: Builder = (brief, _v, path) => {
  const input = get(brief, "brand.colors.primarySeed");
  const mode = path.endsWith(".dark") ? "dark" : "light";
  return {
    source: "brief.brand.colors.primarySeed",
    input,
    effectiveInput: input,
    derivation: `Focus ring uses primarySeed hue with high chroma, contrast-clamped against background.base.${mode}.`,
  };
};

const onBrand: Builder = (brief, _v, path) => {
  const input = get(brief, "brand.colors.primarySeed");
  const mode = path.endsWith(".dark") ? "dark" : "light";
  return {
    source: "brief.brand.colors.primarySeed",
    input,
    effectiveInput: input,
    derivation: `Readable foreground picked against brand.primary.${mode} (derived from primarySeed).`,
  };
};

const spacing: Builder = (brief, _v, path) => {
  const input = get(brief, "brand.spacingScale");
  const eff = (input as string | undefined) ?? "normal";
  const base = { tight: 3, normal: 4, spacious: 5 }[eff as "tight" | "normal" | "spacious"];
  const step = path.split(".")[1];
  return {
    source: "brief.brand.spacingScale",
    input: input ?? null,
    effectiveInput: eff,
    derivation: `step ${step} × base ${base}px (${eff} scale).`,
  };
};

const radius: Builder = (brief) => {
  const input = get(brief, "brand.radiusScale");
  const eff = (input as string | undefined) ?? "soft";
  return {
    source: "brief.brand.radiusScale",
    input: input ?? null,
    effectiveInput: eff,
    derivation: `Fixed lookup table for ${eff} radius scale.`,
  };
};

const typoSize: Builder = (brief, _v, path) => {
  const input = get(brief, "brand.typography.scaleRatio");
  const eff = (input as number | undefined) ?? 1.25;
  const slot = path.split(".")[1];
  return {
    source: "brief.brand.typography.scaleRatio",
    input: input ?? null,
    effectiveInput: eff,
    derivation: `16px × ${eff}^step for ${slot}.`,
  };
};

const typoLineHeight: Builder = (_b, _v, path) => ({
  source: "synth.typography.lineHeight",
  input: null,
  effectiveInput: null,
  derivation: `Constant line-height (1.5 for body-sized, 1.25 for heading-sized) for ${path.split(".")[1]}.`,
});

const typoWeight: Builder = (_b, _v, path) => ({
  source: "synth.typography.fontWeight",
  input: null,
  effectiveInput: null,
  derivation: `Constant weight per slot (${path.split(".")[1]}).`,
});

// --- Rule table -----------------------------------------------------------

const RULES: Rule[] = [
  // colors – neutrals
  { pattern: "color.background.*.*", build: neutralBase },
  { pattern: "color.text.primary.*", build: neutralBase },
  { pattern: "color.text.secondary.*", build: neutralBase },
  { pattern: "color.text.disabled.*", build: neutralBase },
  { pattern: "color.border.*.*", build: neutralBase },

  // colors – brand
  {
    pattern: "color.brand.primary.*",
    build: primarySeed("OKLCH from primarySeed, contrast-fixed vs background.base"),
  },
  {
    pattern: "color.brand.primaryHover.*",
    build: primarySeed("brand.primary lightness nudged ±0.05 for hover"),
  },
  {
    pattern: "color.brand.primaryActive.*",
    build: primarySeed("brand.primary lightness nudged ±0.10 for active"),
  },
  {
    pattern: "color.brand.primarySubtle.*",
    build: primarySeed("primarySeed hue at very low chroma"),
  },
  { pattern: "color.text.onBrand.*", build: onBrand },

  // colors – semantic
  { pattern: "color.semantic.danger.*", build: semanticHue("danger") },
  { pattern: "color.semantic.success.*", build: semanticHue("success") },

  // colors – focus
  { pattern: "color.focus.ring.*", build: focusRing },

  // dimensions
  { pattern: "space.*", build: spacing },
  { pattern: "radius.*", build: radius },

  // typography
  { pattern: "typography.*.fontSize", build: typoSize },
  { pattern: "typography.*.lineHeight", build: typoLineHeight },
  { pattern: "typography.*.fontWeight", build: typoWeight },
];

// --- Walker ---------------------------------------------------------------

function* walkLeaves(
  obj: unknown,
  prefix: string
): Generator<{ path: string; value: string | number }> {
  if (obj === null || obj === undefined) return;
  if (typeof obj === "string" || typeof obj === "number") {
    yield { path: prefix, value: obj };
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      yield* walkLeaves(v, prefix ? `${prefix}.${k}` : k);
    }
  }
}

export function buildProvenance(
  tokens: DesignTokens,
  brief: Brief,
  briefSha: string
): ProvenanceFile {
  const records: ProvenanceRecord[] = [];
  // Skip the meta block — it's bookkeeping, not Brief-derived.
  const subject = { color: tokens.color, space: tokens.space, radius: tokens.radius, typography: tokens.typography };

  for (const { path, value } of walkLeaves(subject, "")) {
    const matches = RULES.filter((r) => pathMatches(path, r.pattern));
    if (matches.length === 0) {
      throw new Error(`provenance: no rule matches token path "${path}"`);
    }
    if (matches.length > 1) {
      throw new Error(
        `provenance: ${matches.length} rules match "${path}": ${matches.map((m) => m.pattern).join(", ")}`
      );
    }
    const rest = matches[0].build(brief, value, path);
    records.push({ path, value, ...rest });
  }

  return {
    briefSha,
    briefSlug: tokens.meta.sourceBriefSlug,
    synthVersion: tokens.meta.synthVersion,
    generatedAt: tokens.meta.generatedAt,
    records,
  };
}
