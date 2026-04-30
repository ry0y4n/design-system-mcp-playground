/**
 * Deterministic TextField component generator.
 *
 * Spec axes:
 *   - variants : visual treatment. MUST include "outline".
 *                Allowed: "outline", "filled", "underline".
 *   - sizes    : control density. MUST include "md".
 *                Allowed: "sm", "md", "lg".
 *
 * Generated component contract:
 *   - Forwards a ref to the underlying `<input>` so consumers can integrate
 *     with form libraries / focus management.
 *   - Owns `<label>`, optional `helperText`, optional `errorMessage` markup.
 *   - Wires `aria-describedby` from input to helper / error text via `useId()`,
 *     so screen readers announce the supporting copy.
 *   - Renders the error block with `role="alert"` only when the error is shown.
 *
 * NO LLM in this code path. All visual values resolve to `var(--token-*)`.
 */
import type {
  ComponentGenerator,
  ComponentSpec,
  GeneratedFile,
} from "./types.js";

const KNOWN_VARIANTS: Record<
  string,
  { background: string; border: string; borderRadius: string }
> = {
  outline: {
    background: "var(--color-background-base)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
  },
  filled: {
    background: "var(--color-background-subtle)",
    border: "1px solid transparent",
    borderRadius: "var(--radius-md)",
  },
  underline: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "0",
  },
};

const KNOWN_SIZES: Record<
  string,
  { paddingY: string; paddingX: string; fontSize: string; lineHeight: string }
> = {
  sm: {
    paddingY: "var(--space-1)",
    paddingX: "var(--space-2)",
    fontSize: "var(--typography-body-small-font-size)",
    lineHeight: "var(--typography-body-small-line-height)",
  },
  md: {
    paddingY: "var(--space-2)",
    paddingX: "var(--space-3)",
    fontSize: "var(--typography-body-font-size)",
    lineHeight: "var(--typography-body-line-height)",
  },
  lg: {
    paddingY: "var(--space-3)",
    paddingX: "var(--space-4)",
    fontSize: "var(--typography-body-font-size)",
    lineHeight: "var(--typography-body-line-height)",
  },
};

type ResolvedSpec = ComponentSpec & { variants: string[]; sizes: string[] };

function ensureValid(spec: ComponentSpec): void {
  if (spec.name !== "TextField") {
    throw new Error(
      `textFieldGenerator only handles name="TextField" (got ${spec.name})`
    );
  }
  const variants = spec.variants ?? [];
  const sizes = spec.sizes ?? [];
  if (variants.length === 0) {
    throw new Error(
      `TextField requires non-empty 'variants'. Allowed: ${Object.keys(KNOWN_VARIANTS).join(", ")} (must include "outline").`
    );
  }
  if (sizes.length === 0) {
    throw new Error(
      `TextField requires non-empty 'sizes'. Allowed: ${Object.keys(KNOWN_SIZES).join(", ")} (must include "md").`
    );
  }
  if (!variants.includes("outline")) {
    throw new Error(`TextField variants must include "outline"`);
  }
  if (!sizes.includes("md")) {
    throw new Error(`TextField sizes must include "md"`);
  }
  for (const v of variants) {
    if (!(v in KNOWN_VARIANTS)) {
      throw new Error(
        `Unknown TextField variant "${v}". Allowed: ${Object.keys(KNOWN_VARIANTS).join(", ")}`
      );
    }
  }
  for (const s of sizes) {
    if (!(s in KNOWN_SIZES)) {
      throw new Error(
        `Unknown TextField size "${s}". Allowed: ${Object.keys(KNOWN_SIZES).join(", ")}`
      );
    }
  }
}

function tsxFile(spec: ResolvedSpec): string {
  const variantUnion = spec.variants.map((v) => `"${v}"`).join(" | ");
  const sizeUnion = spec.sizes.map((s) => `"${s}"`).join(" | ");
  const defaultVariant = spec.variants.includes("outline")
    ? "outline"
    : spec.variants[0];
  const defaultSize = spec.sizes.includes("md") ? "md" : spec.sizes[0];
  return `// Generated from Brief "${spec.briefSlug}" — DO NOT EDIT.
// Regenerate via propose_component.
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./${spec.name}.module.css";

export type ${spec.name}Variant = ${variantUnion};
export type ${spec.name}Size = ${sizeUnion};

export type ${spec.name}Props = {
  label: ReactNode;
  helperText?: ReactNode;
  errorMessage?: ReactNode;
  isInvalid?: boolean;
  variant?: ${spec.name}Variant;
  size?: ${spec.name}Size;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

const cx = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");

export const ${spec.name} = forwardRef<HTMLInputElement, ${spec.name}Props>(function ${spec.name}(
  {
    label,
    helperText,
    errorMessage,
    isInvalid,
    variant = "${defaultVariant}",
    size = "${defaultSize}",
    id,
    className,
    ...rest
  },
  ref
) {
  const reactId = useId();
  const inputId = id ?? \`\${reactId}-input\`;
  const helperId = \`\${reactId}-helper\`;
  const errorId = \`\${reactId}-error\`;
  const showError = Boolean(errorMessage) || isInvalid === true;
  const describedBy = [
    helperText ? helperId : undefined,
    showError && errorMessage ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cx(
          styles.input,
          styles[\`variant_\${variant}\`],
          styles[\`size_\${size}\`]
        )}
        aria-invalid={showError || undefined}
        aria-describedby={describedBy}
        data-error={showError ? "true" : undefined}
        {...rest}
      />
      {helperText ? (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      ) : null}
      {showError && errorMessage ? (
        <p id={errorId} className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
});
`;
}

function moduleCssFile(spec: ResolvedSpec): string {
  const lines: string[] = [];
  lines.push(
    `/* Generated from Brief "${spec.briefSlug}" — DO NOT EDIT. Regenerate via propose_component. */`,
    `.field {`,
    `  display: flex;`,
    `  flex-direction: column;`,
    `  gap: var(--space-1);`,
    `}`,
    ``,
    `.label {`,
    `  color: var(--color-text-primary);`,
    `  font-family: var(--font-stack);`,
    `  font-size: var(--typography-body-small-font-size);`,
    `  line-height: var(--typography-body-small-line-height);`,
    `  font-weight: var(--typography-body-small-font-weight);`,
    `}`,
    ``,
    `.input {`,
    `  font-family: var(--font-stack);`,
    `  color: var(--color-text-primary);`,
    `  background: var(--color-background-base);`,
    `  border: 1px solid var(--color-border-default);`,
    `  border-radius: var(--radius-md);`,
    `  outline: none;`,
    `  transition: border-color 120ms ease, background-color 120ms ease;`,
    `}`,
    `.input:focus-visible {`,
    `  outline: 2px solid var(--color-focus-ring);`,
    `  outline-offset: 2px;`,
    `}`,
    `.input:disabled {`,
    `  opacity: 0.6;`,
    `  cursor: not-allowed;`,
    `}`,
    `.input[data-error="true"] {`,
    `  border-color: var(--color-semantic-danger);`,
    `}`,
    `.input::placeholder {`,
    `  color: var(--color-text-secondary);`,
    `}`,
    ``,
    `.helper {`,
    `  color: var(--color-text-secondary);`,
    `  font-family: var(--font-stack);`,
    `  font-size: var(--typography-caption-font-size);`,
    `  line-height: var(--typography-caption-line-height);`,
    `  margin: 0;`,
    `}`,
    `.error {`,
    `  color: var(--color-semantic-danger);`,
    `  font-family: var(--font-stack);`,
    `  font-size: var(--typography-caption-font-size);`,
    `  line-height: var(--typography-caption-line-height);`,
    `  margin: 0;`,
    `}`,
    ``
  );

  for (const s of spec.sizes) {
    const sz = KNOWN_SIZES[s];
    lines.push(
      `.size_${s} {`,
      `  padding: ${sz.paddingY} ${sz.paddingX};`,
      `  font-size: ${sz.fontSize};`,
      `  line-height: ${sz.lineHeight};`,
      `}`,
      ``
    );
  }

  for (const v of spec.variants) {
    const vd = KNOWN_VARIANTS[v];
    lines.push(
      `.variant_${v} {`,
      `  background: ${vd.background};`,
      `  border: ${vd.border};`,
      `  border-radius: ${vd.borderRadius};`,
      `}`
    );
    if (v === "underline") {
      lines.push(
        `.variant_${v} {`,
        `  border-bottom-color: var(--color-border-default);`,
        `}`
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function storiesFile(spec: ResolvedSpec): string {
  const variantList = spec.variants.map((v) => `"${v}"`).join(", ");
  const sizeList = spec.sizes.map((s) => `"${s}"`).join(", ");
  const defaultVariant = spec.variants.includes("outline")
    ? "outline"
    : spec.variants[0];
  const defaultSize = spec.sizes.includes("md") ? "md" : spec.sizes[0];
  return `// Generated — DO NOT EDIT.
import "../tokens.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ${spec.name} } from "./${spec.name}.js";

const meta: Meta<typeof ${spec.name}> = {
  title: "Generated/${spec.briefSlug}/${spec.name}",
  component: ${spec.name},
  decorators: [
    (Story) => (
      <div data-brief="${spec.briefSlug}" style={{ padding: 16, maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    label: "ラベル",
    placeholder: "テキストを入力",
    variant: "${defaultVariant}",
    size: "${defaultSize}",
  },
  argTypes: {
    variant: { control: "inline-radio", options: [${variantList}] },
    size: { control: "inline-radio", options: [${sizeList}] },
  },
};
export default meta;
type Story = StoryObj<typeof ${spec.name}>;

export const Default: Story = {};

export const WithHelper: Story = {
  args: { helperText: "8 文字以上の英数字" },
};

export const WithError: Story = {
  args: { errorMessage: "必須項目です", isInvalid: true, defaultValue: "" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "編集できない値" },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
${spec.variants
  .map(
    (v) => `      <${spec.name} variant="${v}" label="variant=${v}" placeholder="${v}" />`
  )
  .join("\n")}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
${spec.sizes
  .map(
    (s) => `      <${spec.name} size="${s}" label="size=${s}" placeholder="${s}" />`
  )
  .join("\n")}
    </div>
  ),
};
`;
}

function specMd(spec: ResolvedSpec): string {
  return `# ${spec.name} (${spec.briefSlug})

Generated from Brand Brief \`${spec.briefSlug}\` by \`ds-author-mcp\`.

## Summary

ラベル付き 1 行入力フィールド。helper / error メッセージと aria-describedby
の配線をコンポーネント側で担保する。

## Variants
${spec.variants.map((v) => `- \`${v}\``).join("\n")}

## Sizes
${spec.sizes.map((s) => `- \`${s}\``).join("\n")}

## Accessibility

- \`<label htmlFor>\` と \`<input id>\` を \`useId()\` で常に結びつける。
- \`helperText\` / \`errorMessage\` は \`aria-describedby\` で input にリンクされる。
- \`errorMessage\` 表示時は input が \`aria-invalid="true"\` になり、エラー本文に
  \`role="alert"\` が付与される。
- \`forwardRef<HTMLInputElement>\` で外部 ref を input に渡せる。

## Token contract

This component MUST only reference design tokens via CSS custom properties
(\`var(--token-*)\`). Raw hex / rgb / px literals are rejected by
\`ds:check:tokens\`. Update the Brief and regenerate; do not hand-edit.
`;
}

function indexTs(spec: ResolvedSpec): string {
  return `export { ${spec.name} } from "./${spec.name}.js";
export type { ${spec.name}Props, ${spec.name}Variant, ${spec.name}Size } from "./${spec.name}.js";
`;
}

export function generateTextField(spec: ComponentSpec): GeneratedFile[] {
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

export const textFieldGenerator: ComponentGenerator = {
  name: "TextField",
  validate: ensureValid,
  generate: generateTextField,
};
