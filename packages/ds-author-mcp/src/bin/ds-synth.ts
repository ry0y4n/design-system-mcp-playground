#!/usr/bin/env node
/**
 * ds-synth: Brief YAML → tokens.json (deterministic).
 *
 * Usage:
 *   ds-synth <brief.yaml> [--out <tokens.json>]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrief } from "../brief.js";
import { synthesizeTokens } from "../synth/index.js";

function resolveCwdPath(p: string): string {
  const cwd = process.env.INIT_CWD ?? process.cwd();
  return resolve(cwd, p);
}

function findSchema(): string {
  // Resolve packages/brand-brief/schema/brief.schema.json from this file.
  const here = fileURLToPath(import.meta.url);
  // dist/bin/ds-synth.js → up 4 → packages/
  return resolve(dirname(here), "../../../brand-brief/schema/brief.schema.json");
}

function parseArgs(argv: string[]): { input: string; out?: string } {
  const args = argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: ds-synth <brief.yaml> [--out <tokens.json>]");
    process.exit(2);
  }
  let input = "";
  let out: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out" || a === "-o") {
      out = args[++i];
    } else if (!input) {
      input = a;
    }
  }
  return { input, out };
}

function main() {
  const { input, out } = parseArgs(process.argv);
  const briefPath = resolveCwdPath(input);
  const schemaPath = findSchema();
  const result = loadBrief(briefPath, schemaPath);
  if (!result.ok) {
    console.error("Brief validation failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const tokens = synthesizeTokens(result.brief);
  const json = JSON.stringify(tokens, null, 2);
  if (out) {
    const outPath = resolveCwdPath(out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, json + "\n", "utf8");
    console.error(`✓ wrote ${outPath}`);
  } else {
    process.stdout.write(json + "\n");
  }
}

main();
