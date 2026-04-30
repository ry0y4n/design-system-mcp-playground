/**
 * Deterministic Stack component generator.
 *
 * Stack is a layout primitive. Unlike Button it has only a single varying
 * axis (direction), and its `gap` is wired to the spacing token scale via
 * `data-gap="N"` selectors so that no raw px literals leak into CSS.
 *
 * Spec axes:
 *   - variants : direction tokens. MUST include "vertical".
 *                Allowed: "vertical", "horizontal".
 *                The generated `StackDirection` union is narrowed to
 *                `spec.variants`, so a Stack proposed with
 *                `variants: ["vertical"]` rejects horizontal at the type level.
 *   - sizes    : NOT accepted. Stack has no scale axis at generation time.
 *                Passing a non-empty `sizes` is a fail-fast error.
 *
 * Runtime props that stay flexible (not part of the proposal axes):
 *   - gap      : 1 | 2 | 3 | 4 | 6 | 8 — hard-coded to the spacing keys that
 *                exist in synthesized `tokens.space`. Never extend this list
 *                without first adding the corresponding `--space-*` token.
 *   - align    : start | center | end | stretch
 *   - justify  : start | center | end | between
 *
 * NO LLM in this code path. All visual values resolve to `var(--token-*)`.
 */
import type {
  ComponentGenerator,
  ComponentSpec,
  GeneratedFile,
} from "./types.js";

const ALLOWED_DIRECTIONS = ["vertical", "horizontal"] as const;
const REQUIRED_DIRECTION = "vertical";

/**
 * Spacing keys that exist in `tokens.space` for every Brief synth output.
 * Stack's CSS only emits `--space-*` references for these keys, guaranteeing
 * the generated `.module.css` references variables that always resolve.
 */
const STACK_GAP_KEYS = ["1", "2", "3", "4", "6", "8"] as const;

const ALIGN_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

const JUSTIFY_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

type ResolvedSpec = ComponentSpec & { variants: string[] };

function ensureValid(spec: ComponentSpec): void {
  if (spec.name !== "Stack") {
    throw new Error(`stackGenerator only handles name="Stack" (got ${spec.name})`);
  }
  const variants = spec.variants ?? [];
  if (variants.length === 0) {
    throw new Error(
      `Stack requires non-empty 'variants' (direction). Allowed: ${ALLOWED_DIRECTIONS.join(", ")} (must include "${REQUIRED_DIRECTION}").`
    );
  }
  if (!variants.includes(REQUIRED_DIRECTION)) {
    throw new Error(`Stack variants must include "${REQUIRED_DIRECTION}"`);
  }
  for (const v of variants) {
    if (!(ALLOWED_DIRECTIONS as readonly string[]).includes(v)) {
      throw new Error(
        `Unknown Stack direction "${v}". Allowed: ${ALLOWED_DIRECTIONS.join(", ")}`
      );
    }
  }
  if (spec.sizes && spec.sizes.length > 0) {
    throw new Error(
      `Stack does not accept 'sizes' — gap is a runtime prop bound to the spacing token scale. Omit 'sizes' or pass [].`
    );
  }
}

function tsxFile(spec: ResolvedSpec): string {
  const directionUnion = spec.variants.map((v) => `"${v}"`).join(" | ");
  const defaultDirection = spec.variants.includes("vertical")
    ? "vertical"
    : spec.variants[0];
  const gapUnion = STACK_GAP_KEYS.join(" | ");
  return `// Generated from Brief "${spec.briefSlug}" — DO NOT EDIT.
// Regenerate via propose_component.
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import styles from "./${spec.name}.module.css";

export type ${spec.name}Direction = ${directionUnion};
export type ${spec.name}Gap = ${gapUnion};
export type ${spec.name}Align = "start" | "center" | "end" | "stretch";
export type ${spec.name}Justify = "start" | "center" | "end" | "between";

export type ${spec.name}Props = {
  direction?: ${spec.name}Direction;
  gap?: ${spec.name}Gap;
  align?: ${spec.name}Align;
  justify?: ${spec.name}Justify;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

const cx = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");

export const ${spec.name} = forwardRef<HTMLDivElement, ${spec.name}Props>(function ${spec.name}(
  {
    direction = "${defaultDirection}",
    gap = 3,
    align = "stretch",
    justify = "start",
    children,
    className,
    ...rest
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={cx(
        styles.${spec.name.toLowerCase()},
        styles[\`variant_\${direction}\`],
        className
      )}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      {...rest}
    >
      {children}
    </div>
  );
});
`;
}

function moduleCssFile(spec: ResolvedSpec): string {
  const lines: string[] = [];
  const baseClass = spec.name.toLowerCase();
  lines.push(
    `/* Generated from Brief "${spec.briefSlug}" — DO NOT EDIT. Regenerate via propose_component. */`,
    `.${baseClass} {`,
    `  display: flex;`,
    `}`,
    ``
  );

  for (const v of spec.variants) {
    lines.push(
      `.variant_${v} {`,
      `  flex-direction: ${v === "vertical" ? "column" : "row"};`,
      `}`,
      ``
    );
  }

  for (const key of STACK_GAP_KEYS) {
    lines.push(`.${baseClass}[data-gap="${key}"] { gap: var(--space-${key}); }`);
  }
  lines.push(``);

  for (const [k, v] of Object.entries(ALIGN_MAP)) {
    lines.push(`.${baseClass}[data-align="${k}"] { align-items: ${v}; }`);
  }
  lines.push(``);

  for (const [k, v] of Object.entries(JUSTIFY_MAP)) {
    lines.push(`.${baseClass}[data-justify="${k}"] { justify-content: ${v}; }`);
  }
  lines.push(``);

  return lines.join("\n");
}

function storiesFile(spec: ResolvedSpec): string {
  const directionList = spec.variants.map((v) => `"${v}"`).join(", ");
  const defaultDirection = spec.variants.includes("vertical")
    ? "vertical"
    : spec.variants[0];
  return `// Generated — DO NOT EDIT.
import "../tokens.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ${spec.name} } from "./${spec.name}.js";

const meta: Meta<typeof ${spec.name}> = {
  title: "Generated/${spec.briefSlug}/${spec.name}",
  component: ${spec.name},
  decorators: [
    (Story) => (
      <div data-brief="${spec.briefSlug}" style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  args: { direction: "${defaultDirection}", gap: 3, align: "stretch", justify: "start" },
  argTypes: {
    direction: { control: "inline-radio", options: [${directionList}] },
    gap: { control: "inline-radio", options: [${STACK_GAP_KEYS.join(", ")}] },
    align: { control: "inline-radio", options: ["start", "center", "end", "stretch"] },
    justify: { control: "inline-radio", options: ["start", "center", "end", "between"] },
  },
};
export default meta;
type Story = StoryObj<typeof ${spec.name}>;

const Box = ({ label }: { label: string }) => (
  <div style={{ padding: 12, background: "var(--color-background-subtle)", color: "var(--color-text-primary)" }}>
    {label}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <${spec.name} {...args}>
      <Box label="A" />
      <Box label="B" />
      <Box label="C" />
    </${spec.name}>
  ),
};

export const AllDirections: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
${spec.variants
  .map(
    (v) => `      <div>
        <small>{"direction=${v}"}</small>
        <${spec.name} direction="${v}" gap={3}>
          <Box label="1" />
          <Box label="2" />
          <Box label="3" />
        </${spec.name}>
      </div>`
  )
  .join("\n")}
    </div>
  ),
};

export const GapScale: Story = {
  name: "Gap scale",
  render: () => (
    <${spec.name} direction="vertical" gap={4}>
${STACK_GAP_KEYS.map(
  (g) => `      <div>
        <small>{"gap=${g}"}</small>
        <${spec.name} direction="horizontal" gap={${g}}>
          <Box label="A" />
          <Box label="B" />
          <Box label="C" />
        </${spec.name}>
      </div>`
).join("\n")}
    </${spec.name}>
  ),
};
`;
}

function specMd(spec: ResolvedSpec): string {
  return `# ${spec.name} (${spec.briefSlug})

Generated from Brand Brief \`${spec.briefSlug}\` by \`ds-author-mcp\`.

## Summary

子要素を一定の方向・間隔で並べるレイアウトプリミティブ。

## Directions
${spec.variants.map((v) => `- \`${v}\``).join("\n")}

## Runtime props

| Name | Type | Default | Description |
|---|---|---|---|
| direction | \`${spec.variants.map((v) => `"${v}"`).join(" | ")}\` | \`"${spec.variants.includes("vertical") ? "vertical" : spec.variants[0]}"\` | 並べ方向。生成時の variants に含まれた値のみ受理。 |
| gap | \`${STACK_GAP_KEYS.join(" | ")}\` | \`3\` | spacing トークン (\`--space-{n}\`) に対応する子要素間の余白。 |
| align | \`"start" | "center" | "end" | "stretch"\` | \`"stretch"\` | 交差軸方向の揃え。 |
| justify | \`"start" | "center" | "end" | "between"\` | \`"start"\` | 主軸方向の揃え。 |

## Token contract

This component MUST only reference design tokens via CSS custom properties
(\`var(--token-*)\`). Raw hex / rgb / px literals are rejected by
\`ds:check:tokens\`. Update the Brief and regenerate; do not hand-edit.
`;
}

function indexTs(spec: ResolvedSpec): string {
  return `export { ${spec.name} } from "./${spec.name}.js";
export type { ${spec.name}Props, ${spec.name}Direction, ${spec.name}Gap, ${spec.name}Align, ${spec.name}Justify } from "./${spec.name}.js";
`;
}

export function generateStack(spec: ComponentSpec): GeneratedFile[] {
  ensureValid(spec);
  const resolved = spec as ResolvedSpec;
  const dir = `packages/design-system/src/generated/${resolved.briefSlug}/${resolved.name}`;
  return [
    { path: `${dir}/${resolved.name}.tsx`, contents: tsxFile(resolved), type: "replace" },
    { path: `${dir}/${resolved.name}.module.css`, contents: moduleCssFile(resolved), type: "replace" },
    { path: `${dir}/${resolved.name}.stories.tsx`, contents: storiesFile(resolved), type: "replace" },
    { path: `${dir}/spec.md`, contents: specMd(resolved), type: "replace" },
    { path: `${dir}/index.ts`, contents: indexTs(resolved), type: "replace" },
  ];
}

export const stackGenerator: ComponentGenerator = {
  name: "Stack",
  validate: ensureValid,
  generate: generateStack,
};
