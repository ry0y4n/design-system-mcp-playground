# proposals/

`/ds-specify` などのスキルが書き出す Brand Brief / プラン / タスクリスト / 提案物の置き場。

`packages/design-system/` には**ここを経由しないとアクセスできない**（ds-guardrail 拡張の hook で物理的に禁止）。

## 期待される構造
```
proposals/
  2026-04-aurora/
    aurora.brief.yaml          # /ds-specify が書く
    aurora.plan.md             # /ds-plan が書く
    aurora.tasks.md            # /ds-tasks が書く
    proposed/                  # /implement が書く（最終反映前の提案物）
      tokens/
      components/
      guidelines/
```

最終反映は人間が `npm run -w @design-system-mcp-playground/brand-brief approve` で行う。
