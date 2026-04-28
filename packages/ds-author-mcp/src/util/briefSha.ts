/**
 * Stable hash of the *normalized* parsed Brief.
 *
 * We hash the validated/parsed object (not the raw YAML) so that
 * cosmetic differences (key order, comments, quoting) don't change the SHA.
 * Any change to actual data — including added/removed optional fields — does.
 */
import { createHash } from "node:crypto";

function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) out[k] = canonicalize(o[k]);
    return out;
  }
  return v;
}

export function hashBrief(brief: unknown): string {
  const json = JSON.stringify(canonicalize(brief));
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}
