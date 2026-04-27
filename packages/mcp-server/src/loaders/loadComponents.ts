import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { componentsDir } from "./paths.js";

export type ComponentSummary = {
  name: string;
  summary: string;
  tags: string[];
};

export type ComponentDetail = ComponentSummary & {
  readme: string;
};

function extractSection(md: string, heading: string): string | null {
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, "m");
  const m = md.match(re);
  return m ? m[1].trim() : null;
}

function parseSummary(md: string): string {
  return extractSection(md, "Summary") ?? "";
}

function parseTags(md: string): string[] {
  const section = extractSection(md, "Tags");
  if (!section) return [];
  return section
    .split(/[,、\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

async function readComponentReadme(name: string): Promise<string> {
  return readFile(join(componentsDir, name, "README.md"), "utf8");
}

export async function listComponentNames(): Promise<string[]> {
  const entries = await readdir(componentsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export async function loadComponentSummaries(): Promise<ComponentSummary[]> {
  const names = await listComponentNames();
  const result: ComponentSummary[] = [];
  for (const name of names) {
    try {
      const md = await readComponentReadme(name);
      result.push({
        name,
        summary: parseSummary(md),
        tags: parseTags(md)
      });
    } catch {
      // Component without README is skipped — keep loader resilient
    }
  }
  return result;
}

export async function loadComponentDetail(name: string): Promise<ComponentDetail | null> {
  try {
    const md = await readComponentReadme(name);
    return {
      name,
      summary: parseSummary(md),
      tags: parseTags(md),
      readme: md
    };
  } catch {
    return null;
  }
}
