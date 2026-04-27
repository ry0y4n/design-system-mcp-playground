import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./TextField.js";

const meta: Meta<typeof TextField> = {
  title: "Components/TextField",
  component: TextField,
  parameters: {
    docs: {
      description: {
        component:
          "ラベル付き 1 行テキスト入力。`helperText` / `errorText` / `isRequired` を切り替えてフォーム要件を表現します。",
      },
    },
  },
  args: {
    label: "メールアドレス",
    placeholder: "you@example.com",
    isRequired: false,
    isDisabled: false,
  },
};
export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {};

export const WithHelper: Story = {
  args: {
    helperText: "ログイン時に使用します",
  },
};

export const Required: Story = {
  args: {
    isRequired: true,
    helperText: "必須項目です",
  },
};

export const WithError: Story = {
  args: {
    errorText: "メールアドレスの形式が正しくありません",
    defaultValue: "not-an-email",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    defaultValue: "編集できません",
  },
};

export const AllStates: Story = {
  name: "All states",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
      <TextField label="名前" placeholder="山田 太郎" />
      <TextField label="メール" isRequired helperText="必須" />
      <TextField label="年齢" type="number" helperText="数字のみ" />
      <TextField label="メール (エラー)" defaultValue="invalid" errorText="形式が不正です" />
      <TextField label="編集不可" isDisabled defaultValue="readonly" />
    </div>
  ),
};
