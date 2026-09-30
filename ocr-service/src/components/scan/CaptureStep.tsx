"use client";

import { useRef, useState } from "react";
import { Camera, Upload, ScanLine, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 12 * 1024 * 1024;

interface Props {
  onProcess: (file: File, previewUrl: string) => void;
}

/** Step 1 - take or upload a visiting-card photo, preview it, process it. */
export function CaptureStep({ onProcess }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  function accept(next: File | null) {
    setError(null);
    if (!next) return;
    if (!ACCEPT.split(",").includes(next.type)) {
      setError("Please choose a JPEG, PNG or WebP image of the card.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("That image is over 12 MB. Please use a smaller photo.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (cameraInput.current) cameraInput.current.value = "";
    if (fileInput.current) fileInput.current.value = "";
  }

  async function useDemoCard() {
    setLoadingDemo(true);
    setError(null);
    try {
      const res = await fetch("/demo/ameen-azeez-card.png");
      if (!res.ok) throw new Error("Demo card not found");
      const blob = await res.blob();
      accept(new File([blob], "ameen-azeez-card.png", { type: "image/png" }));
    } catch {
      setError("Could not load the demo card image.");
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Scan Visiting Card" icon={<ScanLine className="h-4 w-4" aria-hidden />}>
        <input ref={cameraInput} type="file" accept={ACCEPT} capture="environment" className="sr-only" onChange={(e) => accept(e.target.files?.[0] ?? null)} />
        <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => accept(e.target.files?.[0] ?? null)} />

        {!previewUrl ? (
          <>
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-sf border-2 border-dashed border-sf-border-strong bg-sf-bg/60 px-4 py-10 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files?.[0] ?? null); }}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sf-brand-light text-sf-brand">
                <Camera className="h-7 w-7" aria-hidden />
              </span>
              <p className="text-base font-semibold text-sf-text">Capture the visiting card</p>
              <p className="max-w-xs text-sm text-sf-text-muted">Hold the card flat, fill the frame and avoid glare. The details are extracted automatically.</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="brand" size="lg" icon={<Camera className="h-5 w-5" aria-hidden />} onClick={() => cameraInput.current?.click()}>Take Photo</Button>
              <Button variant="neutral" size="lg" icon={<Upload className="h-5 w-5" aria-hidden />} onClick={() => fileInput.current?.click()}>Upload Image</Button>
            </div>
            <button type="button" onClick={useDemoCard} disabled={loadingDemo} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sf-brand hover:underline disabled:opacity-60">
              <Sparkles className="h-4 w-4" aria-hidden />
              {loadingDemo ? "Loading demo card…" : "Use the sample card (Ameen Azeez, Fingertip)"}
            </button>
          </>
        ) : (
          <>
            <div className="overflow-hidden rounded-sf border border-sf-border bg-sf-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Visiting card preview" className="mx-auto max-h-80 w-full object-contain" />
            </div>
            <p className="mt-2 truncate text-xs text-sf-text-muted">{file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
              <Button variant="neutral" size="lg" icon={<RotateCcw className="h-4 w-4" aria-hidden />} onClick={reset}>Retake</Button>
              <Button variant="brand" size="lg" icon={<ScanLine className="h-5 w-5" aria-hidden />} onClick={() => file && previewUrl && onProcess(file, previewUrl)}>Process Card</Button>
            </div>
          </>
        )}

        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      </Card>

      <Card padded>
        <h3 className="text-sm font-bold text-sf-text">How it works</h3>
        <ol className="mt-2 space-y-1.5 text-sm text-sf-text-weak">
          <li><span className="font-semibold text-sf-brand-darker">1.</span> The card image is read with OCR and any QR code is decoded.</li>
          <li><span className="font-semibold text-sf-brand-darker">2.</span> You review and correct the extracted details.</li>
          <li><span className="font-semibold text-sf-brand-darker">3.</span> Salesforce is checked for matching Leads, Contacts and Accounts.</li>
          <li><span className="font-semibold text-sf-brand-darker">4.</span> A Lead is created, or the existing customer record is opened.</li>
        </ol>
      </Card>
    </div>
  );
}
