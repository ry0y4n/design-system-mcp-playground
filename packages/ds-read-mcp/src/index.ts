#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

async function main() {
  const server = new McpServer(
    {
      name: "design-system-mcp-playground",
      version: "0.1.0"
    },
    {
      instructions:
        "サンプルの社内デザインシステムをコンテキストとして提供する MCP サーバーです。UI を実装する前に必ず get_components でコンポーネント一覧を取得し、必要に応じて get_component / get_*_tokens / get_icons を呼んで、デザインシステムのコンポーネントとトークンだけで UI を組み立ててください。"
    }
  );

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[design-system-mcp-playground] fatal:", err);
  process.exit(1);
});
