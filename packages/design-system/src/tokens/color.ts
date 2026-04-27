import data from "./color.json" with { type: "json" };

export type ColorToken = {
  name: string;
  value: string;
  role: string;
};

export const colorTokens: ColorToken[] = data;
