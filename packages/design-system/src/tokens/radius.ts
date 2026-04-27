import data from "./radius.json" with { type: "json" };

export type RadiusToken = {
  name: string;
  value: string;
  description: string;
};

export const radiusTokens: RadiusToken[] = data;
