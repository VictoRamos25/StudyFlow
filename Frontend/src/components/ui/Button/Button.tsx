import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const classes = [
    "sf-btn",
    `sf-btn--${variant}`,
    `sf-btn--${size}`,
    fullWidth ? "sf-btn--full" : "",
    loading ? "sf-btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="sf-btn__spinner" />
      ) : (
        <>
          {iconLeft && <span className="sf-btn__icon">{iconLeft}</span>}
          {children}
          {iconRight && <span className="sf-btn__icon">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
