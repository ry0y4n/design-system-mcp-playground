/**
 * Deterministic guideline (Markdown) generator.
 *
 * Same philosophy as `components/button.ts`: the AI's only freedom is
 * choosing the guideline `name`. The body is produced from a fixed
 * template that reads the Brand Brief (and synthesized tokens for
 * `accessibility` / `color-usage`). NO LLM in this code path.
 *
 * Output: a single Markdown file at
 *   packages/design-system/src/generated/<briefSlug>/guidelines/<name>.md
 *
 * Each file carries a YAML frontmatter so ds-read MCP and Storybook docs
 * can parse the metadata mechanically.
 */
import type { Brief } from "../brief.js";
import type { DesignTokens } from "../synth/types.js";
import { renderPrinciples } from "./principles.js";
import { renderVoiceAndTone } from "./voiceAndTone.js";
import { renderAccessibility } from "./accessibility.js";
import { renderColorUsage } from "./colorUsage.js";
import { renderDoAndDont } from "./doAndDont.js";

export const GUIDELINE_NAMES = [
    "principles",
    "voice-and-tone",
    "accessibility",
    "color-usage",
    "do-and-dont",
] as const;

export type GuidelineName = (typeof GUIDELINE_NAMES)[number];

export interface GuidelineSpec {
    briefSlug: string;
    name: GuidelineName;
    briefSha: string;
}

export interface GeneratedFile {
    /** Path relative to the repo root. */
    path: string;
    contents: string;
    type: "create" | "replace";
}

const TITLES: Record<GuidelineName, string> = {
    principles: "Principles",
    "voice-and-tone": "Voice & Tone",
    accessibility: "Accessibility",
    "color-usage": "Color Usage",
    "do-and-dont": "Do & Don't",
};

function frontmatter(spec: GuidelineSpec, tokens: DesignTokens): string {
    const lines = [
        "---",
        `name: ${spec.name}`,
        `briefSlug: ${spec.briefSlug}`,
        `briefSha: ${spec.briefSha}`,
        `synthVersion: ${tokens.meta.synthVersion}`,
        `generatedAt: ${tokens.meta.generatedAt}`,
        "---",
        "",
    ];
    return lines.join("\n");
}

function header(spec: GuidelineSpec): string {
    return [
        `# ${TITLES[spec.name]} (${spec.briefSlug})`,
        "",
        `<!-- Generated from Brand Brief "${spec.briefSlug}" by ds-author-mcp.`,
        `     DO NOT EDIT — regenerate via propose_guideline. -->`,
        "",
    ].join("\n");
}

export function generateGuideline(
    spec: GuidelineSpec,
    brief: Brief,
    tokens: DesignTokens,
): GeneratedFile[] {
    if (!GUIDELINE_NAMES.includes(spec.name)) {
        throw new Error(
            `Unknown guideline "${spec.name}". Allowed: ${GUIDELINE_NAMES.join(", ")}`,
        );
    }
    let body: string;
    switch (spec.name) {
        case "principles":
            body = renderPrinciples(brief);
            break;
        case "voice-and-tone":
            body = renderVoiceAndTone(brief);
            break;
        case "accessibility":
            body = renderAccessibility(brief, tokens);
            break;
        case "color-usage":
            body = renderColorUsage(tokens);
            break;
        case "do-and-dont":
            body = renderDoAndDont(brief);
            break;
    }
    const contents = frontmatter(spec, tokens) + header(spec) + body;
    const dir = `packages/design-system/src/generated/${spec.briefSlug}/guidelines`;
    return [
        {
            path: `${dir}/${spec.name}.md`,
            contents,
            type: "replace",
        },
    ];
}
