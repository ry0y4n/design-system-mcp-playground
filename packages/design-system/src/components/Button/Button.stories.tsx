import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.js";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "デザインシステムの標準ボタン。`variant` と `size` で見た目を切り替え、`isLoading` / `isDisabled` で状態を表現します。",
      },
    },
  },
  args: {
    children: "保存する",
    variant: "primary",
    size: "md",
    isLoading: false,
    isDisabled: false,
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "danger"],
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: "secondary", children: "キャンセル" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "削除する" },
};

export const Loading: Story = {
  args: { isLoading: true, children: "送信中" },
};

export const Disabled: Story = {
  args: { isDisabled: true },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="md">Medium</Button>
      <Button {...args} size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  name: "All variants",
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="primary" isLoading>Loading</Button>
      <Button variant="primary" isDisabled>Disabled</Button>
    </div>
  ),
};
