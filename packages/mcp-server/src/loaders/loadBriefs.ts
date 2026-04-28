import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { generatedRoot } from "./paths.js";
import type {
  ColorToken,
  RadiusToken,
  SpacingToken,
  TypographyToken,
} from "./loadTokens.js";
import type { ComponentDetail, ComponentSummary } from "./loadComponents.js";

/**
 * Phase 2+ readback adapters.
 *
 * `ds-author-mcp` writes Brief-derived design-system artifacts to
 * `packages/design-system/src/generated/<slug>/`. This module exposes those
 * artifacts to MCP consumers (Copilot Chat / agents) using the same shapes the
 * legacy hand-authored tokens/components use, so a single set of tools can
 * read both.
 */

export type BriefMeta = {
  slug: string;
  sourceBriefVersion?: string;
  generatedAt?: string;
  synthVersion?: string;
};

type GeneratedTokens = {
  meta?: { sourceBriefSlug?: string; sourceBriefVersion?: string; generatedAt?: string; synthVersion?: string };
  color: Record<string, Record<string, { light: string; dark?: string } | string>>;
  space: Record<string, string>;
  radius: Record<string, string>;
  typography: Record<string, { fontSize: string; lineHeight: string | number; fontWeight: number }>;
};

function briefRoot(slug: string): string {
  return join(generatedRoot, slug);
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function listBriefs(): Promise<BriefMeta[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(generatedRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: BriefMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const tokensPath = join(briefRoot(e.name), "tokens.json");
    try {
      const raw = await readFile(tokensPath, "utf8");
      const parsed = JSON.parse(raw) as GeneratedTokens;
      out.push({
        slug: e.name,
        sourceBriefVersion: parsed.meta?.sourceBriefVersion,
        generatedAt: parsed.meta?.generatedAt,
        synthVersion: parsed.meta?.synthVersion,
      });
    } catch {
      // Brief directory without a parseable tokens.json is skipped.
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function briefExists(slug: string): Promise<boolean> {
  return isDir(briefRoot(slug));
}

async function loadGeneratedTokens(slug: string): Promise<GeneratedTokens> {
  const raw = await readFile(join(briefRoot(slug), "tokens.json"), "utf8");
  return JSON.parse(raw) as GeneratedTokens;
}

/**
 * Flatten the generated `color` tree into ColorToken[]. Each role-pair becomes
 * two tokens (light + dark) so consumers can pick the correct mode-aware value.
 * Tokens are named `{group}.{role}.{mode}` (e.g. `background.base.light`).
 */
function flattenColors(t: GeneratedTokens): ColorToken[] {
  const out: ColorToken[] = [];
  for (const [group, roles] of Object.entries(t.color ?? {})) {
    for (const [role, value] of Object.entries(roles)) {
      if (typeof value === "string") {
        out.push({ name: `${group}.${role}`, value, role: `${group}/${role}` });
        continue;
      }
      if (value && typeof value === "object") {
        if (typeof value.light === "string") {
          out.push({
            name: `${group}.${role}.light`,
            value: value.light,
            role: `${group}/${role} (light)`,
          });
        }
        if (typeof value.dark === "string") {
          out.push({
            name: `${group}.${role}.dark`,
            value: value.dark,
            role: `${group}/${role} (dark)`,
          });
        }
      }
    }
  }
  return out;
}

function flattenSpacing(t: GeneratedTokens): SpacingToken[] {
  return Object.entries(t.space ?? {}).map(([name, value]) => ({
    name: `space-${name}`,
    value,
    description: `space scale step ${name}`,
  }));
}

function flattenRadius(t: GeneratedTokens): RadiusToken[] {
  return Object.entries(t.radius ?? {}).map(([name, value]) => ({
    name: `radius-${name}`,
    value,
    description: `radius ${name}`,
  }));
}

function flattenTypography(t: GeneratedTokens): TypographyToken[] {
  return Object.entries(t.typography ?? {}).map(([name, v]) => ({
    name,
    fontSize: v.fontSize,
    lineHeight: String(v.lineHeight),
    fontWeight: v.fontWeight,
    description: `typography role ${name}`,
  }));
}

export async function loadBriefColorTokens(slug: string): Promise<ColorToken[]> {
  return flattenColors(await loadGeneratedTokens(slug));
}
export async function loadBriefSpacingTokens(slug: string): Promise<SpacingToken[]> {
  return flattenSpacing(await loadGeneratedTokens(slug));
}
export async function loadBriefRadiusTokens(slug: string): Promise<RadiusToken[]> {
  return flattenRadius(await loadGeneratedTokens(slug));
}
export async function loadBriefTypographyTokens(slug: string): Promise<TypographyToken[]> {
  return flattenTypography(await loadGeneratedTokens(slug));
}

/**
 * Component readback. Each generated component lives at
 * `src/generated/<slug>/<Name>/{Name}.tsx + spec.md + ...`.
 * We treat `spec.md` as the README equivalent.
 */

function extractFirstParagraph(md: string): string {
  const lines = md.split(/\r?\n/);
  const buf: string[] = [];
  let started = false;
  for (const line of lines) {
    if (/^#\s/.test(line)) continue;
    if (line.trim() === "") {
      if (started) break;
      continue;
    }
    started = true;
    buf.push(line.trim());
  }
  return buf.join(" ");
}

async function listBriefComponentNames(slug: string): Promise<string[]> {
  const root = briefRoot(slug);
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function readBriefComponentSpec(slug: string, name: string): Promise<string> {
  return readFile(join(briefRoot(slug), name, "spec.md"), "utf8");
}

export async function loadBriefComponentSummaries(slug: string): Promise<ComponentSummary[]> {
  const names = await listBriefComponentNames(slug);
  const out: ComponentSummary[] = [];
  for (const name of names) {
    try {
      const md = await readBriefComponentSpec(slug, name);
      out.push({
        name,
        summary: extractFirstParagraph(md),
        tags: [`brief:${slug}`],
      });
    } catch {
      // No spec.md — skip.
    }
  }
  return out;
}

export async function loadBriefComponentDetail(
  slug: string,
  name: string,
): Promise<ComponentDetail | null> {
  try {
    const md = await readBriefComponentSpec(slug, name);
    return {
      name,
      summary: extractFirstParagraph(md),
      tags: [`brief:${slug}`],
      readme: md,
    };
  } catch {
    return null;
  }
}
