/**
 * voice-and-tone.md — derived from `brand.tone`.
 *
 * Each tone axis (formality / energy) has a small lookup table of
 * "do this / avoid that" snippets. The Brief's `tone.voice` free-text
 * is included verbatim. Pure function: same Brief → same Markdown.
 */
import type { Brief } from "../brief.js";

type Formality = Brief["brand"]["tone"]["formality"];
type Energy = Brief["brand"]["tone"]["energy"];

const FORMALITY_GUIDE: Record<Formality, { good: string[]; avoid: string[] }> =
    {
        casual: {
            good: [
                "二人称（あなた / きみ）で語りかける",
                "短い文・口語表現を許容する",
                "一人称の存在感を出す（「私たちは…」）",
            ],
            avoid: [
                "敬語の過剰連発（「〜させていただきます」）",
                "翻訳調・受動形の多用",
            ],
        },
        neutral: {
            good: [
                "丁寧体（です・ます）で統一する",
                "業界用語より一般語を優先する",
                "主語を曖昧にしない（誰が何をするのか明示）",
            ],
            avoid: [
                "過度なフレンドリー表現（絵文字・感嘆符の連発）",
                "硬すぎる漢語表現",
            ],
        },
        formal: {
            good: [
                "敬体・能動態を基本に、肩書や役割を明示する",
                "事実・手順・根拠を先に述べる",
                "数字・固有名詞を省略しない",
            ],
            avoid: [
                "口語表現・略語",
                "曖昧な指示語（「これ」「あれ」を主語に立てる）",
            ],
        },
    };

const ENERGY_GUIDE: Record<Energy, { good: string[]; avoid: string[] }> = {
    calm: {
        good: [
            "落ち着いた断定で結論を述べる",
            "感嘆符（!）は使わない",
            "余白と段落で「呼吸」を作る",
        ],
        avoid: ["煽り表現（「今すぐ」「絶対」）", "全文 BOLD・全文大文字"],
    },
    balanced: {
        good: [
            "重要箇所のみ強調する（太字は段落に 1 箇所まで）",
            "感嘆符は感情表現が必要なときに限り 1 文に 1 つ",
        ],
        avoid: ["全文を強調する", "極端に長い文と極端に短い文の混在"],
    },
    energetic: {
        good: [
            "短文・体言止めでテンポを作る",
            "動詞を文頭・命令形を活用",
            "重要語は太字や色で素早く識別できるようにする",
        ],
        avoid: ["回りくどい前置き", "受動態・婉曲表現"],
    },
};

function table2(rows: Array<[string, string]>): string {
    return [
        "| Axis | Value |",
        "|---|---|",
        ...rows.map(([k, v]) => `| ${k} | ${v} |`),
    ].join("\n");
}

export function renderVoiceAndTone(brief: Brief): string {
    const tone = brief.brand.tone;
    const formality = FORMALITY_GUIDE[tone.formality];
    const energy = ENERGY_GUIDE[tone.energy];

    const lines: string[] = [];

    lines.push(
        "## Tone profile",
        "",
        table2([
            ["Formality", `\`${tone.formality}\``],
            ["Energy", `\`${tone.energy}\``],
            [
                "Voice (free text)",
                tone.voice ? tone.voice : "_(not specified)_",
            ],
        ]),
        "",
    );

    lines.push(`## Formality — \`${tone.formality}\``, "");
    lines.push("**Do**");
    for (const g of formality.good) lines.push(`- ✓ ${g}`);
    lines.push("", "**Avoid**");
    for (const a of formality.avoid) lines.push(`- ✗ ${a}`);
    lines.push("");

    lines.push(`## Energy — \`${tone.energy}\``, "");
    lines.push("**Do**");
    for (const g of energy.good) lines.push(`- ✓ ${g}`);
    lines.push("", "**Avoid**");
    for (const a of energy.avoid) lines.push(`- ✗ ${a}`);
    lines.push("");

    if (tone.voice) {
        lines.push(
            "## Voice",
            "",
            "The Brand Brief describes the brand's voice as:",
            "",
            `> ${tone.voice}`,
            "",
            "All copy across UI surfaces (buttons, empty states, error messages,",
            "onboarding) must read as if it were spoken in that voice. When in",
            "doubt, read your draft aloud against the description above.",
            "",
        );
    }

    return lines.join("\n");
}
