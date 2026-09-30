import { Check, Loader2, Minus, X } from "lucide-react";
import type { ReactNode } from "react";

export type RowState = "pending" | "running" | "done" | "warn" | "error";

/** One line of a processing checklist: "Checking Leads..." etc. */
export function StatusRow({ state, label, detail }: { state: RowState; label: ReactNode; detail?: ReactNode }) {
  const icon =
    state === "done" ? (
      <span className="sf-pop flex h-6 w-6 items-center justify-center rounded-full bg-sf-success text-white"><Check className="h-3.5 w-3.5" aria-hidden /></span>
    ) : state === "warn" ? (
      <span className="sf-pop flex h-6 w-6 items-center justify-center rounded-full bg-sf-warning text-white"><Check className="h-3.5 w-3.5" aria-hidden /></span>
    ) : state === "error" ? (
      <span className="sf-pop flex h-6 w-6 items-center justify-center rounded-full bg-sf-error text-white"><X className="h-3.5 w-3.5" aria-hidden /></span>
    ) : state === "running" ? (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sf-brand-light text-sf-brand"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /></span>
    ) : (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-sf-border-strong text-sf-text-muted"><Minus className="h-3 w-3" aria-hidden /></span>
    );
  return (
    <li className="flex items-start gap-3 py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${state === "pending" ? "text-sf-text-muted" : "text-sf-text font-medium"}`}>{label}</p>
        {detail && <p className="text-xs text-sf-text-muted mt-0.5">{detail}</p>}
      </div>
    </li>
  );
}
