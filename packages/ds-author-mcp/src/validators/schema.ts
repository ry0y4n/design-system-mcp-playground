/**
 * Validate a tokens.json blob against a minimal JSON Schema for DesignTokens.
 *
 * Intentionally permissive on extension fields — we only enforce the shape
 * that downstream tooling depends on.
 */
import { default as Ajv } from "ajv";

const colorPair = {
  type: "object",
  required: ["light", "dark"],
  properties: {
    light: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
    dark: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
  },
} as const;

const tokensSchema = {
  type: "object",
  required: ["meta", "color", "space", "radius", "typography"],
  properties: {
    meta: {
      type: "object",
      required: ["sourceBriefSlug", "synthVersion"],
      properties: {
        sourceBriefSlug: { type: "string" },
        sourceBriefVersion: { type: "string" },
        generatedAt: { type: "string" },
        synthVersion: { type: "string" },
      },
    },
    color: {
      type: "object",
      required: ["background", "text", "border", "brand", "semantic", "focus"],
      properties: {
        background: {
          type: "object",
          required: ["base", "subtle"],
          properties: { base: colorPair, subtle: colorPair },
        },
        text: {
          type: "object",
          required: ["primary", "secondary", "disabled", "onBrand"],
          properties: {
            primary: colorPair,
            secondary: colorPair,
            disabled: colorPair,
            onBrand: colorPair,
          },
        },
        border: {
          type: "object",
          required: ["default", "subtle"],
          properties: { default: colorPair, subtle: colorPair },
        },
        brand: {
          type: "object",
          required: ["primary", "primaryHover", "primaryActive", "primarySubtle"],
          properties: {
            primary: colorPair,
            primaryHover: colorPair,
            primaryActive: colorPair,
            primarySubtle: colorPair,
          },
        },
        semantic: {
          type: "object",
          required: ["danger", "success"],
          properties: { danger: colorPair, success: colorPair },
        },
        focus: {
          type: "object",
          required: ["ring"],
          properties: { ring: colorPair },
        },
      },
    },
    space: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    radius: {
      type: "object",
      required: ["none", "sm", "md", "lg", "full"],
    },
    typography: { type: "object" },
  },
} as const;

export function checkSchema(tokens: unknown): string[] {
  const ajv = new (Ajv as unknown as typeof import("ajv").default)({ allErrors: true, strict: false });
  const validate = ajv.compile(tokensSchema);
  if (validate(tokens)) return [];
  return (validate.errors ?? []).map((e: any) => `${e.instancePath || "(root)"} ${e.message}`);
}
