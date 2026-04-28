/**
 * ds-guardrail — Project-local Copilot CLI extension.
 *
 * Role (revised based on Phase 0a empirical findings):
 *   - PRIMARY 承認境界 is now the custom agent's `tools:` allowlist
 *     (.github/agents/design-system-architect.md). v1.0.37's `onPreToolUse` does NOT fire
 *     for the agent's built-in tool calls in this version (verified via session logs:
 *     `Dispatching postToolUse hook` is observed for every tool call but
 *     `Dispatching preToolUse hook` never appears). See docs/copilot-cli-capability-report.md.
 *   - This extension therefore focuses on `onPostToolUse`: verification, validation,
 *     and auto-repair signaling via `additionalContext`.
 */
import { joinSession } from "@github/copilot-sdk/extension";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const REPO_ROOT = process.cwd();
const FORBIDDEN_PREFIXES = ["packages/design-system/"];
const ALLOWED_OVERRIDES = ["packages/brand-brief/", "packages/ds-author-mcp/"];
const VALIDATOR_CLI = path.join(REPO_ROOT, "packages/ds-author-mcp/dist/bin/ds-check.js");

function normalize(p) {
  if (!p) return "";
  const abs = path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
  return path.relative(REPO_ROOT, abs).split(path.sep).join("/");
}

function isForbiddenPath(p) {
  const rel = normalize(p);
  if (!rel) return false;
  if (ALLOWED_OVERRIDES.some((a) => rel.startsWith(a))) return false;
  return FORBIDDEN_PREFIXES.some((f) => rel.startsWith(f));
}

const session = await joinSession({
  hooks: {
    /**
     * NOTE: `onPreToolUse` is registered for forward compatibility, but does not
     * fire in v1.0.37 for the agent's tool-use flow. We keep it here so the
     * boundary kicks in automatically once the upstream gap is fixed.
     */
    onPreToolUse: async ({ toolName, toolArgs }) => {
      const writeTools = ["create", "edit", "write", "str_replace", "insert"];
      if (writeTools.includes(toolName)) {
        const p = toolArgs?.path ?? toolArgs?.file_path ?? toolArgs?.filename;
        if (isForbiddenPath(p)) {
          return {
            permissionDecision: "deny",
            permissionDecisionReason:
              "Direct writes to packages/design-system/** are forbidden. " +
              "Use propose_* MCP tools and ask a human to run `npm run ds:approve`.",
          };
        }
      }
      return { permissionDecision: "allow" };
    },

    /**
     * onPostToolUse — the only reliably-firing hook in v1.0.37.
     * Runs validators after propose_* tools and injects additionalContext on failure
     * to drive the auto-repair loop documented in plan.md §5.6.
     */
    onPostToolUse: async ({ toolName, toolResult }) => {
      const proposeTools = new Set([
        "propose_tokens",
        "propose_component",
        "propose_guideline",
      ]);
      if (!proposeTools.has(toolName)) return;
      if (toolResult?.resultType !== "success") return;

      // Try to extract proposalDir from the propose_* response. The MCP tool
      // returns a JSON text content with { proposalDir, validation, ... }.
      let parsed;
      try {
        const text = toolResult?.output?.content?.[0]?.text;
        if (typeof text === "string") parsed = JSON.parse(text);
      } catch {
        // ignore — we'll skip validation if we can't parse the result
      }
      if (!parsed?.proposalDir) return;

      // The propose_* tools write tokens.json into different locations depending on
      // the phase: tokens proposals → packages/design-system/tokens/generated.tokens.json,
      // component proposals → packages/design-system/src/generated/<slug>/tokens.json.
      const proposedRoot = path.join(REPO_ROOT, parsed.proposalDir, "proposed");
      const candidates = [
        path.join(proposedRoot, "packages/design-system/tokens/generated.tokens.json"),
      ];
      // Search for src/generated/<slug>/tokens.json when present.
      const generatedRoot = path.join(proposedRoot, "packages/design-system/src/generated");
      if (existsSync(generatedRoot)) {
        try {
          const { readdirSync } = await import("node:fs");
          for (const slug of readdirSync(generatedRoot)) {
            candidates.push(path.join(generatedRoot, slug, "tokens.json"));
          }
        } catch {
          /* ignore */
        }
      }
      const tokensJson = candidates.find((c) => existsSync(c));
      if (!existsSync(VALIDATOR_CLI) || !tokensJson) return;

      // For component proposals, also point ds-check at the CSS root so token-coverage runs.
      const cssRoot = path.dirname(tokensJson);
      const args = [VALIDATOR_CLI, tokensJson];
      if (cssRoot !== path.dirname(candidates[0])) {
        args.push("--css-root", cssRoot);
      }

      const result = spawnSync("node", args, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 10_000,
      });

      if (result.status !== 0) {
        const stderr = (result.stderr ?? "").trim();
        const reportPath = path.join(REPO_ROOT, parsed.proposalDir, "validation-report.txt");
        const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : stderr;
        return {
          additionalContext:
            "ds-guardrail: validators rejected the latest proposal. " +
            "Review the failures below, adjust the Brief (or synth inputs) and re-run propose_tokens.\n\n" +
            report,
        };
      }
    },
  },
});

session.log("ds-guardrail extension ready (Phase 2: postToolUse → ds-check, tokens + components).");
