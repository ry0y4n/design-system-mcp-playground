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

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_components",
    {
      title: "Get component list",
      description:
        "デザインシステムに含まれるコンポーネントの一覧（名前・概要・タグのみ）を返します。実装する UI を組み立てる前に最初に呼び、利用可能なコンポーネントを把握してください。詳細な props や使用例は get_component を使って個別に取得します。",
      inputSchema: {}
    },
    async () => {
      const components = await loadComponentSummaries();
      return jsonContent({ components });
    }
  );

  server.registerTool(
    "get_component",
    {
      title: "Get component detail",
      description:
        "指定したコンポーネントの詳細（説明・props・使用例・関連コンポーネント・利用するデザイントークン）を Markdown 形式で返します。get_components の結果から実装に使うコンポーネントを選んで本ツールを呼んでください。",
      inputSchema: {
        name: z
          .string()
          .describe("コンポーネント名 (例: 'Button', 'TextField')。get_components の name と一致する文字列。")
      }
    },
    async ({ name }) => {
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
        "カラーデザイントークンの一覧を返します。CSS color や Tailwind クラスの代わりに、必ずこのトークン名（または対応する value）を使ってください。",
      inputSchema: {}
    },
    async () => jsonContent({ colors: await loadColorTokens() })
  );

  server.registerTool(
    "get_radius_tokens",
    {
      title: "Get radius tokens",
      description: "border-radius のデザイントークン一覧。Card / Button / Dialog 等に適用します。",
      inputSchema: {}
    },
    async () => jsonContent({ radii: await loadRadiusTokens() })
  );

  server.registerTool(
    "get_typography_tokens",
    {
      title: "Get typography tokens",
      description: "fontSize / lineHeight / fontWeight をひとまとめにしたタイポグラフィトークン。見出し・本文・ボタンラベル等に適用します。",
      inputSchema: {}
    },
    async () => jsonContent({ typography: await loadTypographyTokens() })
  );

  server.registerTool(
    "get_spacing_tokens",
    {
      title: "Get spacing tokens",
      description: "padding / margin / gap などの余白に使うスペーシングトークン。Stack の gap や独自レイアウトの調整時に参照してください。",
      inputSchema: {}
    },
    async () => jsonContent({ spacing: await loadSpacingTokens() })
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
}
