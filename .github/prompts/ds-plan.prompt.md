---
# Auto-generated from .github/skills/ds-plan/SKILL.md.
# Edit the skill source; run `npm run sync:vscode` to regenerate.
name: ds-plan
description: Brand Brief から「どのトークン群・どのコンポーネント群を作るか」の実装プランを立てる。Spec Kit の /plan 相当（CLI 組み込み /plan と衝突回避のため ds- プレフィックス）。
agent: agent
tools: ["codebase", "edit", "search"]
---

> **Source of truth:** `.github/skills/ds-plan/SKILL.md`. Do not hand-edit this file.
## 役割
- 確定済み Brand Brief（`packages/brand-brief/proposals/<latest>.yaml`）を読み込み、これから作るトークン/コンポーネント/ガイドラインの**プラン**を `packages/brand-brief/proposals/<same-name>.plan.md` として出力する。

## 制約
- 実装は行わない。プランの記述まで。
- 既存 `packages/design-system/` の現状（tokens / components）を `read` で確認し、差分を明示する。
- 次ステップとして `/ds-tasks` を提案する。
