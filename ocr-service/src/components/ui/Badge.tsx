import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "success" | "warning" | "error" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-sf-bg text-sf-text-weak border-sf-border",
  brand: "bg-sf-brand-light text-sf-brand-dark border-sf-brand-light",
  success: "bg-sf-success-bg text-sf-success border-sf-success-bg",
  warning: "bg-sf-warning-bg text-sf-warning border-sf-warning-bg",
  error: "bg-sf-error-bg text-sf-error border-sf-error-bg",
  info: "bg-sf-info-bg text-sf-brand-dark border-sf-info-bg",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
