#!/usr/bin/env node
/**
 * sync-vscode.mjs
 *
 * Mirrors CLI-flavored .github/skills/*\/SKILL.md into VS Code Copilot Chat
 * prompt files at .github/prompts/<name>.prompt.md. Skills are the source of
 * truth; prompt files are derived and should never be hand-edited.
 *
 * Tool name translation:
 *   - CLI built-ins (read / glob / grep / edit / create / bash)
 *       → VS Code built-in tool sets (codebase / search / edit / runCommands)
 *   - Bare MCP tool names (propose_tokens / propose_component / list_proposals
 *     / get_components / ...) → "<server>/<tool>" using SERVER_OF_TOOL below.
 *
 * Run: npm run sync:vscode
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const skillsDir = join(repoRoot, ".github/skills");
const promptsDir = join(repoRoot, ".github/prompts");
const vscodeMcp = join(repoRoot, ".vscode/mcp.json");

// Map MCP tool names to the server they live on. Source of truth: the registerTool
// calls in packages/{ds-author-mcp,mcp-server}/src/.
const SERVER_OF_TOOL = {
  // ds-author server (writes proposals only — no direct DS edits)
  propose_tokens: "ds-author",
  propose_component: "ds-author",
  list_proposals: "ds-author",
  // design-system server (read-only introspection of generated + legacy DS)
  get_briefs: "design-system",
  get_components: "design-system",
  get_component: "design-system",
  get_color_tokens: "design-system",
  get_radius_tokens: "design-system",
  get_typography_tokens: "design-system",
  get_spacing_tokens: "design-system",
  get_icons: "design-system",
};

// Map CLI built-in tool names to VS Code tool sets / tools. We err on the safe
// side: read-only skills get a tighter set; editing skills get the broader one.
const CLI_BUILTIN_TO_VSCODE = {
  read: ["codebase", "search"],
  glob: ["search"],
  grep: ["search"],
  edit: ["edit"],
  create: ["edit"],
  bash: ["runCommands"],
};

function parseFrontmatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: md };
  const fm = {};
  for (const raw of m[1].split(/\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    fm[key] = value;
  }
  return { fm, body: m[2] };
}

function translateTools(allowedTools) {
  if (!allowedTools) return [];
  const names = String(allowedTools)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = new Set();
  for (const name of names) {
    if (SERVER_OF_TOOL[name]) {
      out.add(`${SERVER_OF_TOOL[name]}/${name}`);
      continue;
    }
    const mapped = CLI_BUILTIN_TO_VSCODE[name];
    if (mapped) {
      for (const t of mapped) out.add(t);
      continue;
    }
    // Unknown — pass through. VS Code silently ignores unrecognised entries.
    out.add(name);
  }
  return [...out].sort();
}

function renderToolsYaml(tools) {
  if (tools.length === 0) return "tools: []";
  // Use flow style for a compact diff; quoting strings keeps slashes safe.
  return `tools: [${tools.map((t) => JSON.stringify(t)).join(", ")}]`;
}

function syncSkill(name) {
  const src = join(skillsDir, name, "SKILL.md");
  const md = readFileSync(src, "utf8");
  const { fm, body } = parseFrontmatter(md);

  const description = fm.description || `Derived from .github/skills/${name}/SKILL.md`;
  const tools = translateTools(fm["allowed-tools"]);

  const header = [
    "---",
    "# Auto-generated from .github/skills/" + name + "/SKILL.md.",
    "# Edit the skill source; run `npm run sync:vscode` to regenerate.",
    `name: ${name}`,
    `description: ${description.replace(/\n/g, " ")}`,
    "agent: agent",
    renderToolsYaml(tools),
    "---",
    "",
    `> **Source of truth:** \`.github/skills/${name}/SKILL.md\`. Do not hand-edit this file.`,
    "",
  ].join("\n");

  // Body: drop the original H1 to avoid double titles in the prompt picker.
  const trimmed = body.replace(/^#\s+.*\n+/, "");

  const outPath = join(promptsDir, `${name}.prompt.md`);
  writeFileSync(outPath, header + trimmed);
  return { name, outPath, tools };
}

function ensureDir(p) {
  try {
    statSync(p);
  } catch {
    mkdirSync(p, { recursive: true });
  }
}

function syncMcpJson() {
  // Idempotently add the ds-author server so VS Code Copilot Chat can call
  // propose_tokens / propose_component.
  const cfg = JSON.parse(readFileSync(vscodeMcp, "utf8"));
  cfg.servers ||= {};
  const desired = {
    type: "stdio",
    command: "node",
    args: ["${workspaceFolder}/packages/ds-author-mcp/dist/index.js"],
  };
  const before = JSON.stringify(cfg.servers["ds-author"]);
  cfg.servers["ds-author"] = desired;
  const after = JSON.stringify(cfg.servers["ds-author"]);
  writeFileSync(vscodeMcp, JSON.stringify(cfg, null, 2) + "\n");
  return { changed: before !== after, server: "ds-author" };
}

function main() {
  ensureDir(promptsDir);
  const skills = readdirSync(skillsDir).filter((n) =>
    statSync(join(skillsDir, n)).isDirectory(),
  );

  const synced = skills.map(syncSkill);
  const mcp = syncMcpJson();

  console.log("sync-vscode: skills → prompts");
  for (const s of synced) {
    console.log(`  ✓ ${s.name}.prompt.md  (tools: ${s.tools.join(", ") || "—"})`);
  }
  console.log(
    mcp.changed
      ? `  ✓ .vscode/mcp.json updated (server: ${mcp.server})`
      : `  · .vscode/mcp.json already up-to-date (server: ${mcp.server})`,
  );
}

main();
