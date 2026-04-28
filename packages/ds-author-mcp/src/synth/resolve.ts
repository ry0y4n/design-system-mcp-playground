/**
 * Helper: walk a DesignTokens "color" sub-object by dotted role path.
 * e.g. resolveRole(tokens.color, "text.primary", "light") → "#1a1d21"
 */
import type { ColorTokens } from "./types.js";

export function resolveRole(
  color: ColorTokens,
  rolePath: string,
  mode: "light" | "dark"
): string | null {
  // Convert "brand.primary" -> ["brand", "primary"], "brand.primaryHover" stays as-is
  const parts = rolePath.split(".");
  let cur: any = color;
  for (const p of parts) {
    if (cur == null) return null;
    cur = cur[p];
  }
  if (cur && typeof cur === "object" && mode in cur) return cur[mode] as string;
  return null;
}
