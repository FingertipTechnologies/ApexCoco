"use client";

import { useEffect, useRef, useState } from "react";
import { ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { StatusRow, type RowState } from "@/components/ui/StatusRow";
import { extractCard } from "@/lib/api-client";
import type { ExtractionResult } from "@/lib/crm/types";

interface Props {
  file: File;
  previewUrl: string;
  onDone: (result: ExtractionResult) => void;
  onCancel: () => void;
}

/** Step 2 - upload the image and run OCR / QR / parsing with a live checklist. */
export function ExtractingStep({ file, previewUrl, onDone, onCancel }: Props) {
  const started = useRef(false);
  const [phase, setPhase] = useState(0); // 0 upload, 1 ocr, 2 qr, 3 structure
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    const timers = [setTimeout(() => setPhase(1), 400), setTimeout(() => setPhase(2), 1400), setTimeout(() => setPhase(3), 2600)];

    extractCard(file)
      .then((res) => {
        if (cancelled) return;
        timers.forEach(clearTimeout);
        setPhase(4);
        setResult(res);
        setTimeout(() => onDone(res), 650);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        timers.forEach(clearTimeout);
        setError(err.message || "Extraction failed. Please try again.");
      });

    return () => {
      cancelled = true;
      started.current = false; // allow React strict-mode re-run / dependency change
      timers.forEach(clearTimeout);
    };
  }, [file, onDone]);

  const rows: { label: string; detail?: string; state: RowState }[] = [
    { label: "Uploading image", state: phase > 0 ? "done" : "running" },
    { label: "Reading card text (OCR)", detail: result ? `${result.pipeline.ocrProvider}${result.ocrConfidence ? ` · ${Math.round(result.ocrConfidence)}% confidence` : ""}` : undefined, state: phase > 1 ? "done" : phase === 1 ? "running" : "pending" },
    {
      label: "Detecting QR code",
      detail: result ? (result.pipeline.qrDetected ? `QR code decoded (${result.qr?.format})` : "No QR code on this card") : undefined,
      state: phase > 2 ? (result && !result.pipeline.qrDetected ? "warn" : "done") : phase === 2 ? "running" : "pending",
    },
    { label: "Structuring CRM data", detail: result ? (result.pipeline.parser === "ai" ? "AI extraction" : "Rule-based extraction") : undefined, state: phase > 3 ? "done" : phase === 3 ? "running" : "pending" },
  ];

  return (
    <Card title="Extracting Information" icon={<ScanSearch className="h-4 w-4" aria-hidden />}>
      <div className="relative overflow-hidden rounded-sf border border-sf-border bg-sf-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Visiting card being processed" className={`mx-auto max-h-64 w-full object-contain ${error ? "opacity-60" : ""}`} />
        {!error && !result && <div className="sf-scan-line" aria-hidden />}
      </div>

      {!error && (
        <div className="sf-progress-bar relative mt-4 h-1 overflow-hidden rounded-full bg-sf-brand-light" aria-hidden />
      )}

      <ul className="mt-3 divide-y divide-sf-border" aria-live="polite">
        {rows.map((r) => <StatusRow key={r.label} state={error ? (r.state === "running" ? "error" : r.state) : r.state} label={r.label} detail={r.detail} />)}
      </ul>

      {error && (
        <div className="mt-4 space-y-3">
          <Alert tone="error" title="We couldn't read this card">{error}</Alert>
          <Button variant="brand" fullWidth onClick={onCancel}>Try another photo</Button>
        </div>
      )}
    </Card>
  );
}
