import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "./Stack.js";
import { Button } from "../Button/Button.js";

const meta: Meta<typeof Stack> = {
  title: "Components/Stack",
  component: Stack,
  parameters: {
    docs: {
      description: {
        component:
          "縦/横の間隔を統一するための Layout プリミティブ。`gap` はスペーシングトークンに対応 (1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px)。",
      },
    },
  },
  args: {
    direction: "vertical",
    gap: 3,
    align: "stretch",
    justify: "start",
  },
  argTypes: {
    direction: { control: "inline-radio", options: ["vertical", "horizontal"] },
    gap: { control: "inline-radio", options: [1, 2, 3, 4, 6, 8] },
    align: { control: "inline-radio", options: ["start", "center", "end", "stretch"] },
    justify: { control: "inline-radio", options: ["start", "center", "end", "between"] },
  },
};
export default meta;

type Story = StoryObj<typeof Stack>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "#e0e7ff", padding: 12, borderRadius: 6, textAlign: "center" }}>
    {children}
  </div>
);

export const Vertical: Story = {
  render: (args) => (
    <Stack {...args}>
      <Box>1</Box>
      <Box>2</Box>
      <Box>3</Box>
    </Stack>
  ),
};

export const Horizontal: Story = {
  args: { direction: "horizontal" },
  render: (args) => (
    <Stack {...args}>
      <Button>Save</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="danger">Delete</Button>
    </Stack>
  ),
};

export const GapScale: Story = {
  name: "Gap scale",
  render: () => (
    <Stack direction="vertical" gap={4}>
      {[1, 2, 3, 4, 6, 8].map((g) => (
        <div key={g}>
          <small style={{ color: "#6b7280" }}>gap={g}</small>
          <Stack direction="horizontal" gap={g as 1 | 2 | 3 | 4 | 6 | 8}>
            <Box>A</Box>
            <Box>B</Box>
            <Box>C</Box>
          </Stack>
        </div>
      ))}
    </Stack>
  ),
};
