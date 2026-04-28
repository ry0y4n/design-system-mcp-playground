# Brand Brief

「設計思想 → デザインシステム」生成パイプラインの入口となる成果物群を保持するパッケージ。

## 構成
- `schema/brief.schema.json` — Brand Brief の JSON Schema (draft-07)
- `proposals/` — `/ds-specify` で書き出される YAML / `*.plan.md` / `*.tasks.md` / `<name>/proposed/` 提案物
- `examples/` — schema に準拠する最小・典型サンプル
- `bin/ds-validate.mjs` — Brief YAML の schema 検証
- `bin/ds-approve.mjs` — **人間専用** approve CLI（AI からは hook で禁止される）

## 重要なルール
- AI（Copilot CLI）は `packages/design-system/**` には書き込めない（ds-guardrail 拡張が物理的に拒否）。
- AI の提案はすべてここの `proposals/<name>/proposed/` に出る。
- 最終反映は人間が `npm run -w @design-system-mcp-playground/brand-brief approve -- <proposal-dir>` で行う。
