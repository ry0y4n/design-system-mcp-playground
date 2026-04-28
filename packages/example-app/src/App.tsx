import { Stack } from "@design-system-mcp-playground/design-system";

const DEMO_PROMPT = `ユーザー登録フォームを このデザインシステム で作って。
名前・メールアドレス・年齢の入力欄と送信ボタンが必要。
バリデーションも簡易につけて。`;

export function App() {
    return (
        <div className="app-shell">
            <header className="app-header">
                <h1>design-system-mcp-playground · example app</h1>
                <p>
                    VS Code の <strong>GitHub Copilot Chat</strong> に MCP
                    サーバーが登録された状態で、下のプロンプトを送って
                    <code> RegisterForm </code>{" "}
                    プレースホルダを置き換えてください。 生成結果は{" "}
                    <strong>Storybook</strong>（<code>npm run storybook</code> →{" "}
                    <a
                        href="http://localhost:6006"
                        target="_blank"
                        rel="noreferrer"
                    >
                        localhost:6006
                    </a>
                    ）の見本と比較して「準拠しているか」を検証できます。
                </p>
            </header>

            <main className="app-main">
                <section className="card" aria-labelledby="howto-heading">
                    <h2 id="howto-heading">使い方</h2>
                    <Stack direction="vertical" gap={3}>
                        <p>
                            1. ルートで <code>npm run build:read-mcp</code>{" "}
                            済みであることを確認
                        </p>
                        <p>
                            2. VS Code でこのフォルダを開く。
                            <code>.vscode/mcp.json</code>{" "}
                            が同梱されているので、GitHub Copilot Chat (Agent
                            モード) から自動で MCP
                            サーバーが見えます。**追加の設定は不要**です。
                        </p>
                        <p>
                            3. <code>packages/example-app/src/App.tsx</code>{" "}
                            を開き、Copilot Chat の Agent モードで AI
                            に編集させる
                        </p>
                        <p>4. 下記のプロンプトをそのまま送信:</p>
                        <pre className="prompt-block">{DEMO_PROMPT}</pre>
                        <p>
                            AI は MCP の <code>get_components</code> →{" "}
                            <code>get_component</code> →
                            <code> get_*_tokens</code> → <code>get_icons</code>{" "}
                            を順に呼び、 下のプレースホルダ領域を{" "}
                            <code>RegisterForm</code> として置き換えるはずです。
                        </p>
                        <p>
                            生成後は別ターミナルで{" "}
                            <code>npm run storybook</code> を起動し、Button や
                            TextField の見た目が一致するか目で確認してください。
                        </p>
                    </Stack>
                </section>

                <section className="card" aria-labelledby="form-heading">
                    <h2 id="form-heading">ユーザー登録フォーム</h2>
                    <p>下の枠が、AI に書き換えてもらう対象です。</p>
                    {/*
                     * ▼▼▼ ここを AI (MCP 経由) に書き換えてもらう ▼▼▼
                     *
                     * 期待する成果物: <RegisterForm /> コンポーネント
                     *   - 名前 (TextField, isRequired)
                     *   - メールアドレス (TextField, type="email", isRequired)
                     *   - 年齢 (TextField, type="number")
                     *   - 送信ボタン (Button, variant="primary")
                     *   - 縦並びレイアウトは <Stack direction="vertical" gap={4}>
                     *   - 簡易バリデーション (空欄・メール形式・年齢が数値) を errorText で表示
                     *
                     * 完成したら下の <Placeholder /> を <RegisterForm /> に置き換えてください。
                     */}
                    <Placeholder />
                </section>
            </main>
        </div>
    );
}

function Placeholder() {
    return (
        <div className="placeholder" role="status">
            <p>
                ここに <strong>&lt;RegisterForm /&gt;</strong>{" "}
                を実装してください。
                <br />
                （VS Code で App.tsx を開き、GitHub Copilot Chat (Agent モード)
                に上のプロンプトを送ると MCP サーバー経由で生成されます）
            </p>
        </div>
    );
}
