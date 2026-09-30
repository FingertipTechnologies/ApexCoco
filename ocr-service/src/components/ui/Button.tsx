"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "brand" | "neutral" | "outline" | "success" | "destructive" | "ghost";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  brand: "bg-sf-brand text-white border-sf-brand hover:bg-sf-brand-dark active:bg-sf-brand-darker",
  neutral: "bg-white text-sf-brand border-sf-border-strong hover:bg-sf-brand-light",
  outline: "bg-transparent text-sf-brand border-sf-brand hover:bg-sf-brand-light",
  success: "bg-sf-success text-white border-sf-success hover:brightness-95",
  destructive: "bg-white text-sf-error border-sf-border-strong hover:bg-sf-error-bg",
  ghost: "bg-transparent text-sf-brand border-transparent hover:bg-sf-brand-light",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({ variant = "neutral", size = "md", loading, icon, fullWidth, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-sf border font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sf-brand-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      <span>{children}</span>
    </button>
  );
}
