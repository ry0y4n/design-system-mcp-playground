# Stack

## Summary

子要素を一定の方向・間隔で並べるレイアウトプリミティブ。フォームやボタン群、カード内の構成に用いる。

## Tags

layout, flex, spacing

## Props

| Name | Type | Default | Required | Description |
|---|---|---|---|---|
| direction | `"vertical" \| "horizontal"` | `"vertical"` | no | 並べ方向。 |
| gap | `1 \| 2 \| 3 \| 4 \| 6 \| 8` | `3` | no | spacing トークン (`spacing.{n}`) に対応する子要素間の余白。 |
| align | `"start" \| "center" \| "end" \| "stretch"` | `"stretch"` | no | 交差軸方向の揃え。 |
| justify | `"start" \| "center" \| "end" \| "between"` | `"start"` | no | 主軸方向の揃え。 |
| children | `ReactNode` | - | yes | 子要素。 |

## Examples

### 縦並びフォーム

```tsx
<Stack direction="vertical" gap={4}>
  <TextField label="名前" isRequired />
  <TextField label="メール" type="email" isRequired />
  <Button>送信</Button>
</Stack>
```

### 横並びボタン群

```tsx
<Stack direction="horizontal" gap={2} justify="end">
  <Button variant="secondary">キャンセル</Button>
  <Button>OK</Button>
</Stack>
```

## Related

- Button, TextField: 主な子要素

## Design Tokens Used

- `spacing.1` 〜 `spacing.8` (gap)
