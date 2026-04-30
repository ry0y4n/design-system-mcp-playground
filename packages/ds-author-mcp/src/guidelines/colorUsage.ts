/**
 * color-usage.md — derived from synthesized tokens.
 *
 * For every color role in DesignTokens.color, emit:
 *   - the canonical CSS custom property identifier
 *   - the role's intended use (lookup table)
 *   - the resolved light / dark hex values
 *
 * Pure function: same tokens → same Markdown.
 */
import type { ColorTokens, DesignTokens } from "../synth/types.js";

interface RoleDoc {
    /** Dotted role path, e.g. "background.base". */
    path: string;
    /** CSS custom property identifier. */
    varName: string;
    /** Use-case description. */
    use: string;
}

const ROLE_DOCS: RoleDoc[] = [
    // background
    {
        path: "background.base",
        varName: "--color-background-base",
        use: "ページや主要パネルの背景。最も大きい面積を占める色。",
    },
    {
        path: "background.subtle",
        varName: "--color-background-subtle",
        use: "ベース背景の上にある弱いコントラストの面（カード・ヘッダ・サイドバーなど）。",
    },
    // text
    {
        path: "text.primary",
        varName: "--color-text-primary",
        use: "見出し・本文など、可読性が最重要なテキスト。",
    },
    {
        path: "text.secondary",
        varName: "--color-text-secondary",
        use: "補助テキスト・キャプション・メタ情報。本文より弱いが AA は満たす。",
    },
    {
        path: "text.disabled",
        varName: "--color-text-disabled",
        use: "無効化された UI のラベル。3:1 のみ保証されるため大きい文字に限定。",
    },
    {
        path: "text.onBrand",
        varName: "--color-text-on-brand",
        use: "ブランドカラーの上に置く前景テキスト（primary ボタンのラベルなど）。",
    },
    // border
    {
        path: "border.default",
        varName: "--color-border-default",
        use: "入力欄やカードの境界線。UI コンポーネント基準で 3:1 を満たす。",
    },
    {
        path: "border.subtle",
        varName: "--color-border-subtle",
        use: "区切り線・テーブル行間など、視覚的に弱い境界。装飾的な区切りに限る。",
    },
    // brand
    {
        path: "brand.primary",
        varName: "--color-brand-primary",
        use: "主要 CTA・選択状態・進行中インジケータ。「ここを見て」を示すアクセント。",
    },
    {
        path: "brand.primaryHover",
        varName: "--color-brand-primary-hover",
        use: "primary 要素のホバー時の背景色。",
    },
    {
        path: "brand.primaryActive",
        varName: "--color-brand-primary-active",
        use: "primary 要素のアクティブ（押下中）時の背景色。",
    },
    {
        path: "brand.primarySubtle",
        varName: "--color-brand-primary-subtle",
        use: "primary を弱く示す背景（タグ・選択行・無効でないがアクティブでない状態など）。",
    },
    // semantic
    {
        path: "semantic.danger",
        varName: "--color-semantic-danger",
        use: "破壊的アクション・エラー・警告。多用しない（重要度が薄れる）。",
    },
    {
        path: "semantic.success",
        varName: "--color-semantic-success",
        use: "完了・成功・正常状態のフィードバック。",
    },
    // focus
    {
        path: "focus.ring",
        varName: "--color-focus-ring",
        use: "キーボードフォーカスのリング。`:focus-visible` で 2px outline + 2px offset。",
    },
];

function resolve(
    color: ColorTokens,
    dotted: string,
): { light: string; dark: string } | null {
    const parts = dotted.split(".");
    let cur: any = color;
    for (const p of parts) {
        if (cur == null) return null;
        cur = cur[p];
    }
    if (cur && typeof cur === "object" && "light" in cur && "dark" in cur) {
        return { light: cur.light as string, dark: cur.dark as string };
    }
    return null;
}

export function renderColorUsage(tokens: DesignTokens): string {
    const lines: string[] = [];

    lines.push(
        "## How to use color tokens",
        "",
        "All component CSS MUST reference colors via `var(--color-*)` only.",
        "Raw hex / rgb / oklch literals in `*.module.css` are rejected by",
        "`ds-check:tokens`. To introduce a new color, propose a new token first.",
        "",
    );

    lines.push("## Role catalog", "");
    lines.push("| Role | CSS variable | Light | Dark | Use |");
    lines.push("|---|---|---|---|---|");

    for (const doc of ROLE_DOCS) {
        const pair = resolve(tokens.color, doc.path);
        const light = pair ? `\`${pair.light}\`` : "_(unresolved)_";
        const dark = pair ? `\`${pair.dark}\`` : "_(unresolved)_";
        lines.push(
            `| \`${doc.path}\` | \`${doc.varName}\` | ${light} | ${dark} | ${doc.use} |`,
        );
    }
    lines.push("");

    lines.push(
        "## Combining roles",
        "",
        "- Foreground / background pairings are pre-validated by",
        "  `ds-check:contrast` (see `accessibility.md`). Do not invent",
        "  ad-hoc combinations — pick from the matrix.",
        "- `brand.primary*` family is intended for **one** simultaneous focal",
        "  point per screen. If two CTAs compete, the secondary one should",
        "  fall back to `secondary` / `ghost` button variants.",
        "- `semantic.danger` / `semantic.success` carry meaning. Do not use",
        "  them as decorative accents.",
        "",
    );

    return lines.join("\n");
}
