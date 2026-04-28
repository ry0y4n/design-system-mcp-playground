/**
 * Deterministic Button component generator.
 *
 * Produces a complete component package (TSX + module.css + stories + spec + index)
 * from a fixed template, parameterised by:
 *   - briefSlug   : used in import paths and headers
 *   - name        : PascalCase component name (always "Button" for Phase 2)
 *   - variants    : ordered list, MUST include "primary"
 *   - sizes       : ordered list, MUST include "md"
 *
 * NO LLM in this code path. The AI's only freedom is deciding which variants
 * and sizes to declare. CSS values are exclusively `var(--token-*)` references —
 * `ds:check:tokens` enforces this invariant.
 */
export interface ComponentSpec {
  briefSlug: string;
  name: string;
  variants: string[];
  sizes: string[];
}

export interface GeneratedFile {
  /** Path relative to the repo root. */
  path: string;
  contents: string;
  type: "create" | "replace";
}

const KNOWN_VARIANTS: Record<
  string,
  { bg: string; fg: string; border?: string; hoverBg?: string; activeBg?: string }
> = {
  primary: {
    bg: "var(--color-brand-primary)",
    fg: "var(--color-text-on-brand)",
    hoverBg: "var(--color-brand-primary-hover)",
    activeBg: "var(--color-brand-primary-active)",
  },
  secondary: {
    bg: "var(--color-background-base)",
    fg: "var(--color-brand-primary)",
    border: "var(--color-border-default)",
    hoverBg: "var(--color-background-subtle)",
  },
  ghost: {
    bg: "transparent",
    fg: "var(--color-brand-primary)",
    hoverBg: "var(--color-brand-primary-subtle)",
  },
  danger: {
    bg: "var(--color-semantic-danger)",
    fg: "white",
  },
};

const KNOWN_SIZES: Record<
  string,
  { paddingY: string; paddingX: string; radius: string; fontSize: string }
> = {
  sm: {
    paddingY: "var(--space-1)",
    paddingX: "var(--space-3)",
    radius: "var(--radius-sm)",
    fontSize: "var(--typography-body-small-font-size)",
  },
  md: {
    paddingY: "var(--space-2)",
    paddingX: "var(--space-4)",
    radius: "var(--radius-md)",
    fontSize: "var(--typography-body-font-size)",
  },
  lg: {
    paddingY: "var(--space-3)",
    paddingX: "var(--space-6)",
    radius: "var(--radius-md)",
    fontSize: "var(--typography-heading3-font-size)",
  },
};

function ensureKnown(spec: ComponentSpec) {
  if (spec.name !== "Button") {
    throw new Error(`Phase 2 only supports name="Button" (got ${spec.name})`);
  }
  if (!spec.variants.includes("primary")) {
    throw new Error(`variants must include "primary"`);
  }
  if (!spec.sizes.includes("md")) {
    throw new Error(`sizes must include "md"`);
  }
  for (const v of spec.variants) {
    if (!(v in KNOWN_VARIANTS)) {
      throw new Error(
        `Unknown variant "${v}". Allowed: ${Object.keys(KNOWN_VARIANTS).join(", ")}`
      );
    }
  }
  for (const s of spec.sizes) {
    if (!(s in KNOWN_SIZES)) {
      throw new Error(
        `Unknown size "${s}". Allowed: ${Object.keys(KNOWN_SIZES).join(", ")}`
      );
    }
  }
}

function tsxFile(spec: ComponentSpec): string {
  const variantUnion = spec.variants.map((v) => `"${v}"`).join(" | ");
  const sizeUnion = spec.sizes.map((s) => `"${s}"`).join(" | ");
  const defaultVariant = spec.variants[0];
  const defaultSize = spec.sizes.includes("md") ? "md" : spec.sizes[0];
  return `// Generated from Brief "${spec.briefSlug}" — DO NOT EDIT.
// Regenerate via propose_component.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./${spec.name}.module.css";

export type ${spec.name}Variant = ${variantUnion};
export type ${spec.name}Size = ${sizeUnion};

export type ${spec.name}Props = {
  variant?: ${spec.name}Variant;
  size?: ${spec.name}Size;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled">;

const cx = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");

export const ${spec.name} = forwardRef<HTMLButtonElement, ${spec.name}Props>(function ${spec.name}(
  {
    variant = "${defaultVariant}",
    size = "${defaultSize}",
    isLoading = false,
    isDisabled = false,
    leftIcon,
    rightIcon,
    children,
    className,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(
        styles.${spec.name.toLowerCase()},
        styles[\`variant_\${variant}\`],
        styles[\`size_\${size}\`],
        isLoading && styles.loading,
        className
      )}
      disabled={isDisabled || isLoading}
      data-loading={isLoading || undefined}
      {...rest}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
});
`;
}

function moduleCssFile(spec: ComponentSpec): string {
  const lines: string[] = [];
  const baseClass = spec.name.toLowerCase();
  lines.push(
    `/* Generated from Brief "${spec.briefSlug}" — DO NOT EDIT. Regenerate via propose_component. */`,
    `.${baseClass} {`,
    `  display: inline-flex;`,
    `  align-items: center;`,
    `  gap: var(--space-2);`,
    `  border: 1px solid transparent;`,
    `  cursor: pointer;`,
    `  font-family: var(--font-stack);`,
    `  font-weight: 600;`,
    `  transition: background-color 120ms ease, border-color 120ms ease;`,
    `}`,
    `.${baseClass}:focus-visible {`,
    `  outline: 2px solid var(--color-focus-ring);`,
    `  outline-offset: 2px;`,
    `}`,
    `.${baseClass}:disabled {`,
    `  cursor: not-allowed;`,
    `  opacity: 0.6;`,
    `}`,
    `.loading { cursor: progress; }`,
    ``
  );

  for (const s of spec.sizes) {
    const sz = KNOWN_SIZES[s];
    lines.push(
      `.size_${s} {`,
      `  padding: ${sz.paddingY} ${sz.paddingX};`,
      `  border-radius: ${sz.radius};`,
      `  font-size: ${sz.fontSize};`,
      `}`,
      ``
    );
  }

  for (const v of spec.variants) {
    const vd = KNOWN_VARIANTS[v];
    lines.push(`.variant_${v} {`);
    lines.push(`  background: ${vd.bg};`);
    lines.push(`  color: ${vd.fg};`);
    if (vd.border) lines.push(`  border-color: ${vd.border};`);
    lines.push(`}`);
    if (vd.hoverBg) {
      lines.push(
        `.variant_${v}:hover:not(:disabled) {`,
        `  background: ${vd.hoverBg};`,
        `}`
      );
    }
    if (vd.activeBg) {
      lines.push(
        `.variant_${v}:active:not(:disabled) {`,
        `  background: ${vd.activeBg};`,
        `}`
      );
    }
    lines.push(``);
  }
  return lines.join("\n");
}

function storiesFile(spec: ComponentSpec): string {
  const variantList = spec.variants.map((v) => `"${v}"`).join(", ");
  const sizeList = spec.sizes.map((s) => `"${s}"`).join(", ");
  const defSize = spec.sizes.includes("md") ? "md" : spec.sizes[0];
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
  args: { children: "ボタン", variant: "${spec.variants[0]}", size: "${defSize}" },
  argTypes: {
    variant: { control: "inline-radio", options: [${variantList}] },
    size: { control: "inline-radio", options: [${sizeList}] },
  },
};
export default meta;
type Story = StoryObj<typeof ${spec.name}>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
${spec.variants.map((v) => `      <${spec.name} variant="${v}">${v}</${spec.name}>`).join("\n")}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
${spec.sizes.map((s) => `      <${spec.name} size="${s}">${s}</${spec.name}>`).join("\n")}
    </div>
  ),
};
`;
}

function specMd(spec: ComponentSpec): string {
  return `# ${spec.name} (${spec.briefSlug})

Generated from Brand Brief \`${spec.briefSlug}\` by \`ds-author-mcp\`.

## Variants
${spec.variants.map((v) => `- \`${v}\``).join("\n")}

## Sizes
${spec.sizes.map((s) => `- \`${s}\``).join("\n")}

## Token contract
This component MUST only reference design tokens via CSS custom properties
(\`var(--token-*)\`). Raw hex / rgb / px literals are rejected by
\`ds:check:tokens\`. Update the Brief and regenerate; do not hand-edit.
`;
}

function indexTs(spec: ComponentSpec): string {
  return `export { ${spec.name} } from "./${spec.name}.js";
export type { ${spec.name}Props, ${spec.name}Variant, ${spec.name}Size } from "./${spec.name}.js";
`;
}

export function generateComponent(spec: ComponentSpec): GeneratedFile[] {
  ensureKnown(spec);
  const dir = `packages/design-system/src/generated/${spec.briefSlug}/${spec.name}`;
  return [
    { path: `${dir}/${spec.name}.tsx`, contents: tsxFile(spec), type: "replace" },
    { path: `${dir}/${spec.name}.module.css`, contents: moduleCssFile(spec), type: "replace" },
    { path: `${dir}/${spec.name}.stories.tsx`, contents: storiesFile(spec), type: "replace" },
    { path: `${dir}/spec.md`, contents: specMd(spec), type: "replace" },
    { path: `${dir}/index.ts`, contents: indexTs(spec), type: "replace" },
  ];
}
