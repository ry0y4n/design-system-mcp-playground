import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonContent } from "./_helpers.js";
import { loadComponentSummaries, loadComponentDetail } from "../loaders/loadComponents.js";
import {
  loadColorTokens,
  loadRadiusTokens,
  loadTypographyTokens,
  loadSpacingTokens
} from "../loaders/loadTokens.js";
import { loadIcons } from "../loaders/loadIcons.js";
import {
  briefExists,
  listBriefs,
  loadBriefColorTokens,
  loadBriefComponentDetail,
  loadBriefComponentSummaries,
  loadBriefProvenance,
  loadBriefRadiusTokens,
  loadBriefSpacingTokens,
  loadBriefTypographyTokens,
} from "../loaders/loadBriefs.js";

const briefArg = z
  .string()
  .optional()
  .describe(
    "Optional Brand Brief slug (e.g. 'aurora', 'nova'). When set, reads ds-author-mcp generated artifacts under src/generated/<slug>/. When omitted, returns the legacy hand-authored design system. Use get_briefs to discover available slugs."
  );

async function unknownBrief(slug: string) {
  const known = (await listBriefs()).map((b) => b.slug);
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text:
          `Brief '${slug}' は見つかりませんでした。get_briefs で利用可能な slug を確認してください。known briefs: [${known.join(", ") || "(none)"}]`,
      },
    ],
  };
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_briefs",
    {
      title: "List available Brand Briefs",
      description:
        "ds-author-mcp の propose_tokens / propose_component で生成された Brand Brief 一覧を返します。各 brief は独立したデザインシステム（色・余白・コンポーネント）を持ちます。get_components / get_*_tokens / get_component の brief 引数にここで返る slug を渡してください。",
      inputSchema: {},
    },
    async () => {
      const briefs = await listBriefs();
      return jsonContent({ briefs });
    }
  );

  server.registerTool(
    "get_components",
    {
      title: "Get component list",
      description:
        "デザインシステムに含まれるコンポーネントの一覧（名前・概要・タグのみ）を返します。実装する UI を組み立てる前に最初に呼び、利用可能なコンポーネントを把握してください。詳細な props や使用例は get_component を使って個別に取得します。brief を指定すると Brief 由来の生成コンポーネント（src/generated/<slug>/）を返します。",
      inputSchema: { brief: briefArg }
    },
    async ({ brief }) => {
      if (brief) {
        if (!(await briefExists(brief))) return unknownBrief(brief);
        return jsonContent({ brief, components: await loadBriefComponentSummaries(brief) });
      }
      return jsonContent({ components: await loadComponentSummaries() });
    }
  );

  server.registerTool(
    "get_component",
    {
      title: "Get component detail",
      description:
        "指定したコンポーネントの詳細（説明・props・使用例・関連コンポーネント・利用するデザイントークン）を Markdown 形式で返します。get_components の結果から実装に使うコンポーネントを選んで本ツールを呼んでください。brief を指定すると Brief 由来の生成コンポーネント（src/generated/<slug>/<Name>/spec.md）を返します。",
      inputSchema: {
        name: z
          .string()
          .describe("コンポーネント名 (例: 'Button', 'TextField')。get_components の name と一致する文字列。"),
        brief: briefArg
      }
    },
    async ({ name, brief }) => {
      if (brief) {
        if (!(await briefExists(brief))) return unknownBrief(brief);
        const detail = await loadBriefComponentDetail(brief, name);
        if (!detail) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `Component '${name}' は brief '${brief}' に見つかりませんでした。get_components({ brief: '${brief}' }) で確認してください。`
              }
            ]
          };
        }
        return jsonContent({ brief, ...detail });
      }
      const detail = await loadComponentDetail(name);
      if (!detail) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Component '${name}' は見つかりませんでした。get_components で正しい名前を確認してください。`
            }
          ]
        };
      }
      return jsonContent(detail);
    }
  );

  server.registerTool(
    "get_color_tokens",
    {
      title: "Get color tokens",
      description:
        "カラーデザイントークンの一覧を返します。CSS color や Tailwind クラスの代わりに、必ずこのトークン名（または対応する value）を使ってください。brief を指定すると Brief 由来の light/dark role pair を平坦化したトークン一覧を返します。",
      inputSchema: { brief: briefArg }
    },
    async ({ brief }) => {
      if (brief) {
        if (!(await briefExists(brief))) return unknownBrief(brief);
        return jsonContent({ brief, colors: await loadBriefColorTokens(brief) });
      }
      return jsonContent({ colors: await loadColorTokens() });
    }
  );

  server.registerTool(
    "get_radius_tokens",
    {
      title: "Get radius tokens",
      description: "border-radius のデザイントークン一覧。Card / Button / Dialog 等に適用します。brief を指定すると Brief 由来の radius スケールを返します。",
      inputSchema: { brief: briefArg }
    },
    async ({ brief }) => {
      if (brief) {
        if (!(await briefExists(brief))) return unknownBrief(brief);
        return jsonContent({ brief, radii: await loadBriefRadiusTokens(brief) });
      }
      return jsonContent({ radii: await loadRadiusTokens() });
    }
  );

  server.registerTool(
    "get_typography_tokens",
    {
      title: "Get typography tokens",
      description: "fontSize / lineHeight / fontWeight をひとまとめにしたタイポグラフィトークン。見出し・本文・ボタンラベル等に適用します。brief を指定すると Brief 由来の typography role を返します。",
      inputSchema: { brief: briefArg }
    },
    async ({ brief }) => {
      if (brief) {
        if (!(await briefExists(brief))) return unknownBrief(brief);
        return jsonContent({ brief, typography: await loadBriefTypographyTokens(brief) });
      }
      return jsonContent({ typography: await loadTypographyTokens() });
    }
  );

  server.registerTool(
    "get_spacing_tokens",
    {
      title: "Get spacing tokens",
      description: "padding / margin / gap などの余白に使うスペーシングトークン。Stack の gap や独自レイアウトの調整時に参照してください。brief を指定すると Brief 由来の spacing スケールを返します。",
      inputSchema: { brief: briefArg }
    },
    async ({ brief }) => {
      if (brief) {
        if (!(await briefExists(brief))) return unknownBrief(brief);
        return jsonContent({ brief, spacing: await loadBriefSpacingTokens(brief) });
      }
      return jsonContent({ spacing: await loadSpacingTokens() });
    }
  );

  server.registerTool(
    "get_icons",
    {
      title: "Get icons",
      description:
        "デザインシステムに含まれるアイコンの一覧と SVG ソースを返します。Button の leftIcon/rightIcon や独自のアイコン使用箇所に組み込めます。query を指定すると name / tags / description に対する部分一致でフィルタします。",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("任意の絞り込みキーワード（例: 'add', '検索'）。指定しない場合は全アイコンを返します。")
      }
    },
    async ({ query }) => {
      const icons = await loadIcons();
      const filtered = query
        ? icons.filter((i) => {
            const q = query.toLowerCase();
            return (
              i.name.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q) ||
              i.tags.some((t) => t.toLowerCase().includes(q))
            );
          })
        : icons;
      return jsonContent({ icons: filtered });
    }
  );

  server.registerTool(
    "explain_token",
    {
      title: "Explain how a generated token was derived from a Brand Brief",
      description:
        "Brief 由来の単一トークンの provenance（来歴）を返します。tokens.provenance.json から該当 path のレコードを取り出し、value / source / input / effectiveInput / derivation と Brief SHA を含む詳細を返します。`brief` は必須、`path` はドット区切りパス（例: 'color.brand.primary.light', 'space.4', 'typography.heading1.fontSize'）。",
      inputSchema: {
        brief: z
          .string()
          .describe("Brand Brief slug (例: 'aurora'). get_briefs で確認できます。"),
        path: z
          .string()
          .describe(
            "Token のドット区切りパス。例: 'color.brand.primary.light', 'space.4', 'typography.heading1.fontSize'。"
          ),
      },
    },
    async ({ brief, path }) => {
      if (!(await briefExists(brief))) return unknownBrief(brief);
      const prov = await loadBriefProvenance(brief);
      if (!prov) {
        return {
          isError: true as const,
          content: [
            {
              type: "text" as const,
              text: `Brief '${brief}' に tokens.provenance.json がありません。propose_tokens / propose_component を再実行 → ds:approve してください。`,
            },
          ],
        };
      }
      const record = prov.records.find((r) => r.path === path);
      if (!record) {
        const sample = prov.records.slice(0, 5).map((r) => r.path);
        return {
          isError: true as const,
          content: [
            {
              type: "text" as const,
              text:
                `path '${path}' は Brief '${brief}' の provenance に存在しません。` +
                `利用可能な path は ${prov.records.length} 件（例: ${sample.join(", ")} など）。`,
            },
          ],
        };
      }
      return jsonContent({
        briefSlug: prov.briefSlug,
        briefSha: prov.briefSha,
        synthVersion: prov.synthVersion,
        generatedAt: prov.generatedAt,
        record,
      });
    }
  );
}
