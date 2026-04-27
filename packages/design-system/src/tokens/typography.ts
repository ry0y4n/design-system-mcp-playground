import data from "./typography.json" with { type: "json" };

export type TypographyToken = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  description: string;
};

export const typographyTokens: TypographyToken[] = data;
