/**
 * Shared types for component generators.
 *
 * Each registered component (Button / TextField / Stack / ...) implements
 * `ComponentGenerator`. The MCP server (`index.ts`) dispatches `propose_component`
 * to a generator based on `spec.name`, calling `validate(spec)` first
 * (fail-fast, before token synth) and then `generate(spec)`.
 *
 * NO LLM in any generator. The AI's only freedom is choosing variants and sizes
 * from the allow-list each generator declares; CSS values must come from
 * `var(--token-*)` so `tokens-coverage` validator passes.
 */

export interface ComponentSpec {
  briefSlug: string;
  name: string;
  /** Optional. Each generator declares whether it accepts variants. */
  variants?: string[];
  /** Optional. Each generator declares whether it accepts sizes. */
  sizes?: string[];
}

export interface GeneratedFile {
  /** Path relative to the repo root. */
  path: string;
  contents: string;
  type: "create" | "replace";
}

export interface ComponentGenerator {
  /** PascalCase component name, e.g. "Button". */
  readonly name: string;
  /**
   * Validate `spec` ahead of expensive work (token synth, file IO).
   * Throws Error with a human-readable message on invalid input.
   */
  validate(spec: ComponentSpec): void;
  /**
   * Produce the file list for this component package. Implementations MUST
   * call `validate(spec)` again internally so direct callers cannot bypass
   * the checks.
   */
  generate(spec: ComponentSpec): GeneratedFile[];
}
