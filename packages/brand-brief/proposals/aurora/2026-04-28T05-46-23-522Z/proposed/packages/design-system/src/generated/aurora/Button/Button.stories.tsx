// Generated — DO NOT EDIT.
import "../tokens.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.js";

const meta: Meta<typeof Button> = {
  title: "Generated/aurora/Button",
  component: Button,
  decorators: [
    (Story) => (
      <div data-brief="aurora" style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  args: { children: "ボタン", variant: "primary", size: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary"] },
    size: { control: "inline-radio", options: ["md", "lg"] },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button variant="primary">primary</Button>
      <Button variant="secondary">secondary</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button size="md">md</Button>
      <Button size="lg">lg</Button>
    </div>
  ),
};
