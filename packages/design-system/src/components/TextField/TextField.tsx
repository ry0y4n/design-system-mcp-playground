import type { InputHTMLAttributes, ReactNode } from "react";

export type TextFieldProps = {
  label: string;
  helperText?: ReactNode;
  errorText?: ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "disabled" | "required">;

export function TextField({
  label,
  helperText,
  errorText,
  isRequired = false,
  isDisabled = false,
  ...rest
}: TextFieldProps) {
  const hasError = Boolean(errorText);
  return (
    <label data-error={hasError || undefined}>
      <span>
        {label}
        {isRequired ? <span aria-label="必須"> *</span> : null}
      </span>
      <input
        aria-invalid={hasError || undefined}
        aria-required={isRequired || undefined}
        disabled={isDisabled}
        required={isRequired}
        {...rest}
      />
      {hasError ? <span role="alert">{errorText}</span> : helperText ? <span>{helperText}</span> : null}
    </label>
  );
}
