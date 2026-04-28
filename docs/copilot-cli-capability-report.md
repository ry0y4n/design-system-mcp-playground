# Copilot CLI Capability Report — Phase 0a Spike

**目的**: 「Brief → デザインシステム」生成エージェント基盤（plan.md §0.3 / Phase 0a）に必要な GitHub Copilot CLI 機能が、計画通りに実装可能かを実装着手前に検証する。

**検証対象バージョン**: GitHub Copilot CLI **v1.0.37**（本リポで動作中）

**検証方法**: ① CLI 内蔵ドキュメント（`fetch_copilot_cli_documentation`）と SDK ドキュメント（`~/.cache/copilot/pkg/universal/1.0.37/copilot-sdk/docs/{extensions,agent-author,examples}.md`）の精査、② 配布バンドル `app.js` のソース参照（discovery path / schema / hook contract の確定）、③ 既存のリポ状態（`.vscode/mcp.json` のみ）の確認。

**結論**: **計画はおおむね実装可能**。ただし 4 点の重要な調整（命名衝突 / 配置パス / Hook の位置づけ / 承認境界の実装手段）が必要。これらは plan.md に反映する。

---

## 1. 結論サマリ（capability マトリクス）

| 計画上の前提 | 実機での状況 | 判定 | 採るアプローチ |
|---|---|---|---|
| **project-local Custom Agent** が定義できる | `.github/agents/<name>.md` または `<name>.agent.md`（YAML frontmatter + 本文 = prompt）として読み込まれる | ✅ **可能** | そのまま採用。ファイル名= agent 名 |
| **project-local Skill** が定義できる | `.github/skills/<name>/SKILL.md`（frontmatter: `name`/`description`/`allowed-tools`/`user-invocable`/`disable-model-invocation`） | ✅ **可能** | そのまま採用。`user-invocable: true` で slash command 化 |
| **custom slash command**（`/specify` 等）が project-local で定義できる | 直接の "custom slash command" 機能はない。**`user-invocable: true` の skill が `/<skill-name>` として呼べる**ことで実質達成 | ✅ **可能（実装手段は skill）** | `/specify` 等を user-invocable skill として実装 |
| `/plan` `/tasks` を skill 名として使う | **CLI 組み込みの `/plan` `/tasks` と命名衝突** | ⚠️ **要調整** | `/ds-plan` `/ds-tasks` 等に rename（§4.2） |
| **PostToolUse Hook** で MCP tool 後検査 | Extension SDK の `onPostToolUse(input)` で `toolName` 単位に分岐可能。`additionalContext` で AI に修復メッセージを返せる | ✅ **可能（実機検証済み）** | Extension で実装（§3 参照） |
| **Hook 失敗時の自動修復ループ** | `onPostToolUse` が `additionalContext` を返すと AI の次ターンに**会話文脈として注入**される。実例あり（[examples.md L271](file://~/.cache/copilot/pkg/universal/1.0.37/copilot-sdk/docs/examples.md)） | ✅ **可能** | Skill 側に「Hook の指示が来たら再生成せよ」と明記 |
| **tool/path permission による direct write 禁止** | `permissions-config.json` と `/allow-all` `/add-dir` だけでは "**特定パスへの書き込み禁止**" は表現できない（allow リスト方向）。**`onPreToolUse` も v1.0.37 では agent flow で発火しない（§6.1 で実機検証）** | ❌ **当初プランは v1.0.37 では不可** | **Custom Agent の `tools:` allowlist** で実装（§6.2）。`edit`/`create`/`bash` を allowlist から除外 |
| **MCP tool を AI から不可視にする**（`approve` を MCP に置かない判断の検証） | MCP に登録した tool は AI から見える。AI 不可視にする標準手段はない | ✅ 計画通り | `approve` は **npm script として実装**（plan §5.4 のとおり）。MCP には載せない |
| `.copilot/agents/` `.copilot/hooks/` `.copilot/skills/` という配置 | **存在しない**（discovery 対象外）。正しい配置はそれぞれ `.github/agents/` / `.github/extensions/<name>/extension.mjs` / `.github/skills/` | ⚠️ **要調整** | plan.md のパス記述を全面置換（§4.1） |

**Top 3 修正事項** は §4 にまとめて反映方針を示す。

---

## 2. 実機 discovery パスの確定（v1.0.37 実装ベース）

### 2.1 Skills

```
[repo]/.github/skills/        ← project（本 PoC で使う）
[repo]/.agents/skills/        ← project（agents 系）
[repo]/.claude/skills/        ← project（Claude 系）
~/.copilot/skills/            ← personal-copilot
~/.agents/skills/             ← personal-agents
~/.claude/skills/             ← personal-claude
+ /skills add <dir> で任意追加
+ Plugin / builtin / remote 由来も別 source として読まれる
```

各ディレクトリ直下に `<skill>/SKILL.md` を置く（または `.md` ファイル単独）。

**SKILL.md frontmatter スキーマ**（実機 schema `w4t` から確定）:
```yaml
name: ds-specify           # kebab-case 等、^[a-zA-Z0-9][a-zA-Z0-9._\- ]*$、64文字以内
description: "..."         # 1024文字以内
allowed-tools: "create, edit, bash"   # カンマ区切り or 配列
user-invocable: true       # default true。true だと /<name> で呼べる
disable-model-invocation: false       # default false
```

### 2.2 Custom Agents

配置: `[repo]/.github/agents/<name>.md` または `<name>.agent.md`（同名がある場合 `.agent.md` 優先）。

**フォーマット**: YAML frontmatter + 本文（本文がそのまま prompt）。  
**注意**: `~/.cache/.../app.js` 内には別途 SaaS 連携の remote 取得経路（`sweAgentsEndpoint/custom-agents/<owner>/<repo>/<name>`）も存在するが、PoC では **ローカル `.md` ファイルのみ**で完結させる。

### 2.3 Extensions（Hooks + Custom Tools）

配置: `[repo]/.github/extensions/<name>/extension.mjs`（**`.mjs` 必須**、ES module）。  
ユーザースコープも可（`extensions_manage --location user`）。

**SDK 提供 hook 群**（実装可能なもの全て）:
- `onUserPromptSubmitted` — prompt の前処理 / 追加コンテキスト注入
- **`onPreToolUse`** — tool 実行前。`permissionDecision: "allow"|"deny"|"ask"` を返せる ★ **承認境界の実装ポイント**
- **`onPostToolUse`** — tool 実行後。`additionalContext` で AI に修復指示を出せる ★ **自動修復ループの実装ポイント**
- `onSessionStart` / `onSessionEnd` / `onErrorOccurred`

`onPreToolUse` で `permissionDecision: "deny"` を返した実例（[examples.md L207–224]）:
```js
hooks: {
  onPreToolUse: async (input) => {
    if (input.toolName === "bash" && /rm\s+-rf/i.test(input.toolArgs?.command)) {
      return { permissionDecision: "deny", permissionDecisionReason: "..." };
    }
    return { permissionDecision: "allow" };
  },
}
```

`onPostToolUse` で AI に再生成を促す実例（[examples.md L267–276]）:
```js
hooks: {
  onPostToolUse: async (input) => {
    if (input.toolName === "bash" && input.toolResult?.resultType === "failure") {
      return { additionalContext: "The command failed. Try a different approach." };
    }
  },
}
```

→ **token-coverage / contrast / schema を Hook 側で検査して失敗時に "再生成せよ" を additionalContext で返す**プランは原理的に動く。

### 2.4 MCP Servers

既存の `.vscode/mcp.json` に加えて、Copilot CLI は `~/.copilot/mcp-config.json` も読む（実機で確認済み）。`/mcp` slash command で管理可能。

### 2.5 Slash commands と命名

CLI 組み込みの slash command に下記が**既に存在する**（help text より抜粋）:
- `/agent`, `/skills`, `/mcp`, `/plugin`
- `/model`, `/delegate`, `/fleet`, **`/tasks`**
- `/ide`, `/diff`, `/pr`, `/review`, `/lsp`, `/terminal-setup`
- `/allow-all`, `/add-dir`, `/list-dirs`, `/cwd`, `/reset-allowed-tools`
- `/resume`, `/rename`, `/context`, `/usage`, `/session`, `/compact`, `/share`, `/remote`, `/copy`, `/rewind`
- `/help`, `/changelog`, `/feedback`, `/theme`, `/statusline`, `/footer`, `/update`, `/version`, `/experimental`, `/clear`, `/instructions`, `/streamer-mode`
- `/ask`, `/env`, `/exit`, `/keep-alive`, `/login`, `/logout`, `/new`, **`/plan`**, `/research`, `/restart`, `/search`, `/sidekicks`, `/undo`, `/user`

→ **`/plan` と `/tasks` は組み込み**。本 PoC の skill 名はこれらと衝突させない。

---

## 3. 「承認境界」の実装可否（最重要論点）

### 3.1 結論
- **`approve` を MCP tool として露出しない**方針は正しい（plan.md §5.3 で確定済み）
- **AI の direct write を物理的に禁止する**には **Extension の `onPreToolUse` フック**を使う。`permissions-config.json` 単独では達成できない
- すなわち、Hook は計画当初の「単なる検査」ではなく、**実は承認境界そのもの**として機能する

### 3.2 実装パターン（Phase 0b 以降で書く `extension.mjs` の骨子）

```js
// .github/extensions/ds-guardrail/extension.mjs
import { joinSession } from "@github/copilot-sdk/extension";
import path from "node:path";

const FORBIDDEN = ["packages/design-system/"];          // AI 直接書き込み禁止のルート
const ALLOWED   = ["packages/brand-brief/proposals/"];  // proposals のみ AI が書ける

function targetsForbidden(args) {
  const p = args?.path ?? args?.file_path;
  if (!p) return false;
  const norm = path.normalize(p);
  return FORBIDDEN.some(f => norm.startsWith(f)) &&
         !ALLOWED.some(a => norm.startsWith(a));
}

await joinSession({
  hooks: {
    onPreToolUse: async ({ toolName, toolArgs }) => {
      if (["create", "edit", "write"].includes(toolName) && targetsForbidden(toolArgs)) {
        return {
          permissionDecision: "deny",
          permissionDecisionReason:
            "Direct writes to packages/design-system/ are forbidden. " +
            "Use propose_* MCP tools and have a human run `npm run ds:approve`.",
        };
      }
      // bash も検査して `> packages/design-system/...` などをブロック
      if (toolName === "bash") {
        const cmd = String(toolArgs?.command || "");
        if (FORBIDDEN.some(f => cmd.includes(f)) && !cmd.startsWith("git ")) {
          return { permissionDecision: "deny", permissionDecisionReason: "..." };
        }
      }
    },
    onPostToolUse: async ({ toolName, toolResult }) => {
      // propose_* の後、validators を呼んで失敗なら additionalContext で再生成を促す
      // 実体は packages/ds-author-mcp/validators/* CLI を呼ぶ（plan.md §5.6）
    },
  },
});
```

→ plan §5.3 / §5.6 を「Extension 1 つに hooks をまとめて配置」「`.github/extensions/ds-guardrail/`」に書き換える。

### 3.3 残るリスクと打ち手

- **複数 extension の name 衝突は致命的**（second extension が起動失敗）。本 PoC では 1 extension にまとめる
- **stdout 汚染禁止**（`console.log` 厳禁、`session.log()` を使う）— 開発時の落とし穴
- **`/clear` で extension が再起動**される（インメモリ状態は失う）→ proposals は必ずファイルで永続化（plan は既にそうなっている）
- **Hook が走らないバイパス経路**: `onPreToolUse` は CLI 内蔵 tool（create/edit/bash）すべてに発火するので、SDK 経路としては抜け道はほぼない。ただし extension 自体が無効化されると無防備 → README で「PoC では extension の無効化禁止」を明記

---

## 4. plan.md への反映事項（Top 3 + 詳細）

### 4.1 配置パスの全面置換
| 計画上の記述 | 正しい配置（v1.0.37） |
|---|---|
| `.copilot/skills/<name>/SKILL.md` | **`.github/skills/<name>/SKILL.md`** |
| `.copilot/agents/<name>.md` | **`.github/agents/<name>.md`**（または `<name>.agent.md`） |
| `.copilot/hooks/*.sh` | **`.github/extensions/ds-guardrail/extension.mjs`**（hooks は extension 内部に埋める）|

### 4.2 Slash command の rename（組み込みとの衝突回避）
| 計画 | 衝突 | 採用名 |
|---|---|---|
| `/specify` | なし | **`/specify`**（そのまま）|
| `/plan` | **CLI 組み込み**（implementation plan 作成） | **`/ds-plan`** に rename |
| `/tasks` | **CLI 組み込み**（background tasks） | **`/ds-tasks`** に rename |
| `/implement` | なし | **`/implement`**（そのまま）|

実装は user-invocable な skill として `.github/skills/<name>/SKILL.md` を 4 つ並べる。

### 4.3 Hooks の位置づけを「検査」から「承認境界 + 検査」に格上げ
plan §5.6 の「Hooks は権限境界ではない」という記述は **半分正しく半分不正確**。実機では `onPreToolUse` が **AI の write を物理的に拒否できる**。よって **Extension は本 PoC の承認境界そのもの**として位置づけ直す。Validators 共通 CLI を Hook から呼ぶ構造は維持。

### 4.4 Custom Agent の prompt は「ローカル `.md`」で完結
remote 連携（GitHub Copilot SaaS の custom-agents API）を使わないと明記。これにより PoC のセットアップが repo clone のみで済む。

---

## 5. 動作確認（限定的）

このセッション中に行った確認:

- [x] `copilot --version` → `1.0.37` を確認
- [x] SDK ドキュメント（extensions / agent-author / examples）の存在と中身を一次資料として参照
- [x] `app.js` 内の skill discovery 関数 `qU` / agent loader `o8i` / frontmatter zod schema (`w4t` / `S4t` / `F1n`) を抽出して確認
- [x] 既存リポに `.github/` ディレクトリは未作成、`.vscode/mcp.json` のみ存在を確認

このセッションでは行わなかったこと（Phase 0b 以降で実機確認する）:

- [ ] `.github/skills/` に最小 SKILL.md を置いて `/skills` で発見されるかの **生存確認**
- [ ] `.github/agents/` に最小 agent.md を置いて `/agent` で選択できるかの確認
- [ ] `.github/extensions/ds-guardrail/extension.mjs` の最小実装で `onPreToolUse` deny が効くかの確認
- [ ] user-invocable skill が `/<name>` 形式で呼べるかの確認

これらは Phase 0b 着手時に **空のスタブを置いて即確認**するのが最小コスト。

---

## 6. 実機 smoke test の結果（追記 — preToolUse 重大限界）

scaffold（4 つの SKILL.md / agent.md / extension.mjs / brand-brief パッケージ）を `.github/` 配下に配置し、本セッション内で実機検証した結果、**重大な仕様ギャップ**を発見した。

### 6.1 PreToolUse は v1.0.37 では実用上無効

**事象**:
- `extensions_reload` で ds-guardrail extension が `running` 状態になったことを確認
- session ログ (`~/.copilot/logs/process-*.log`) を観察
- 各 tool 呼び出しで **`Dispatching postToolUse hook for session ...` は毎回ログに出る**
- しかし **`Dispatching preToolUse hook ...` は一度も出ない**
- 実際に `bash` で `packages/design-system/src/` 配下に書き込みを試行したが、deny されず通過した

**原因（推定 — `app.js` のリバース読み）**:
- `createHooksProxy` は preToolUse / postToolUse / postToolUseFailure / userPromptSubmitted / sessionStart / sessionEnd を**ペアで登録している**（コード 12219699 付近）
- にもかかわらず `PreToolUseHooksProcessor.preToolsExecution()` を agent の tool-use フローから呼んでいるパスが、`requestPermission: true`（joinSession 既定）と組み合わせると engage しない可能性が高い
- ドキュメントには明記されていない実装上の制約と思われる

**インパクト**:
- **「`onPreToolUse` で `permissionDecision: "deny"` を返して AI の direct write を物理的に拒否」という当初の Phase 0a 想定は v1.0.37 では成立しない**

### 6.2 Phase 0b で採った代替手段: Custom Agent の `tools:` allowlist

`.github/agents/design-system-architect.md` の frontmatter `tools:` は**実機で機能する allowlist**（`isToolEnabled(name)` が `availableTools.includes(name)` で判定する、コード 8103029）。

→ **architect agent では `edit` / `create` / `write` / `bash` を `tools:` から外す**ことで、agent モードに入っている間は AI が直接書き込み**自体できない**状態にする。これが現バージョンで実装可能な、確実に効く承認境界。

```yaml
# .github/agents/design-system-architect.md（実装済み）
tools:
  - read
  - glob
  - grep
  # Phase 1 で追加:
  # - propose_tokens
  # - propose_component
  # - propose_guideline
```

### 6.3 残るリスクと打ち手

| リスク | 打ち手 |
|---|---|
| `/agent design-system-architect` を起動していない素のセッションでは AI が自由に書ける | README に「DS 編集時は **必ず** architect agent モードに入る」と明記。Phase 1+ で `pre-commit hook`（git 側）を追加して `packages/design-system/**` の直接コミットをブロック |
| `onPreToolUse` の挙動が将来のバージョンで変わる可能性 | extension.mjs に `onPreToolUse` ハンドラを残しておく（無効化でなくコメント付きで保持済み）。CLI が修正されたら追加コードなしで境界が二重化する |
| Hook 自体の登録もれ / extension クラッシュで境界バイパス | extension が起動していない状態を `session start` 時に検出し、その時点で agent prompt 側で「正常起動を確認できなければユーザーに警告して停止せよ」とする（Phase 1 で実装） |
| validators が無いまま propose_* が走ると検証が抜ける | Phase 1 で validators 共通 CLI を実装するまで propose_* を agent の tools allowlist に追加しない（順序を厳守） |

### 6.4 検証済み事項チェックリスト

- [x] `.github/skills/<name>/SKILL.md` が discovery される（4 つ配置済み）
- [x] `.github/agents/<name>.md` が discovery される
- [x] `.github/extensions/<name>/extension.mjs` が forking され `Extension ready` ログが出る
- [x] `extensions_reload` で実装更新を反映できる
- [x] `onPostToolUse` は確実に発火する
- [x] **`onPreToolUse` は v1.0.37 では発火しない**（重要）
- [x] Custom Agent の `tools:` allowlist が承認境界として機能することを `app.js` の `isToolEnabled` 実装から確認
