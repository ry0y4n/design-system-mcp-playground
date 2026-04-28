#!/usr/bin/env node
/**
 * ds-check: Run all validators against a tokens.json file and (optionally) a
 * directory of generated CSS modules.
 *
 *   ds-check <tokens.json> [--css-root <dir>]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatReport, runAllValidators } from "../validators/index.js";

function resolveCwdPath(p: string): string {
  const cwd = process.env.INIT_CWD ?? process.cwd();
  return resolve(cwd, p);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: ds-check <tokens.json> [--css-root <dir>]");
    process.exit(2);
  }
  let tokensPath = "";
  let cssRoot: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--css-root") cssRoot = resolveCwdPath(args[++i]);
    else if (!tokensPath) tokensPath = resolveCwdPath(a);
  }
  let tokens: unknown;
  try {
    tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  } catch (e) {
    console.error(`Failed to read ${tokensPath}: ${(e as Error).message}`);
    process.exit(1);
  }
  const report = runAllValidators(tokens, { cssRoot });
  console.error(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}

main();
