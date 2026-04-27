# Button

## Summary

ユーザーのアクションを促すための標準ボタン。フォーム送信、ダイアログ確認、ナビゲーション遷移などに用いる。

## Tags

action, form, primary, cta

## Props

| Name | Type | Default | Required | Description |
|---|---|---|---|---|
| variant | `"primary" \| "secondary" \| "danger"` | `"primary"` | no | 視覚的な強さ。1 画面に primary は 1 つを推奨。 |
| size | `"sm" \| "md" \| "lg"` | `"md"` | no | サイズ。フォーム内では `md`、密度の高い表内では `sm`。 |
| isLoading | `boolean` | `false` | no | ローディング表示。クリック不可になる。 |
| isDisabled | `boolean` | `false` | no | 無効状態。`isLoading` 中も自動で無効化される。 |
| leftIcon | `ReactNode` | - | no | ラベル左側のアイコン。 |
| rightIcon | `ReactNode` | - | no | ラベル右側のアイコン。 |
| children | `ReactNode` | - | yes | ボタンラベル。 |
| onClick | `(e) => void` | - | no | クリックハンドラ。 |

## Examples

### 基本

```tsx
<Button onClick={handleSubmit}>送信</Button>
```

### アイコン付き Secondary

```tsx
<Button variant="secondary" leftIcon={<PlusIcon />}>追加</Button>
```

### Danger / Loading

```tsx
<Button variant="danger" isLoading>削除中</Button>
```

## Related

- TextField: フォーム入力のセットでよく使う
- Stack: 複数ボタンを横並べる場合の親

## Design Tokens Used

- `color.brand.primary` / `color.brand.primaryHover` (variant=primary)
- `color.semantic.danger` (variant=danger)
- `radius.md`
- `typography.button.md`
- `spacing.2` (icon とラベル間)
