import type { ReactNode, CSSProperties } from "react";

export type StackDirection = "vertical" | "horizontal";
export type StackAlign = "start" | "center" | "end" | "stretch";
export type StackJustify = "start" | "center" | "end" | "between";

export type StackProps = {
  direction?: StackDirection;
  gap?: 1 | 2 | 3 | 4 | 6 | 8;
  align?: StackAlign;
  justify?: StackJustify;
  children: ReactNode;
};

const gapToSpacing: Record<NonNullable<StackProps["gap"]>, string> = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px"
};

const alignMap: Record<StackAlign, CSSProperties["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch"
};

const justifyMap: Record<StackJustify, CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between"
};

export function Stack({
  direction = "vertical",
  gap = 3,
  align = "stretch",
  justify = "start",
  children
}: StackProps) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: direction === "vertical" ? "column" : "row",
    gap: gapToSpacing[gap],
    alignItems: alignMap[align],
    justifyContent: justifyMap[justify]
  };
  return <div style={style}>{children}</div>;
}
