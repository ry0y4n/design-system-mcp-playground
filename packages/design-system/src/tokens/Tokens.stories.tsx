import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "../tokens/index.js";

const meta: Meta = {
  title: "Tokens/Overview",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "デザイントークンのカタログ。MCP サーバーが `get_color_tokens` / `get_radius_tokens` / `get_spacing_tokens` / `get_typography_tokens` で返すデータと **同じ JSON** を表示しています。",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginBottom: 32,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const cellStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left",
  verticalAlign: "middle",
};

export const Colors: Story = {
  render: () => (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0 }}>Color tokens</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {colorTokens.map((t) => (
          <div key={t.name} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: t.value, height: 64 }} aria-label={t.value} />
            <div style={{ padding: 12, fontSize: 13 }}>
              <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{t.name}</div>
              <div style={{ color: "#6b7280" }}>{t.value}</div>
              <div style={{ color: "#374151", marginTop: 4 }}>{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  ),
};

export const Radius: Story = {
  render: () => (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0 }}>Radius tokens</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {radiusTokens.map((t) => (
          <div key={t.name} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                background: "#dbeafe",
                border: "1px solid #93c5fd",
                borderRadius: t.value,
              }}
            />
            <div style={{ marginTop: 8, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>{t.name}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{t.value}</div>
          </div>
        ))}
      </div>
    </section>
  ),
};

export const Spacing: Story = {
  render: () => (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0 }}>Spacing tokens</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>name</th>
            <th style={cellStyle}>value</th>
            <th style={cellStyle}>visual</th>
            <th style={cellStyle}>description</th>
          </tr>
        </thead>
        <tbody>
          {spacingTokens.map((t) => (
            <tr key={t.name}>
              <td style={{ ...cellStyle, fontFamily: "ui-monospace, monospace" }}>{t.name}</td>
              <td style={cellStyle}>{t.value}</td>
              <td style={cellStyle}>
                <div style={{ background: "#a78bfa", height: 16, width: t.value }} />
              </td>
              <td style={{ ...cellStyle, color: "#6b7280" }}>{t.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ),
};

export const Typography: Story = {
  render: () => (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0 }}>Typography tokens</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>name</th>
            <th style={cellStyle}>size / line / weight</th>
            <th style={cellStyle}>preview</th>
            <th style={cellStyle}>description</th>
          </tr>
        </thead>
        <tbody>
          {typographyTokens.map((t) => (
            <tr key={t.name}>
              <td style={{ ...cellStyle, fontFamily: "ui-monospace, monospace" }}>{t.name}</td>
              <td style={cellStyle}>
                {t.fontSize} / {t.lineHeight} / {t.fontWeight}
              </td>
              <td style={cellStyle}>
                <span
                  style={{
                    fontSize: t.fontSize,
                    lineHeight: t.lineHeight,
                    fontWeight: t.fontWeight,
                  }}
                >
                  あいうえお The quick brown fox
                </span>
              </td>
              <td style={{ ...cellStyle, color: "#6b7280" }}>{t.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ),
};
