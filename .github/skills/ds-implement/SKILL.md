---
name: ds-implement
description: ds-tasks で確定した task list を順に実行し、ds-author MCP の propose_* tool 経由でデザインシステム提案を生成する。
allowed-tools: read, propose_tokens, propose_component, propose_guideline, list_proposals
user-invocable: true
---

# /implement — 実装 Skill

## 役割

- `*.tasks.md` を読み、各 task を順に MCP tool で実行する。
- 利用可能な MCP tool:
    - `propose_tokens({ briefPath })` — Brief → tokens.json + 検証レポート
    - `propose_component({ briefPath, name, variants?, sizes? })` — Brief + 既存 tokens から component 一式（TSX / module.css / stories / spec / index.ts）を `packages/design-system/src/generated/<slug>/<Name>/` 配下に提案。受理される `name`: `Button` / `TextField` / `Stack`
    - `propose_guideline({ briefPath, name })` — Brief + 既存 tokens からガイドライン Markdown を `packages/design-system/src/generated/<slug>/guidelines/<name>.md` に提案。`name` は `principles` / `voice-and-tone` / `accessibility` / `color-usage` / `do-and-dont` のいずれか。
    - `list_proposals()` — 既存提案の一覧
- 各 propose の後、Hook (`onPostToolUse`) が `ds-check` を回す。失敗時は `additionalContext` に修復指示が来るので、その指示に従って Brief を直して再度 propose を呼ぶ。

## 標準フロー（トークン生成）

1. ユーザーが指定した Brief（例: `packages/brand-brief/examples/aurora.brief.yaml`）の存在を確認する。
2. `propose_tokens({ briefPath })` を呼ぶ。
3. 返ってきた `validation.ok === true` を確認する。`false` なら `additionalContext` の指示に従って Brief を修正し、もう一度呼ぶ。3 回連続で失敗したらユーザーに判断を仰ぐ。
4. 成功したら、返り値の `nextStep`（`npm run ds:approve -- ...`）を**ユーザーに提示**する。AI 自身は `bash` を持たないので実行しない。

## 標準フロー（コンポーネント生成）

1. 対象 Brief と component 名（受理される `name`: `Button` / `TextField` / `Stack`）を確定する。各コンポーネントの軸:
    - `Button`: `variants ⊆ {primary, secondary, ghost, danger}`（`primary` 必須）、`sizes ⊆ {sm, md, lg}`（`md` 必須）
    - `TextField`: `variants ⊆ {outline, filled, underline}`（`outline` 必須）、`sizes ⊆ {sm, md, lg}`（`md` 必須）
    - `Stack`: `variants ⊆ {vertical, horizontal}`（`vertical` 必須）、`sizes` は受理しない（渡すとエラー）
   いずれも、Brief に書かれた指針を踏まえて Brief から逸脱しない最小セットを選ぶ。
2. `propose_component({ briefPath, name, variants, sizes? })` を呼ぶ（Stack は `sizes` を渡さない）。
3. `validation.ok === true` を確認。失敗時は `additionalContext` の修復指示（コントラスト不足ならば Brief 側の seed 色やコントラスト調整、CSS leak ならば素直に再 propose で再生成）に従う。
4. 成功したら `nextStep` の `ds:approve` コマンドをユーザーに提示。

## 標準フロー（ガイドライン生成）

1. 対象 Brief とガイドライン `name` を確定する。受理される `name` は `principles` / `voice-and-tone` / `accessibility` / `color-usage` / `do-and-dont` の 5 種。複数生成したい場合は、`name` ごとに 1 回ずつ `propose_guideline` を連続呼び出す。
2. `propose_guideline({ briefPath, name })` を呼ぶ。
3. `validation.ok === true` を確認。失敗時は `additionalContext` の修復指示に従う（テンプレは決定論的なので、失敗するのは同梱される tokens の contrast / leak だけ。Brief の seed を見直す）。
4. 成功したら `nextStep` の `ds:approve` コマンドをユーザーに提示。

## 制約（重要）

- `packages/design-system/**` への直接 write は **構造的に不可能**（agent の `tools:` allowlist に `edit` / `create` / `bash` が含まれない）。
- 提案はすべて `packages/brand-brief/proposals/<slug>/<id>/proposed/` 以下に出る。
- 最終反映は人間専用の `npm run ds:approve` 経由。AI はこの CLI を呼ばない。
- TSX 本体は決定論的テンプレで生成される（`packages/ds-author-mcp/src/components/{button,textField,stack}.ts`）。同じくガイドライン Markdown も決定論的テンプレで生成される（`packages/ds-author-mcp/src/guidelines/`）。AI の自由は受理される `name` から選び、その component が許す範囲で variants / sizes / guideline name を**選択**することのみで、本文を書き換えることはできない。

## 新コンポーネントを追加するには（拡張ポイント）

新しい component を MCP 経由で受理可能にするには、`packages/ds-author-mcp/src/components/` に generator を追加し、`components/index.ts` の registry に登録する。AI ではなく人間の作業範囲。
