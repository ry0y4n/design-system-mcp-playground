---
# Auto-generated from .github/skills/ds-tasks/SKILL.md.
# Edit the skill source; run `npm run sync:vscode` to regenerate.
name: ds-tasks
description: ds-plan の出力を機械的に実行可能な task 群に分解する。CLI 組み込み /tasks との衝突回避で ds- プレフィックス。
agent: agent
tools: ["codebase", "edit", "search"]
---

> **Source of truth:** `.github/skills/ds-tasks/SKILL.md`. Do not hand-edit this file.
## 役割
- `*.plan.md` を読み、「propose_tokens 1 回 / propose_component N 回 / propose_guideline M 回」のような順序付き task list を生成する。
- 出力は `packages/brand-brief/proposals/<name>.tasks.md`。

## 制約
- 実装は行わない。次ステップは `/implement`。
