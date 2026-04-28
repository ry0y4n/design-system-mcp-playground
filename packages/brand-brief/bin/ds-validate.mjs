#!/usr/bin/env node
/**
 * ds-validate: Validate a Brand Brief YAML file against schema/brief.schema.json
 * Usage: node bin/ds-validate.mjs <path-to-yaml>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, "../schema/brief.schema.json");

function fail(msg, code = 1) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

const target = process.argv[2];
if (!target) fail("Usage: ds-validate <path-to-yaml>");

const baseCwd = process.env.INIT_CWD || process.cwd();
const briefPath = path.resolve(baseCwd, target);
if (!fs.existsSync(briefPath)) fail(`File not found: ${briefPath}`);

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const raw = fs.readFileSync(briefPath, "utf8");
let doc;
try {
  doc = YAML.parse(raw);
} catch (e) {
  fail(`YAML parse error: ${e.message}`);
}

if (!validate(doc)) {
  console.error("✗ Brief failed schema validation:");
  for (const err of validate.errors ?? []) {
    console.error(`  - ${err.instancePath || "(root)"} ${err.message}`);
  }
  process.exit(1);
}

console.log(`✓ ${path.relative(process.cwd(), briefPath)} is a valid Brand Brief`);
