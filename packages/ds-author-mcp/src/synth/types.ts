/**
 * Design token shape produced by the synth engine and consumed by validators.
 *
 * Per role, both light and dark mode hex values are emitted. The role set is
 * the minimum semantic matrix from plan.md §5.7.
 */
export interface ColorRolePair {
  light: string; // #rrggbb
  dark: string; // #rrggbb
}

export interface ColorTokens {
  background: {
    base: ColorRolePair;
    subtle: ColorRolePair;
  };
  text: {
    primary: ColorRolePair;
    secondary: ColorRolePair;
    disabled: ColorRolePair;
    onBrand: ColorRolePair;
  };
  border: {
    default: ColorRolePair;
    subtle: ColorRolePair;
  };
  brand: {
    primary: ColorRolePair;
    primaryHover: ColorRolePair;
    primaryActive: ColorRolePair;
    primarySubtle: ColorRolePair;
  };
  semantic: {
    danger: ColorRolePair;
    success: ColorRolePair;
  };
  focus: {
    ring: ColorRolePair;
  };
}

export interface SpacingTokens {
  /** All values are CSS pixel strings (e.g. "0", "4px", "8px"). */
  [scale: string]: string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface TypographyToken {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
}

export interface TypographyTokens {
  body: TypographyToken;
  bodySmall: TypographyToken;
  caption: TypographyToken;
  heading1: TypographyToken;
  heading2: TypographyToken;
  heading3: TypographyToken;
}

export interface DesignTokens {
  meta: {
    sourceBriefSlug: string;
    sourceBriefVersion: string;
    generatedAt: string;
    synthVersion: string;
  };
  color: ColorTokens;
  space: SpacingTokens;
  radius: RadiusTokens;
  typography: TypographyTokens;
}

/** The role-pair matrix used for contrast validation. */
export interface RolePair {
  fg: string; // dotted role path, e.g. "text.primary"
  bg: string;
  level: "AA" | "AAA";
  /** Whether this is large text (> 18pt or 14pt bold). Affects WCAG threshold. */
  largeText?: boolean;
  /** Whether this is a UI component / non-text contrast (3:1). */
  uiComponent?: boolean;
}

/** Default role pair matrix (light & dark both checked). */
export const DEFAULT_ROLE_PAIRS: RolePair[] = [
  { fg: "text.primary", bg: "background.base", level: "AA" },
  { fg: "text.primary", bg: "background.subtle", level: "AA" },
  { fg: "text.secondary", bg: "background.base", level: "AA" },
  { fg: "text.disabled", bg: "background.base", level: "AA", largeText: true },
  { fg: "text.onBrand", bg: "brand.primary", level: "AA" },
  { fg: "brand.primary", bg: "background.base", level: "AA", uiComponent: true },
  {
    fg: "border.default",
    bg: "background.base",
    level: "AA",
    uiComponent: true,
  },
  { fg: "semantic.danger", bg: "background.base", level: "AA", uiComponent: true },
  { fg: "semantic.success", bg: "background.base", level: "AA", uiComponent: true },
  { fg: "focus.ring", bg: "background.base", level: "AA", uiComponent: true },
];
