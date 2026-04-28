/**
 * Brand Brief loader & types. Loads YAML, validates against the JSON Schema
 * shipped from packages/brand-brief.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { default as Ajv } from "ajv";
import { default as addFormats } from "ajv-formats";

export interface Brief {
  meta: {
    name: string;
    slug?: string;
    version: string;
    createdAt?: string;
    author?: string;
  };
  philosophy: {
    mission: string;
    principles: string[];
    antiPrinciples?: string[];
  };
  brand: {
    colors: {
      primarySeed: string;
      secondarySeed?: string;
      accentSeed?: string;
      neutralBase?: "cool" | "neutral" | "warm";
    };
    typography?: {
      fontStackPreference?:
        | "geometric-sans"
        | "humanist-sans"
        | "neo-grotesque"
        | "serif"
        | "system";
      scaleRatio?: number;
    };
    spacingScale?: "tight" | "normal" | "spacious";
    radiusScale?: "sharp" | "soft" | "round";
    tone: {
      formality: "casual" | "neutral" | "formal";
      energy: "calm" | "balanced" | "energetic";
      voice?: string;
    };
  };
  audience: {
    primary: string;
    secondary?: string;
    accessibility?: {
      wcagLevel?: "AA" | "AAA";
      darkMode?: boolean;
      reducedMotion?: boolean;
    };
  };
  constraints: {
    mustHave: string[];
    mustNot?: string[];
    references?: string[];
  };
}

export interface BriefValidationOk {
  ok: true;
  brief: Brief;
}
export interface BriefValidationErr {
  ok: false;
  errors: string[];
}

export function loadBrief(yamlPath: string, schemaPath: string): BriefValidationOk | BriefValidationErr {
  const raw = readFileSync(resolve(yamlPath), "utf8");
  let doc: unknown;
  try {
    doc = YAML.parse(raw);
  } catch (e) {
    return { ok: false, errors: [`YAML parse error: ${(e as Error).message}`] };
  }

  const schema = JSON.parse(readFileSync(resolve(schemaPath), "utf8"));
  const ajv = new (Ajv as unknown as typeof import("ajv").default)({ allErrors: true, strict: false });
  (addFormats as unknown as typeof import("ajv-formats").default)(ajv);
  const validate = ajv.compile(schema);

  if (!validate(doc)) {
    return {
      ok: false,
      errors: (validate.errors ?? []).map((e: any) => `${e.instancePath || "(root)"} ${e.message}`),
    };
  }

  return { ok: true, brief: doc as Brief };
}
