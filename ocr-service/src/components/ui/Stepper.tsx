import { Check } from "lucide-react";

export interface StepDef {
  key: string;
  label: string;
}

/** Lightning path-style progress indicator for the scan flow. */
export function Stepper({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <ol className="flex items-center w-full" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  done ? "bg-sf-success border-sf-success text-white" : active ? "bg-sf-brand border-sf-brand text-white" : "bg-white border-sf-border-strong text-sf-text-muted"
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span className={`text-[11px] leading-tight text-center whitespace-nowrap ${active ? "font-bold text-sf-brand-darker" : "text-sf-text-muted"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`mx-1 sm:mx-2 mb-4 h-0.5 flex-1 ${done ? "bg-sf-success" : "bg-sf-border-strong"}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
