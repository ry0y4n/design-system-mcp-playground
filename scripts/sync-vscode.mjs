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
// calls in packages/{ds-author-mcp,ds-read-mcp}/src/.
const SERVER_OF_TOOL = {
  // ds-author server (writes proposals only — no direct DS edits)
  propose_tokens: "ds-author",
  propose_component: "ds-author",
  list_proposals: "ds-author",
  // ds-read server (read-only introspection of generated + legacy DS)
  get_briefs: "ds-read",
  get_components: "ds-read",
  get_component: "ds-read",
  get_color_tokens: "ds-read",
  get_radius_tokens: "ds-read",
  get_typography_tokens: "ds-read",
  get_spacing_tokens: "ds-read",
  get_icons: "ds-read",
  explain_token: "ds-read",
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
  // Idempotently ensure both MCP servers are present in .vscode/mcp.json so
  // VS Code Copilot Chat can call them. ds-read = read-only introspection,
  // ds-author = propose_tokens / propose_component.
  const cfg = JSON.parse(readFileSync(vscodeMcp, "utf8"));
  cfg.servers ||= {};
  const targets = [
    { name: "ds-read",   path: "packages/ds-read-mcp/dist/index.js" },
    { name: "ds-author", path: "packages/ds-author-mcp/dist/index.js" },
  ];
  const changed = [];
  for (const t of targets) {
    const desired = {
      type: "stdio",
      command: "node",
      args: [`\${workspaceFolder}/${t.path}`],
    };
    const before = JSON.stringify(cfg.servers[t.name]);
    cfg.servers[t.name] = desired;
    if (before !== JSON.stringify(cfg.servers[t.name])) changed.push(t.name);
  }
  writeFileSync(vscodeMcp, JSON.stringify(cfg, null, 2) + "\n");
  return { changed: changed.length > 0, servers: targets.map((t) => t.name) };
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
      ? `  ✓ .vscode/mcp.json updated (servers: ${mcp.servers.join(", ")})`
      : `  · .vscode/mcp.json already up-to-date (servers: ${mcp.servers.join(", ")})`,
  );
}

main();
