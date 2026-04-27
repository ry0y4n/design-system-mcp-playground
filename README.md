# design-system-mcp-playground

Ubie の [デザインシステムを MCP サーバー化した話](https://zenn.dev/ubie_dev/articles/f927aaff02d618) の **学習用サンプル**。React + TypeScript で書かれた小さなデザインシステム（コンポーネント / デザイントークン / アイコン）を題材に、それを **MCP サーバー** 化して **GitHub Copilot Chat (VS Code)** などの AI コーディングアシスタントに正確なコンテキストとして渡す、という一連の流れを動く形で示します。

> **このリポジトリのゴール**
>
> 1. なぜ MCP がデザインシステム連携の正解になり得るのかを理解する
> 2. **同じ仕組みを自社のデザインシステムに導入する手順を、コードレベルで把握する**
> 3. クライアントに「動く例＋導入ステップ」として提示する

---

## 1. 何が嬉しいのか（記事のおさらい）

従来、AI に「うちのデザインシステムでこのフォームを作って」と頼むには、以下のような工夫が必要でした:

- Copilot の custom instructions にデザインシステムの Web サイトを読み込ませる
- `node_modules/` 内のコンポーネント実装を探させる

しかしどちらも、**Props・トークン・アイコンといった構造化された情報**を AI に正確に渡せず、出力精度が安定しませんでした。

**MCP (Model Context Protocol)** は、AI 側が必要なときに必要な情報を **「ツール呼び出し」として能動的に取得できる**仕組みです。デザインシステム MCP を 1 つ用意しておくだけで:

- Copilot が prompt に応じて `get_components` → `get_component(name)` → `get_color_tokens` … と自動で呼び出して
- 自社デザインシステムに**準拠した**コードを出力する

ようになります。ドキュメントを書く側の整備（コンポーネント README やトークン定義）の価値が、そのまま AI 体験の品質につながります。

## 2. 構成

```
design-system-mcp-playground/
├── packages/
│   ├── design-system/          # 題材: 自社デザインシステム相当
│   │   ├── .storybook/         # Storybook 設定 (main.ts / preview.ts)
│   │   └── src/
│   │       ├── components/{Button,TextField,Stack}/  # *.tsx + *.stories.tsx + README.md
│   │       ├── tokens/         # color/radius/typography/spacing.json (+ TS) + Tokens.stories.tsx
│   │       ├── icons/          # *.svg + icons.json
│   │       └── styles/         # tokens.css / reset.css / components.css
│   ├── mcp-server/             # MCP サーバー本体 (TypeScript)
│   │   └── src/
│   │       ├── index.ts        # stdio で起動
│   │       ├── tools/          # 7 個のツール定義
│   │       └── loaders/        # design-system/ 配下を読む
│   └── example-app/            # Vite + React + TS のサンプルアプリ
│       └── src/                # App.tsx に "登録フォームを実装するプレースホルダ" あり
└── docs/
    └── how-it-works.md         # 仕組みの解説（クライアント説明用）
```

## 3. クイックスタート

### セットアップ

```bash
npm install
npm run build:mcp
```

ビルド後、`packages/mcp-server/dist/index.js` が生成されます。これを MCP クライアントから起動します。

### 動作確認（MCP Inspector）

公式ツールでブラウザから対話的にツールを叩けます:

```bash
npm run inspect:mcp
```

`get_components` → `get_component { "name": "Button" }` → `get_color_tokens` の順で呼んでみると、JSON が返ることが確認できます。

### Storybook でデザインシステムの見本を見る

```bash
npm run storybook
# → http://localhost:6006 が開きます
```

Button / TextField / Stack の全バリアントとデザイントークン（カラー / 余白 / 角丸 / タイポグラフィ）の公式見本が確認できます。AI が生成した UI と「同じ見た目」になっているかを照合する基準になります。

### MCP クライアントへの登録

主に **VS Code の GitHub Copilot Chat** を想定しています。このリポジトリには `.vscode/mcp.json` を同梱しているので、VS Code でこのフォルダを開くだけで MCP サーバーが Copilot Chat (Agent モード) に認識されます。

## 4. 提供するツール一覧

| Tool                    | 入力     | 役割                                                               |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `get_components`        | なし     | コンポーネント名・概要・タグの一覧（軽量）                         |
| `get_component`         | `name`   | 指定コンポーネントの README（props / examples / tokens / related） |
| `get_color_tokens`      | なし     | カラートークン                                                     |
| `get_radius_tokens`     | なし     | 角丸トークン                                                       |
| `get_typography_tokens` | なし     | 文字サイズ・行間・weight                                           |
| `get_spacing_tokens`    | なし     | 余白トークン                                                       |
| `get_icons`             | `query?` | アイコン一覧（SVG ソースつき）。クエリで部分一致フィルタ           |

二段構え (`get_components` → `get_component`) にしているのは、AI のコンテキストを節約し「必要な分だけ詳細を引かせる」ためです。

## 5. デモ用プロンプト集

実装精度を確かめるために GitHub Copilot Chat (VS Code, Agent モード) で試すと効果的なプロンプト:

1. **新規 UI 生成**

    > 「ユーザー登録フォームを **このデザインシステム** で作って。名前・メールアドレス・年齢の入力欄と送信ボタンが必要。バリデーションも簡易につけて。」

2. **既存スタイルの統一**

    > 「下記の JSX を、デザインシステムのコンポーネントとトークンだけを使うようにリファクタして。」

3. **アイコン込み**

    > 「`+` 追加ボタンを、デザインシステムのアイコンとボタンで実装して。」

4. **意図的なはずし確認**
    > 「ステッパー（ウィザード）コンポーネントを作って。」 → デザインシステムに無いコンポーネントなので精度が落ちることが見える（記事と同じ示唆）。

AI 側のログ（Copilot Chat の Tool Calls 表示など）で、実際に `get_components` → `get_component { name: "Button" }` … と順番に呼ばれていれば成功です。

## 6. 実際に試してみる（example-app + GitHub Copilot Chat）

`packages/example-app/` に、上記プロンプト 1 を試すための **Vite + React** 製のサンプルアプリを同梱しています。手順:

```bash
# 1. ルートで一度だけ
npm install
npm run build:mcp

# 2. サンプルアプリの dev server を起動
npm run dev --workspace @design-system-mcp-playground/example-app
# → http://localhost:5173 が開きます
```

ブラウザを開くと、ヘッダ・使い方・**「ここに `<RegisterForm />` を実装してください」** という破線プレースホルダが表示されます。

### プロンプトを送る

1. `packages/example-app/src/App.tsx` をエディタで開く
2. Copilot Chat を **Agent モード** に切り替え、**デモプロンプト 1** をコピペして送信
3. AI が `get_components` → `get_component { name: "Button" }` … を順に呼び、`<Placeholder />` を `<RegisterForm />` 実装で置き換える
4. 保存すると Vite が HMR でブラウザに反映 → デザインシステム準拠の登録フォームが見える

### 「デザイン通りか」を視覚的に検証する（Storybook）

別ターミナルで Storybook を立ち上げ、AI が生成した UI と公式見本を**横に並べて**見比べてください:

```bash
npm run storybook   # http://localhost:6006
```

Storybook には Button / TextField / Stack の全バリアントと、デザイントークン（カラー / 余白 / 角丸 / タイポグラフィ）の一覧が並んでいます。

> 💡 AI が生成したフォームのボタンや入力欄が、Storybook の見本と**同じ見た目（同じ角丸・色・フォーカスリング）**になっていれば「デザインシステム準拠」。違っていたら、AI が独自実装してしまっている可能性があります。

検証チェックリスト:

- [ ] 生成された JSX が `import { Button, TextField, Stack } from "@design-system-mcp-playground/design-system"` を使っている
- [ ] example-app のフォームと Storybook の Button/TextField の見た目が一致する
- [ ] DevTools で `<button data-variant="primary">` のように **data 属性が付いている**（独自 className になっていない）
- [ ] 色が `var(--color-brand-primary)` 等のトークン経由になっている

> 💡 期待通りに動かなかった場合は、Copilot Chat のツール呼び出しログ（メッセージ内の "Used N tools" を展開）で、実際に `get_components` などが呼ばれているかを確認してください。呼ばれていない場合は `npm run build:mcp` 済みであること、`.vscode/mcp.json` の `dist/index.js` が存在すること、Copilot Chat が **Agent モード** になっていることを確認します。

## 7. 自社のデザインシステムに導入するには

3 ステップで持ち込めます:

1. **`packages/mcp-server/` をコピー**して、自社リポジトリに追加
2. **`loaders/paths.ts` の参照先**を、自社の `tokens` / `components` / `icons` ディレクトリに合わせて変更
3. **コンポーネントごとに `README.md`** を整備（このリポジトリの Button/TextField/Stack の README をテンプレートに）

その後、`npm run build` → MCP クライアントに登録すれば完了です。

詳しい仕組みは [`docs/how-it-works.md`](./docs/how-it-works.md) を参照してください。

## 8. スコープ外（将来の拡張余地）

- **Figma MCP との連携**: 記事のデモは Figma MCP と組み合わせて Figma → コードを実現していました。この MCP と並列に登録すれば同じ体験を作れます。
- **リモート MCP / 認証**: 社内共通サーバーとして配るなら HTTP/SSE transport + auth を追加。
- **インクリメンタル更新 / キャッシュ**: ファイル監視で変更時のみ再ロードする最適化。
- **Storybook 連携**: `*.stories.tsx` から examples を自動抽出する loader。

## 9. 参考

- 元記事: [デザインシステムを MCP サーバー化したら、UI 開発が劇的にかわった話](https://zenn.dev/ubie_dev/articles/f927aaff02d618) — Ubie 江崎さん
- [Model Context Protocol 公式](https://modelcontextprotocol.io/)
- [@modelcontextprotocol/sdk (TypeScript)](https://github.com/modelcontextprotocol/typescript-sdk)
