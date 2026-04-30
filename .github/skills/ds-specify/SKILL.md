---
name: ds-specify
description: Brand Brief（設計思想・ブランドカラーパレット等）を対話で収集し、packages/brand-brief/proposals/ 配下に YAML として保存する。Spec-driven workflow の入口。
allowed-tools: read, edit, create, bash
user-invocable: true
disable-model-invocation: false
---

# /ds-specify — Brand Brief 収集 Skill

このスキルは「設計思想 → デザインシステム」生成パイプラインの最初のステップです。

## 役割

- ユーザーから Brand Brief（設計思想 / ブランドカラー / トーン&マナー / 想定ユーザー / 競合参照 / 禁則事項）を対話で収集する。
- すべて出揃った時点で `packages/brand-brief/schema/brief.schema.json` に準拠した YAML を `packages/brand-brief/proposals/<timestamp>-<slug>.yaml` に書き出す。
- 既存 YAML を編集する場合は対話で「現状」を確認してから差分を提案する。

## 進行

1. ユーザーが `/ds-specify` を起動 → **必ず**まず schema を `read` して必須フィールドを把握する。
2. フィールドは 1 つずつ確認する（一度に全部聞かない）。
3. 矛盾を検出したら、ユーザーに優先順位を必ず確認する。
4. 完了したら `packages/brand-brief/proposals/` に YAML を **create** で書き出し、ファイルパスをユーザーに提示する。

## 制約

- `packages/design-system/**` には**絶対に書き込まない**。Hook が物理的に拒否します。
- Brief 確定後の次ステップは `/ds-plan` を提案すること。
