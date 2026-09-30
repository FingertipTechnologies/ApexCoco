"use client";

import { useState } from "react";
import { ClipboardCheck, Pencil, Check, QrCode, FileText, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { CARD_CONTACT_FIELDS, CARD_CONTACT_LABELS, compactContact, type CardContact, type CardContactField, type ExtractionResult, type FieldSource } from "@/lib/crm/types";

interface Props {
  extraction: ExtractionResult;
  previewUrl: string;
  initialContact: CardContact;
  onConfirm: (contact: CardContact) => void;
  onRescan: () => void;
}

const SOURCE_BADGE: Record<FieldSource, { label: string; tone: "brand" | "info" | "neutral" | "success" }> = {
  qr: { label: "QR", tone: "brand" },
  ai: { label: "AI", tone: "info" },
  ocr: { label: "OCR", tone: "neutral" },
  manual: { label: "Edited", tone: "success" },
};

const INPUT_TYPES: Partial<Record<CardContactField, string>> = { email: "email", mobile: "tel", phone: "tel", website: "url" };
const AUTOCOMPLETE: Partial<Record<CardContactField, string>> = {
  firstName: "given-name", lastName: "family-name", jobTitle: "organization-title", company: "organization",
  mobile: "tel", phone: "tel", email: "email", website: "url", address: "street-address", city: "address-level2", state: "address-level1", country: "country-name",
};

function validate(contact: CardContact): Partial<Record<CardContactField, string>> {
  const errors: Partial<Record<CardContactField, string>> = {};
  if (!contact.firstName && !contact.lastName) errors.lastName = "Enter at least a first or last name.";
  if (!contact.company) errors.company = "Company is required to create a Lead.";
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) errors.email = "Enter a valid email address.";
  if (contact.mobile && contact.mobile.replace(/\D/g, "").length < 7) errors.mobile = "Enter a valid mobile number.";
  if (contact.phone && contact.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
  return errors;
}

/** Step 3 - editable review of the extracted CRM fields before anything touches Salesforce. */
export function ReviewStep({ extraction, previewUrl, initialContact, onConfirm, onRescan }: Props) {
  const [contact, setContact] = useState<CardContact>(initialContact);
  const [sources, setSources] = useState(extraction.sources);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<CardContactField, string>>>({});
  const [showRaw, setShowRaw] = useState(false);

  function setField(field: CardContactField, value: string) {
    setContact((c) => ({ ...c, [field]: value }));
    setSources((s) => ({ ...s, [field]: "manual" }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function confirm() {
    const clean = compactContact(contact);
    const next = validate(clean);
    setErrors(next);
    if (Object.keys(next).length) {
      setEditing(true);
      return;
    }
    onConfirm(clean);
  }

  const filled = CARD_CONTACT_FIELDS.filter((f) => contact[f]?.trim()).length;
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="space-y-4">
      <Card
        title="Review Extracted Information"
        icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
        actions={<Badge tone={filled >= 5 ? "success" : "warning"}>{filled}/{CARD_CONTACT_FIELDS.length} fields</Badge>}
      >
        <div className="flex gap-3">
          <div className="hidden w-32 shrink-0 overflow-hidden rounded-sf border border-sf-border bg-sf-bg sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Scanned visiting card" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 text-sm text-sf-text-weak">
            <p>Check the details below against the card. Anything the scanner missed or misread can be corrected before continuing.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">OCR · {extraction.pipeline.ocrProvider}</Badge>
              {extraction.pipeline.qrDetected && <Badge tone="brand"><QrCode className="h-3 w-3" aria-hidden /> QR merged</Badge>}
              {extraction.pipeline.parser === "ai" && <Badge tone="info">AI extraction</Badge>}
              {typeof extraction.ocrConfidence === "number" && <Badge tone={extraction.ocrConfidence >= 75 ? "success" : "warning"}>{Math.round(extraction.ocrConfidence)}% OCR confidence</Badge>}
            </div>
          </div>
        </div>

        {extraction.warnings.length > 0 && (
          <Alert tone="warning" className="mt-4" title="Please double-check">
            <ul className="list-disc pl-4">{extraction.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </Alert>
        )}
        {hasErrors && <Alert tone="error" className="mt-4" title="Some details need attention">Fix the highlighted fields to continue.</Alert>}

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {CARD_CONTACT_FIELDS.map((field) => {
            const src = sources[field];
            return (
              <Field
                key={field}
                label={CARD_CONTACT_LABELS[field]}
                value={contact[field] ?? ""}
                onChange={(v) => setField(field, v)}
                editing={editing}
                error={errors[field]}
                required={field === "lastName" || field === "company"}
                type={INPUT_TYPES[field] ?? "text"}
                autoComplete={AUTOCOMPLETE[field]}
                inputMode={INPUT_TYPES[field] === "tel" ? "tel" : INPUT_TYPES[field] === "email" ? "email" : undefined}
                badge={src && contact[field] ? <Badge tone={SOURCE_BADGE[src].tone}>{SOURCE_BADGE[src].label}</Badge> : undefined}
                className={field === "address" ? "sm:col-span-2" : ""}
              />
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant={editing ? "success" : "neutral"} size="lg" icon={editing ? <Check className="h-4 w-4" aria-hidden /> : <Pencil className="h-4 w-4" aria-hidden />} onClick={() => setEditing((e) => !e)}>
            {editing ? "Done Editing" : "Edit Information"}
          </Button>
          <Button variant="brand" size="lg" onClick={confirm}>Confirm &amp; Check Existing Records</Button>
        </div>
        <button type="button" onClick={onRescan} className="mt-3 text-sm font-semibold text-sf-brand hover:underline">Scan a different card</button>
      </Card>

      <Card padded={false}>
        <button type="button" onClick={() => setShowRaw((s) => !s)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-sf-text" aria-expanded={showRaw}>
          <FileText className="h-4 w-4 text-sf-text-muted" aria-hidden />
          <span className="flex-1">Scanner details</span>
          <ChevronDown className={`h-4 w-4 text-sf-text-muted transition-transform ${showRaw ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {showRaw && (
          <div className="border-t border-sf-border px-4 py-3 text-xs">
            <p className="font-semibold text-sf-text-muted">Raw OCR text</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-sf bg-sf-bg p-2 font-mono text-[11px] text-sf-text-weak">{extraction.rawText || "(no text recognised)"}</pre>
            {extraction.qr && (
              <>
                <p className="mt-3 font-semibold text-sf-text-muted">QR payload ({extraction.qr.format})</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-sf bg-sf-bg p-2 font-mono text-[11px] text-sf-text-weak">{extraction.qr.raw}</pre>
              </>
            )}
            <p className="mt-3 text-sf-text-muted">Processed in {(extraction.pipeline.durationMs / 1000).toFixed(1)}s</p>
          </div>
        )}
      </Card>
    </div>
  );
}
