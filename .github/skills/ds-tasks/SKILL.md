---
name: ds-tasks
description: ds-plan の出力を機械的に実行可能な task 群に分解する。CLI 組み込み /tasks との衝突回避で ds- プレフィックス。
allowed-tools: read, create
user-invocable: true
---

# /ds-tasks — タスク分解 Skill

## 役割
- `*.plan.md` を読み、「propose_tokens 1 回 / propose_component N 回 / propose_guideline M 回」のような順序付き task list を生成する。
- 出力は `packages/brand-brief/proposals/<name>.tasks.md`。

## 制約
- 実装は行わない。次ステップは `/implement`。
