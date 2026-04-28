// Generated from Brief "aurora" — DO NOT EDIT.
// Regenerate via propose_component.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled">;

const cx = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    isDisabled = false,
    leftIcon,
    rightIcon,
    children,
    className,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cx(
        styles.button,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        isLoading && styles.loading,
        className
      )}
      disabled={isDisabled || isLoading}
      data-loading={isLoading || undefined}
      {...rest}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
});
