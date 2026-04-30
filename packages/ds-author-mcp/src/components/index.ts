/**
 * Component generator registry.
 *
 * `propose_component` in the MCP server (`../index.ts`) looks up a generator
 * here by `spec.name`. Each generator owns its own validation rules and
 * file-output template. Adding a new component means:
 *
 *   1. Implement `<name>Generator: ComponentGenerator` in this folder.
 *   2. Register it below.
 *   3. Update the human-facing list in `propose_component.description`.
 *
 * Keeping dispatch + validation here means `index.ts` never knows what
 * variants / sizes a specific component requires — the AI sees the union
 * of allowed names, but rejection messages come from the generators.
 */
import type { ComponentGenerator, ComponentSpec, GeneratedFile } from "./types.js";
import { buttonGenerator } from "./button.js";
import { textFieldGenerator } from "./textField.js";
import { stackGenerator } from "./stack.js";

export type { ComponentGenerator, ComponentSpec, GeneratedFile } from "./types.js";

const REGISTRY: ReadonlyArray<ComponentGenerator> = [
  buttonGenerator,
  textFieldGenerator,
  stackGenerator,
];

/** Sorted, human-readable list of component names this server can propose. */
export const KNOWN_COMPONENT_NAMES: readonly string[] = REGISTRY.map((g) => g.name);

export function getGenerator(name: string): ComponentGenerator {
  const gen = REGISTRY.find((g) => g.name === name);
  if (!gen) {
    throw new Error(
      `Unknown component "${name}". Allowed: ${KNOWN_COMPONENT_NAMES.join(", ")}`
    );
  }
  return gen;
}

/**
 * Validate `spec` ahead of any expensive work (token synth, file IO).
 * Throws Error with a human-readable message on invalid input.
 */
export function validateComponentSpec(spec: ComponentSpec): void {
  getGenerator(spec.name).validate(spec);
}

/** Resolve generator + emit files for a fully validated `spec`. */
export function generateComponentFiles(spec: ComponentSpec): GeneratedFile[] {
  return getGenerator(spec.name).generate(spec);
}
