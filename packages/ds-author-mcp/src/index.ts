#!/usr/bin/env node
/**
 * ds-author MCP server (stdio).
 *
 * Tools:
 *   propose_tokens(briefPath)            — synth + validate; write a proposal
 *   propose_component(briefPath, spec)   — deterministic component package
 *   propose_guideline(briefPath, name)   — deterministic guideline Markdown
 *
 * All proposals are written under packages/brand-brief/proposals/<slug>/<id>/.
 * The MCP server intentionally has NO `approve` tool. Approval is performed by
 * a human via `npm run ds:approve` (out-of-band CLI).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { join, resolve } from "node:path";
import {
    writeFileEnsureDir,
    repoRoot,
    proposalsDir,
    newProposalId,
} from "./util/proposalPaths.js";
import { loadBrief } from "./brief.js";
import { synthesizeTokens } from "./synth/index.js";
import { tokensToCss } from "./synth/tokensCss.js";
import { fontStackFor } from "./synth/typography.js";
import { buildProvenance } from "./synth/provenance.js";
import { hashBrief } from "./util/briefSha.js";
import { generateComponent } from "./components/button.js";
import { generateGuideline, GUIDELINE_NAMES } from "./guidelines/index.js";
import { runAllValidators, formatReport } from "./validators/index.js";

function jsonContent(obj: unknown) {
    return {
        content: [
            { type: "text" as const, text: JSON.stringify(obj, null, 2) },
        ],
    };
}

async function main() {
    const server = new McpServer(
        {
            name: "ds-author-mcp",
            version: "0.1.0",
        },
        {
            instructions:
                "Brief-driven design system authoring. Use propose_tokens to deterministically synthesize tokens from a Brand Brief YAML. Approval into packages/design-system/ is performed out-of-band by a human via `npm run ds:approve`; this server cannot apply changes itself.",
        },
    );

    server.registerTool(
        "propose_tokens",
        {
            title: "Propose design tokens from a Brand Brief",
            description:
                "Run the deterministic token synthesis engine on a Brand Brief YAML, validate the result (schema + WCAG contrast role-pair matrix), and write a proposal manifest to packages/brand-brief/proposals/<slug>/<id>/. Returns the proposal id and validation report. Does NOT modify packages/design-system/ — a human must run `npm run ds:approve` to apply.",
            inputSchema: {
                briefPath: z
                    .string()
                    .describe(
                        "Repo-relative path to the Brand Brief YAML (e.g. 'packages/brand-brief/examples/aurora.brief.yaml').",
                    ),
            },
        },
        async ({ briefPath }) => {
            const root = repoRoot();
            const absBrief = resolve(root, briefPath);
            const schemaPath = resolve(
                root,
                "packages/brand-brief/schema/brief.schema.json",
            );

            const loaded = loadBrief(absBrief, schemaPath);
            if (!loaded.ok) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text" as const,
                            text:
                                "Brief validation failed:\n" +
                                loaded.errors.map((e) => `  - ${e}`).join("\n"),
                        },
                    ],
                };
            }
            const brief = loaded.brief;
            const tokens = synthesizeTokens(brief);
            const report = runAllValidators(tokens);
            const briefSha = hashBrief(brief);
            const provenance = buildProvenance(tokens, brief, briefSha);

            const slug = brief.meta.slug ?? brief.meta.name;
            const proposalId = newProposalId();
            const proposalRoot = join(proposalsDir(), slug, proposalId);

            const manifest = {
                proposalId,
                briefPath,
                briefSlug: slug,
                briefVersion: brief.meta.version,
                briefSha,
                generator: "ds-author-mcp",
                synthVersion: tokens.meta.synthVersion,
                createdAt: new Date().toISOString(),
                validation: {
                    ok: report.ok,
                    schemaErrorCount: report.schemaErrors.length,
                    contrastFailureCount: report.contrastFailures.length,
                },
                changes: [
                    {
                        type: "create" as const,
                        from: "proposed/packages/design-system/tokens/generated.tokens.json",
                        to: "packages/design-system/tokens/generated.tokens.json",
                    },
                    {
                        type: "create" as const,
                        from: "proposed/packages/design-system/tokens/generated.tokens.provenance.json",
                        to: "packages/design-system/tokens/generated.tokens.provenance.json",
                    },
                ],
            };

            writeFileEnsureDir(
                join(proposalRoot, "manifest.json"),
                JSON.stringify(manifest, null, 2) + "\n",
            );
            writeFileEnsureDir(
                join(
                    proposalRoot,
                    "proposed/packages/design-system/tokens/generated.tokens.json",
                ),
                JSON.stringify(tokens, null, 2) + "\n",
            );
            writeFileEnsureDir(
                join(
                    proposalRoot,
                    "proposed/packages/design-system/tokens/generated.tokens.provenance.json",
                ),
                JSON.stringify(provenance, null, 2) + "\n",
            );
            writeFileEnsureDir(
                join(proposalRoot, "validation-report.txt"),
                formatReport(report) + "\n",
            );

            return jsonContent({
                proposalId,
                proposalDir: `packages/brand-brief/proposals/${slug}/${proposalId}`,
                validation: report,
                nextStep: report.ok
                    ? `npm run ds:approve -- packages/brand-brief/proposals/${slug}/${proposalId}/proposed`
                    : "Validation failed — fix the Brief or synth and re-propose.",
            });
        },
    );

    server.registerTool(
        "propose_component",
        {
            title: "Propose a deterministically-generated component",
            description:
                'Generate a component package (TSX + module.css + stories + spec + index + scoped tokens.css) under packages/design-system/src/generated/<briefSlug>/<Name>/. The TSX/CSS are produced from a fixed template — the AI\'s only freedom is choosing variants and sizes. Phase 2 supports name="Button" only. Output is written as a proposal under packages/brand-brief/proposals/<slug>/<id>/. A human must run `npm run ds:approve` to apply.',
            inputSchema: {
                briefPath: z
                    .string()
                    .describe("Repo-relative path to the Brand Brief YAML."),
                name: z
                    .string()
                    .describe(
                        "Component name (PascalCase). Phase 2: must be 'Button'.",
                    ),
                variants: z
                    .array(z.string())
                    .min(1)
                    .describe(
                        "Ordered list of variants. Must include 'primary'. Allowed: primary, secondary, ghost, danger.",
                    ),
                sizes: z
                    .array(z.string())
                    .min(1)
                    .describe(
                        "Ordered list of sizes. Must include 'md'. Allowed: sm, md, lg.",
                    ),
            },
        },
        async ({ briefPath, name, variants, sizes }) => {
            const root = repoRoot();
            const absBrief = resolve(root, briefPath);
            const schemaPath = resolve(
                root,
                "packages/brand-brief/schema/brief.schema.json",
            );

            const loaded = loadBrief(absBrief, schemaPath);
            if (!loaded.ok) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text" as const,
                            text:
                                "Brief validation failed:\n" +
                                loaded.errors.map((e) => `  - ${e}`).join("\n"),
                        },
                    ],
                };
            }
            const brief = loaded.brief;
            const slug = brief.meta.slug ?? brief.meta.name;

            // Synth fresh tokens so the component proposal is self-contained.
            const tokens = synthesizeTokens(brief);
            const css = tokensToCss(tokens, {
                fontStack: fontStackFor(brief),
                scope: `[data-brief="${slug}"]`,
            });

            let componentFiles;
            try {
                componentFiles = generateComponent({
                    briefSlug: slug,
                    name,
                    variants,
                    sizes,
                });
            } catch (e) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text" as const,
                            text: `propose_component rejected input: ${(e as Error).message}`,
                        },
                    ],
                };
            }

            const tokensJsonRel = `packages/design-system/src/generated/${slug}/tokens.json`;
            const tokensCssRel = `packages/design-system/src/generated/${slug}/tokens.css`;
            const tokensProvRel = `packages/design-system/src/generated/${slug}/tokens.provenance.json`;

            const proposalId = newProposalId();
            const proposalRoot = join(proposalsDir(), slug, proposalId);

            // Write all proposed files under proposed/<repo-relative-path>.
            const writeProposed = (rel: string, body: string) =>
                writeFileEnsureDir(join(proposalRoot, "proposed", rel), body);

            const briefSha = hashBrief(brief);
            const provenance = buildProvenance(tokens, brief, briefSha);

            writeProposed(
                tokensJsonRel,
                JSON.stringify(tokens, null, 2) + "\n",
            );
            writeProposed(tokensCssRel, css);
            writeProposed(
                tokensProvRel,
                JSON.stringify(provenance, null, 2) + "\n",
            );
            for (const f of componentFiles) writeProposed(f.path, f.contents);

            const cssRoot = join(
                proposalRoot,
                "proposed/packages/design-system/src/generated",
                slug,
            );
            const report = runAllValidators(tokens, { cssRoot });

            const manifest = {
                proposalId,
                kind: "component" as const,
                briefPath,
                briefSlug: slug,
                briefVersion: brief.meta.version,
                component: { name, variants, sizes },
                generator: "ds-author-mcp",
                synthVersion: tokens.meta.synthVersion,
                briefSha,
                createdAt: new Date().toISOString(),
                validation: {
                    ok: report.ok,
                    schemaErrorCount: report.schemaErrors.length,
                    contrastFailureCount: report.contrastFailures.length,
                    cssLeakCount: report.cssLeaks.length,
                },
                changes: [
                    {
                        type: "replace" as const,
                        from: `proposed/${tokensJsonRel}`,
                        to: tokensJsonRel,
                    },
                    {
                        type: "replace" as const,
                        from: `proposed/${tokensCssRel}`,
                        to: tokensCssRel,
                    },
                    {
                        type: "replace" as const,
                        from: `proposed/${tokensProvRel}`,
                        to: tokensProvRel,
                    },
                    ...componentFiles.map((f) => ({
                        type: f.type,
                        from: `proposed/${f.path}`,
                        to: f.path,
                    })),
                ],
            };

            writeFileEnsureDir(
                join(proposalRoot, "manifest.json"),
                JSON.stringify(manifest, null, 2) + "\n",
            );
            writeFileEnsureDir(
                join(proposalRoot, "validation-report.txt"),
                formatReport(report) + "\n",
            );

            return jsonContent({
                proposalId,
                proposalDir: `packages/brand-brief/proposals/${slug}/${proposalId}`,
                validation: report,
                nextStep: report.ok
                    ? `npm run ds:approve -- packages/brand-brief/proposals/${slug}/${proposalId}/proposed`
                    : "Validation failed — review the report and re-run propose_component (or fix the Brief).",
            });
        },
    );

    server.registerTool(
        "propose_guideline",
        {
            title: "Propose a deterministically-generated guideline document",
            description:
                "Generate a single guideline Markdown file under packages/design-system/src/generated/<briefSlug>/guidelines/<name>.md, derived deterministically from the Brand Brief (and synthesized tokens for accessibility / color-usage). The AI's only freedom is choosing `name`. Output is self-contained: the proposal also re-emits tokens.json / tokens.css / tokens.provenance.json so the proposal can be approved without a prior tokens proposal. A human must run `npm run ds:approve` to apply.",
            inputSchema: {
                briefPath: z
                    .string()
                    .describe("Repo-relative path to the Brand Brief YAML."),
                name: z
                    .enum(GUIDELINE_NAMES)
                    .describe(
                        `Guideline document to generate. One of: ${GUIDELINE_NAMES.join(", ")}.`,
                    ),
            },
        },
        async ({ briefPath, name }) => {
            const root = repoRoot();
            const absBrief = resolve(root, briefPath);
            const schemaPath = resolve(
                root,
                "packages/brand-brief/schema/brief.schema.json",
            );

            const loaded = loadBrief(absBrief, schemaPath);
            if (!loaded.ok) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text" as const,
                            text:
                                "Brief validation failed:\n" +
                                loaded.errors.map((e) => `  - ${e}`).join("\n"),
                        },
                    ],
                };
            }
            const brief = loaded.brief;
            const slug = brief.meta.slug ?? brief.meta.name;

            // Synth fresh tokens so the guideline proposal is self-contained.
            const tokens = synthesizeTokens(brief);
            const css = tokensToCss(tokens, {
                fontStack: fontStackFor(brief),
                scope: `[data-brief="${slug}"]`,
            });
            const briefSha = hashBrief(brief);
            const provenance = buildProvenance(tokens, brief, briefSha);

            let guidelineFiles;
            try {
                guidelineFiles = generateGuideline(
                    { briefSlug: slug, name, briefSha },
                    brief,
                    tokens,
                );
            } catch (e) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text" as const,
                            text: `propose_guideline rejected input: ${(e as Error).message}`,
                        },
                    ],
                };
            }

            const tokensJsonRel = `packages/design-system/src/generated/${slug}/tokens.json`;
            const tokensCssRel = `packages/design-system/src/generated/${slug}/tokens.css`;
            const tokensProvRel = `packages/design-system/src/generated/${slug}/tokens.provenance.json`;

            const proposalId = newProposalId();
            const proposalRoot = join(proposalsDir(), slug, proposalId);

            const writeProposed = (rel: string, body: string) =>
                writeFileEnsureDir(join(proposalRoot, "proposed", rel), body);

            writeProposed(
                tokensJsonRel,
                JSON.stringify(tokens, null, 2) + "\n",
            );
            writeProposed(tokensCssRel, css);
            writeProposed(
                tokensProvRel,
                JSON.stringify(provenance, null, 2) + "\n",
            );
            for (const f of guidelineFiles) writeProposed(f.path, f.contents);

            const cssRoot = join(
                proposalRoot,
                "proposed/packages/design-system/src/generated",
                slug,
            );
            const report = runAllValidators(tokens, { cssRoot });

            const manifest = {
                proposalId,
                kind: "guideline" as const,
                briefPath,
                briefSlug: slug,
                briefVersion: brief.meta.version,
                guideline: { name },
                generator: "ds-author-mcp",
                synthVersion: tokens.meta.synthVersion,
                briefSha,
                createdAt: new Date().toISOString(),
                validation: {
                    ok: report.ok,
                    schemaErrorCount: report.schemaErrors.length,
                    contrastFailureCount: report.contrastFailures.length,
                    cssLeakCount: report.cssLeaks.length,
                },
                changes: [
                    {
                        type: "replace" as const,
                        from: `proposed/${tokensJsonRel}`,
                        to: tokensJsonRel,
                    },
                    {
                        type: "replace" as const,
                        from: `proposed/${tokensCssRel}`,
                        to: tokensCssRel,
                    },
                    {
                        type: "replace" as const,
                        from: `proposed/${tokensProvRel}`,
                        to: tokensProvRel,
                    },
                    ...guidelineFiles.map((f) => ({
                        type: f.type,
                        from: `proposed/${f.path}`,
                        to: f.path,
                    })),
                ],
            };

            writeFileEnsureDir(
                join(proposalRoot, "manifest.json"),
                JSON.stringify(manifest, null, 2) + "\n",
            );
            writeFileEnsureDir(
                join(proposalRoot, "validation-report.txt"),
                formatReport(report) + "\n",
            );

            return jsonContent({
                proposalId,
                proposalDir: `packages/brand-brief/proposals/${slug}/${proposalId}`,
                validation: report,
                nextStep: report.ok
                    ? `npm run ds:approve -- packages/brand-brief/proposals/${slug}/${proposalId}/proposed`
                    : "Validation failed — review the report and re-run propose_guideline (or fix the Brief).",
            });
        },
    );

    server.registerTool(
        "list_proposals",
        {
            title: "List existing proposals",
            description:
                "List proposals under packages/brand-brief/proposals/ as <slug>/<id> pairs.",
            inputSchema: {},
        },
        async () => {
            const fs = await import("node:fs/promises");
            const root = proposalsDir();
            const out: { slug: string; id: string; manifest?: unknown }[] = [];
            try {
                const slugs = await fs.readdir(root, { withFileTypes: true });
                for (const s of slugs) {
                    if (!s.isDirectory()) continue;
                    const ids = await fs.readdir(join(root, s.name), {
                        withFileTypes: true,
                    });
                    for (const i of ids) {
                        if (!i.isDirectory()) continue;
                        const manifestPath = join(
                            root,
                            s.name,
                            i.name,
                            "manifest.json",
                        );
                        let manifest: unknown;
                        try {
                            manifest = JSON.parse(
                                await fs.readFile(manifestPath, "utf8"),
                            );
                        } catch {}
                        out.push({ slug: s.name, id: i.name, manifest });
                    }
                }
            } catch {
                // proposals dir may not exist yet
            }
            return jsonContent({ proposals: out });
        },
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error("[ds-author-mcp] fatal:", err);
    process.exit(1);
});
