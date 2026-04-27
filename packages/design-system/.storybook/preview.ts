import type { Preview } from "@storybook/react-vite";
import "../src/styles/index.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "surface",
      values: [
        { name: "surface", value: "#ffffff" },
        { name: "muted", value: "#f5f7fa" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
