#!/usr/bin/env node
/**
 * ds-approve: HUMAN-ONLY gate that integrates a proposal into packages/design-system/.
 *
 * Intentionally NOT exposed via MCP. The architect agent has no `bash` permission,
 * so the AI cannot invoke this script directly.
 *
 * Usage:
 *   node bin/ds-approve.mjs <proposal-dir> [--dry-run] [--no-validate]
 *
 *   <proposal-dir> is the proposal ROOT (the dir containing manifest.json).
 *   If a path ending in `/proposed` is given (matching the MCP `nextStep`
 *   suggestion), the parent directory is auto-resolved as the proposal root.
 *
 * Behavior:
 *   1. Resolve proposal root, verify it's under packages/brand-brief/proposals/.
 *   2. Read manifest.json and enforce its `changes[].to` whitelist:
 *        - every dest must start with `packages/design-system/`
 *        - paths are normalised, no `..`, no symlink traversal
 *   3. Re-run validators (`ds-check`) over the proposed tokens.json. Skip with
 *      --no-validate (not recommended).
 *   4. Copy each `from` (relative to proposal root) → `to` (relative to repo
 *      root). Creates parent dirs, fails if dest exists with different content
 *      unless type=replace.
 *   5. Stage with `git add` so the human can review and commit themselves.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = process.env.INIT_CWD || process.cwd();
const PROPOSALS_ROOT = path.join(REPO_ROOT, "packages/brand-brief/proposals");
const ALLOWED_DEST_PREFIX = "packages/design-system/";
const VALIDATOR_CLI = path.join(
  REPO_ROOT,
  "packages/ds-author-mcp/dist/bin/ds-check.js"
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noValidate = args.includes("--no-validate");
const target = args.find((a) => !a.startsWith("--"));

function fail(msg, code = 1) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

if (!target) fail("Usage: ds-approve <proposal-dir> [--dry-run] [--no-validate]");

let proposalRoot = path.resolve(REPO_ROOT, target);
// If user passed `.../proposed`, climb up to the actual proposal root.
if (path.basename(proposalRoot) === "proposed") {
  proposalRoot = path.dirname(proposalRoot);
}
if (!proposalRoot.startsWith(PROPOSALS_ROOT + path.sep)) {
  fail(`<proposal-dir> must be under ${path.relative(REPO_ROOT, PROPOSALS_ROOT)}/`);
}
if (!fs.existsSync(proposalRoot)) fail(`Not found: ${proposalRoot}`);

const manifestPath = path.join(proposalRoot, "manifest.json");
if (!fs.existsSync(manifestPath)) fail(`Missing manifest.json in ${proposalRoot}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.changes) || manifest.changes.length === 0) {
  fail("manifest.changes is empty or missing");
}

function safeRel(rootAbs, rel) {
  const resolved = path.resolve(rootAbs, rel);
  if (resolved !== rootAbs && !resolved.startsWith(rootAbs + path.sep)) {
    fail(`Path escapes its root: ${rel}`);
  }
  return resolved;
}

function ensureNotSymlink(p) {
  try {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) fail(`Refusing to follow symlink: ${p}`);
  } catch {
    // doesn't exist yet — ok
  }
}

// Validate every change up-front.
const plan = manifest.changes.map((c, i) => {
  if (!c.from || !c.to) fail(`changes[${i}] missing from/to`);
  if (!["create", "replace"].includes(c.type)) {
    fail(`changes[${i}].type must be "create" or "replace" (got ${c.type})`);
  }
  const fromAbs = safeRel(proposalRoot, c.from);
  // Whitelist: dest must be inside packages/design-system/.
  const toNorm = path.posix.normalize(c.to.replaceAll(path.sep, "/"));
  if (toNorm.startsWith("/") || toNorm.includes("..")) {
    fail(`changes[${i}].to is not a clean relative path: ${c.to}`);
  }
  if (!toNorm.startsWith(ALLOWED_DEST_PREFIX)) {
    fail(
      `changes[${i}].to is outside the whitelist (${ALLOWED_DEST_PREFIX}): ${c.to}`
    );
  }
  const toAbs = safeRel(REPO_ROOT, toNorm);
  if (!fs.existsSync(fromAbs)) fail(`Source missing: ${fromAbs}`);
  ensureNotSymlink(fromAbs);
  ensureNotSymlink(toAbs);
  if (c.type === "create" && fs.existsSync(toAbs)) {
    fail(
      `changes[${i}].type=create but destination already exists: ${toNorm}. ` +
        `Use type=replace if intentional.`
    );
  }
  return { ...c, fromAbs, toAbs, toNorm };
});

console.log(`Proposal: ${path.relative(REPO_ROOT, proposalRoot)}`);
console.log(`Brief:    ${manifest.briefPath} (slug=${manifest.briefSlug})`);
console.log(`Changes:`);
for (const c of plan) {
  console.log(`  [${c.type}] ${c.from}  →  ${c.toNorm}`);
}

// Validators (defense-in-depth).
if (!noValidate) {
  const tokens = plan.find((c) => c.toNorm.endsWith("tokens/generated.tokens.json"));
  if (tokens && fs.existsSync(VALIDATOR_CLI)) {
    const r = spawnSync("node", [VALIDATOR_CLI, tokens.fromAbs], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "inherit", "inherit"],
    });
    if (r.status !== 0) fail("Validators rejected this proposal. Re-run propose_tokens after fixing.", 3);
  }
}

if (dryRun) {
  console.log("\n(dry-run) No files were modified.");
  process.exit(0);
}

// Apply.
for (const c of plan) {
  fs.mkdirSync(path.dirname(c.toAbs), { recursive: true });
  fs.copyFileSync(c.fromAbs, c.toAbs);
  console.log(`  ✓ wrote ${c.toNorm}`);
}

// git add (best-effort; not fatal on failure).
const gitAdd = spawnSync(
  "git",
  ["add", ...plan.map((c) => c.toNorm)],
  { cwd: REPO_ROOT, stdio: "inherit" }
);
if (gitAdd.status !== 0) {
  console.warn(
    "(warn) `git add` failed; review the working tree manually before committing."
  );
}

console.log(
  `\n✓ Approved proposal ${manifest.proposalId}. ` +
    `Review the staged changes and commit.`
);
