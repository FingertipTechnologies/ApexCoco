"use client";

import { useCallback, useState } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { CaptureStep } from "./CaptureStep";
import { ExtractingStep } from "./ExtractingStep";
import { ReviewStep } from "./ReviewStep";
import { DuplicateCheckStep } from "./DuplicateCheckStep";
import { ResultStep } from "./ResultStep";
import { CompleteStep, type Outcome } from "./CompleteStep";
import type { CardContact, ExtractionResult } from "@/lib/crm/types";
import type { DuplicateCheckResult } from "@/lib/salesforce/duplicate-check";

type Stage =
  | { kind: "capture" }
  | { kind: "extracting"; file: File; previewUrl: string }
  | { kind: "review"; extraction: ExtractionResult; previewUrl: string; contact: CardContact }
  | { kind: "checking"; extraction: ExtractionResult; previewUrl: string; contact: CardContact }
  | { kind: "result"; extraction: ExtractionResult; previewUrl: string; contact: CardContact; check: DuplicateCheckResult }
  | { kind: "complete"; contact: CardContact; outcome: Outcome };

const STEPS = [
  { key: "scan", label: "Scan" },
  { key: "extract", label: "Extract" },
  { key: "review", label: "Review" },
  { key: "check", label: "Check" },
  { key: "done", label: "Complete" },
];

const STEP_INDEX: Record<Stage["kind"], number> = { capture: 0, extracting: 1, review: 2, checking: 3, result: 3, complete: 4 };

/**
 * Orchestrates the flow:
 * Scan -> OCR/AI extraction -> Review -> Duplicate check -> Create Lead | Open/Update existing.
 */
export function ScanWizard() {
  const [stage, setStage] = useState<Stage>({ kind: "capture" });

  const restart = useCallback(() => setStage({ kind: "capture" }), []);

  const onExtracted = useCallback((extraction: ExtractionResult) => {
    setStage((s) => (s.kind === "extracting" ? { kind: "review", extraction, previewUrl: s.previewUrl, contact: extraction.contact } : s));
  }, []);

  const onChecked = useCallback((check: DuplicateCheckResult) => {
    setStage((s) => (s.kind === "checking" ? { ...s, kind: "result", check } : s));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 sm:pb-10">
      <div className="mb-4 rounded-sf border border-sf-border bg-white px-3 py-3 shadow-sf-card">
        <Stepper steps={STEPS} current={STEP_INDEX[stage.kind]} />
      </div>

      {stage.kind === "capture" && (
        <CaptureStep onProcess={(file, previewUrl) => setStage({ kind: "extracting", file, previewUrl })} />
      )}

      {stage.kind === "extracting" && (
        <ExtractingStep file={stage.file} previewUrl={stage.previewUrl} onDone={onExtracted} onCancel={restart} />
      )}

      {stage.kind === "review" && (
        <ReviewStep
          key={stage.extraction.pipeline.durationMs}
          extraction={stage.extraction}
          previewUrl={stage.previewUrl}
          initialContact={stage.contact}
          onConfirm={(contact) => setStage({ ...stage, kind: "checking", contact })}
          onRescan={restart}
        />
      )}

      {stage.kind === "checking" && (
        <DuplicateCheckStep contact={stage.contact} onDone={onChecked} onBack={() => setStage({ ...stage, kind: "review" })} />
      )}

      {stage.kind === "result" && (
        <ResultStep
          contact={stage.contact}
          check={stage.check}
          onBack={() => setStage({ kind: "review", extraction: stage.extraction, previewUrl: stage.previewUrl, contact: stage.contact })}
          onLeadCreated={(lead) => setStage({ kind: "complete", contact: stage.contact, outcome: { kind: "lead-created", lead } })}
          onRecordUpdated={(info) => setStage({ kind: "complete", contact: stage.contact, outcome: { kind: "record-updated", ...info } })}
        />
      )}

      {stage.kind === "complete" && <CompleteStep contact={stage.contact} outcome={stage.outcome} onRestart={restart} />}
    </div>
  );
}
