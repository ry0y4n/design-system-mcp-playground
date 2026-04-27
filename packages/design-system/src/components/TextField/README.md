# TextField

## Summary

1 行テキストの入力欄。ラベル必須、必要に応じて helper text / error text を表示する。

## Tags

form, input, text

## Props

| Name | Type | Default | Required | Description |
|---|---|---|---|---|
| label | `string` | - | yes | 入力欄の説明ラベル。アクセシビリティ上必須。 |
| helperText | `ReactNode` | - | no | 通常時の補足説明。 |
| errorText | `ReactNode` | - | no | エラー文言。指定時 `aria-invalid` が付く。 |
| isRequired | `boolean` | `false` | no | 必須。ラベル横に `*` を表示する。 |
| isDisabled | `boolean` | `false` | no | 無効状態。 |
| value / defaultValue | `string` | - | no | 入力値。 |
| onChange | `(e) => void` | - | no | 入力ハンドラ。 |
| placeholder | `string` | - | no | プレースホルダ。 |
| type | `"text" \| "email" \| "password" \| ...` | `"text"` | no | input の type。 |

## Examples

### 基本

```tsx
<TextField label="お名前" placeholder="山田太郎" isRequired />
```

### Helper text

```tsx
<TextField label="メールアドレス" type="email" helperText="ログインに使用します" />
```

### エラー

```tsx
<TextField label="メールアドレス" errorText="形式が正しくありません" />
```

## Related

- Button: フォーム送信ボタンと組み合わせる
- Stack: 縦に複数 TextField を並べる際の親

## Design Tokens Used

- `color.text.primary` / `color.text.secondary`
- `color.semantic.danger` (error 時)
- `color.border.default`
- `radius.md`
- `typography.body.md` / `typography.body.sm` (helper/error)
- `spacing.1` / `spacing.2`
