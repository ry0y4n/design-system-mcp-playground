/**
 * Helpers for resolving and writing into the proposals directory.
 *
 * Layout:
 *   packages/brand-brief/proposals/<brief-slug>/<timestamp-id>/
 *     manifest.json
 *     proposed/
 *       packages/design-system/tokens/tokens.json
 *       ...
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function repoRoot(): string {
  // dist/util/proposalPaths.js → up 3 → packages/ds-author-mcp/  → up 2 → repo root
  const here = fileURLToPath(import.meta.url);
  return resolve(dirname(here), "../../../..");
}

export function proposalsDir(): string {
  return join(repoRoot(), "packages/brand-brief/proposals");
}

export function newProposalId(): string {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return stamp;
}

/**
 * Path traversal guard: resolve `relPath` against the proposal's `proposed/`
 * dir, and ensure the result stays inside it.
 */
export function safeJoinInsideProposed(proposedRoot: string, relPath: string): string {
  const resolved = resolve(proposedRoot, relPath);
  if (!resolved.startsWith(resolve(proposedRoot) + "/") && resolved !== resolve(proposedRoot)) {
    throw new Error(`Path traversal blocked: ${relPath}`);
  }
  return resolved;
}

export function writeFileEnsureDir(p: string, contents: string) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, contents, "utf8");
}
