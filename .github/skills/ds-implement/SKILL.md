---
name: ds-implement
description: ds-tasks で確定した task list を順に実行し、ds-author MCP の propose_* tool 経由でデザインシステム提案を生成する。
allowed-tools: read, propose_tokens, propose_component, list_proposals
user-invocable: true
---

# /implement — 実装 Skill (Phase 2)

## 役割
- `*.tasks.md` を読み、各 task を順に MCP tool で実行する。
- 利用可能な MCP tool:
  - `propose_tokens({ briefPath })` — Brief → tokens.json + 検証レポート
  - `propose_component({ briefPath, name, variants?, sizes? })` — Brief + 既存 tokens から component 一式（TSX / module.css / stories / spec / index.ts）を `packages/design-system/src/generated/<slug>/<Name>/` 配下に提案
  - `list_proposals()` — 既存提案の一覧
- 各 propose の後、Hook (`onPostToolUse`) が `ds-check` を回す。失敗時は `additionalContext` に修復指示が来るので、その指示に従って Brief を直して再度 propose を呼ぶ。

## 標準フロー（トークン生成）
1. ユーザーが指定した Brief（例: `packages/brand-brief/examples/aurora.brief.yaml`）の存在を確認する。
2. `propose_tokens({ briefPath })` を呼ぶ。
3. 返ってきた `validation.ok === true` を確認する。`false` なら `additionalContext` の指示に従って Brief を修正し、もう一度呼ぶ。3 回連続で失敗したらユーザーに判断を仰ぐ。
4. 成功したら、返り値の `nextStep`（`npm run ds:approve -- ...`）を**ユーザーに提示**する。AI 自身は `bash` を持たないので実行しない。

## 標準フロー（コンポーネント生成）
1. 対象 Brief と component 名（Phase 2 では `Button` のみ受理）、必要なら `variants` / `sizes` を確定する。Phase 2 で許容される値は `variants ⊆ {primary, secondary, ghost, danger}`、`sizes ⊆ {sm, md, lg}` のみ。Brief に書かれた指針を踏まえ、Brief から逸脱しない最小セットを選ぶ。
2. `propose_component({ briefPath, name: "Button", variants, sizes })` を呼ぶ。
3. `validation.ok === true` を確認。失敗時は `additionalContext` の修復指示（コントラスト不足ならば Brief 側の seed 色やコントラスト調整、CSS leak ならば素直に再 propose で再生成）に従う。
4. 成功したら `nextStep` の `ds:approve` コマンドをユーザーに提示。

## 制約（重要）
- `packages/design-system/**` への直接 write は **構造的に不可能**（agent の `tools:` allowlist に `edit` / `create` / `bash` が含まれない）。
- 提案はすべて `packages/brand-brief/proposals/<slug>/<id>/proposed/` 以下に出る。
- 最終反映は人間専用の `npm run ds:approve` 経由。AI はこの CLI を呼ばない。
- TSX 本体は決定論的テンプレで生成される（`packages/ds-author-mcp/src/components/button.ts`）。AI は variants / sizes の**選択**のみ可能で、TSX の中身を書き換えることはできない。

## Phase 3+ で追加予定
- `propose_guideline` — Brief から再生成可能なガイドライン Markdown。
- 追加コンポーネント（TextField, Stack 等）— `components/<name>.ts` ジェネレータが追加された時点で `propose_component` の `name` で受理されるようになる。

