import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error";

const styles: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: "bg-sf-info-bg border-sf-brand-light text-sf-brand-darker", icon: <Info className="h-5 w-5 shrink-0 text-sf-brand" aria-hidden /> },
  success: { box: "bg-sf-success-bg border-sf-success/30 text-sf-text", icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-sf-success" aria-hidden /> },
  warning: { box: "bg-sf-warning-bg border-sf-warning/30 text-sf-text", icon: <AlertTriangle className="h-5 w-5 shrink-0 text-sf-warning" aria-hidden /> },
  error: { box: "bg-sf-error-bg border-sf-error/30 text-sf-text", icon: <XCircle className="h-5 w-5 shrink-0 text-sf-error" aria-hidden /> },
};

export function Alert({ tone = "info", title, children, className = "" }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const s = styles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-sf border px-3 py-3 text-sm ${s.box} ${className}`}>
      {s.icon}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-sf-text-weak" : ""}>{children}</div>}
      </div>
    </div>
  );
}
