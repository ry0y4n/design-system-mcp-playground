import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { iconsDir } from "./paths.js";

type IconManifestEntry = {
  name: string;
  file: string;
  tags: string[];
  description: string;
};

type IconManifest = { icons: IconManifestEntry[] };

export type IconInfo = {
  name: string;
  tags: string[];
  description: string;
  svg: string;
};

export async function loadIcons(): Promise<IconInfo[]> {
  const manifestRaw = await readFile(join(iconsDir, "icons.json"), "utf8");
  const manifest = JSON.parse(manifestRaw) as IconManifest;
  const result: IconInfo[] = [];
  for (const entry of manifest.icons) {
    const svg = await readFile(join(iconsDir, entry.file), "utf8");
    result.push({
      name: entry.name,
      tags: entry.tags,
      description: entry.description,
      svg: svg.trim()
    });
  }
  return result;
}
