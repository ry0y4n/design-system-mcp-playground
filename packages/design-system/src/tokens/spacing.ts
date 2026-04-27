import data from "./spacing.json" with { type: "json" };

export type SpacingToken = {
  name: string;
  value: string;
  description: string;
};

export const spacingTokens: SpacingToken[] = data;
