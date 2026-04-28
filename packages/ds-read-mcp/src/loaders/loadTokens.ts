import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tokensDir } from "./paths.js";

export type ColorToken = { name: string; value: string; role: string };
export type RadiusToken = { name: string; value: string; description: string };
export type TypographyToken = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  description: string;
};
export type SpacingToken = { name: string; value: string; description: string };

async function readJson<T>(file: string): Promise<T> {
  const raw = await readFile(join(tokensDir, file), "utf8");
  return JSON.parse(raw) as T;
}

export const loadColorTokens = () => readJson<ColorToken[]>("color.json");
export const loadRadiusTokens = () => readJson<RadiusToken[]>("radius.json");
export const loadTypographyTokens = () => readJson<TypographyToken[]>("typography.json");
export const loadSpacingTokens = () => readJson<SpacingToken[]>("spacing.json");
