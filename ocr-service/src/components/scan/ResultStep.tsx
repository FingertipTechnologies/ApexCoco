"use client";

import { useState } from "react";
import { UserPlus, AlertTriangle, ExternalLink, RefreshCw, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { StatusRow } from "@/components/ui/StatusRow";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { MatchCard } from "./MatchCard";
import { createLead, updateRecord, ApiError } from "@/lib/api-client";
import type { DuplicateCheckResult, RecordMatch } from "@/lib/salesforce/duplicate-check";
import type { CreateLeadResult } from "@/lib/salesforce/types";
import { fullName, type CardContact } from "@/lib/crm/types";

interface Props {
  contact: CardContact;
  check: DuplicateCheckResult;
  onLeadCreated: (lead: CreateLeadResult) => void;
  onRecordUpdated: (info: { match: RecordMatch; updatedFields: string[]; url?: string }) => void;
  onBack: () => void;
}

/** Step 5 - "New Prospect" or "Potential Existing Customer Found". */
export function ResultStep(props: Props) {
  return props.check.status === "new" ? <NewProspect {...props} /> : <MatchFound {...props} />;
}

function useLeadCreation(contact: CardContact, onLeadCreated: (lead: CreateLeadResult) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create() {
    setBusy(true);
    setError(null);
    try {
      onLeadCreated(await createLead(contact));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salesforce could not create the Lead. Please try again.");
      setBusy(false);
    }
  }
  return { busy, error, create };
}

function NewProspect({ contact, check, onLeadCreated, onBack }: Props) {
  const { busy, error, create } = useLeadCreation(contact, onLeadCreated);
  return (
    <Card title="New Prospect" icon={<UserPlus className="h-4 w-4" aria-hidden />} actions={<Badge tone="success">No duplicates</Badge>}>
      <ul className="divide-y divide-sf-border">
        <StatusRow state="done" label="No matching Lead found" />
        <StatusRow state="done" label="No matching Contact found" />
        <StatusRow state="done" label="No matching Account found" />
      </ul>
      <Alert tone="success" className="mt-3" title="No existing customer found.">This appears to be a new prospect.</Alert>

      <div className="mt-4 rounded-sf border border-sf-border bg-sf-bg p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sf-text-muted">Lead to be created</p>
        <p className="mt-1 text-base font-bold text-sf-text">{fullName(contact)}</p>
        <p className="text-sf-text-weak">{[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 text-sf-text-weak">{[contact.email, contact.mobile ?? contact.phone].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 text-xs text-sf-text-muted">Lead Source: Trade Show / Exhibition · Checked {new Date(check.checkedAt).toLocaleTimeString()}</p>
      </div>

      {error && <Alert tone="error" className="mt-4" title="Lead not created">{error}</Alert>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
        <Button variant="neutral" size="lg" icon={<ArrowLeft className="h-4 w-4" aria-hidden />} onClick={onBack} disabled={busy}>Back</Button>
        <Button variant="brand" size="lg" icon={<UserPlus className="h-5 w-5" aria-hidden />} loading={busy} onClick={create}>Create Lead</Button>
      </div>
    </Card>
  );
}

function MatchFound({ contact, check, onLeadCreated, onRecordUpdated, onBack }: Props) {
  const { busy: creating, error: createError, create } = useLeadCreation(contact, onLeadCreated);
  const all: RecordMatch[] = [...check.accounts, ...check.contacts, ...check.leads];
  const defaultTarget = check.contacts[0] ?? check.leads[0] ?? check.accounts[0];
  const [mode, setMode] = useState<"view" | "update" | "duplicate">("view");
  const [target, setTarget] = useState<RecordMatch | undefined>(defaultTarget);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const best = check.bestMatch ?? defaultTarget;
  const external = best ? /^https?:\/\//.test(best.url) : false;

  async function doUpdate() {
    if (!target) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await updateRecord(target.type, target.id, contact);
      onRecordUpdated({ match: target, updatedFields: res.updatedFields, url: res.url });
    } catch (err) {
      setUpdateError(err instanceof ApiError ? err.message : "Salesforce could not update the record.");
      setUpdating(false);
    }
  }

  const summaryFields = Array.from(new Map(all.flatMap((m) => m.matchedFields).map((f) => [f.key, f])).values());

  return (
    <div className="space-y-4">
      <Card title="Potential Existing Customer Found" icon={<AlertTriangle className="h-4 w-4" aria-hidden />} actions={<Badge tone="warning">Review before creating</Badge>}>
        <div className="flex items-center gap-4 rounded-sf border border-sf-warning/40 bg-sf-warning-bg p-3">
          <ConfidenceMeter value={check.confidence} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-sf-text">{fullName(contact)}{contact.company ? ` · ${contact.company}` : ""} may already be in Salesforce.</p>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {summaryFields.map((f) => (
                <div key={f.key} className="min-w-0">
                  <dt className="text-xs text-sf-text-muted">{f.label}</dt>
                  <dd className="truncate font-medium text-sf-text">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-sf-border">
          <StatusRow state={check.leads.length ? "warn" : "done"} label={check.leads.length ? `${check.leads.length} matching Lead${check.leads.length > 1 ? "s" : ""} found` : "No matching Lead found"} />
          <StatusRow state={check.contacts.length ? "warn" : "done"} label={check.contacts.length ? `${check.contacts.length} matching Contact${check.contacts.length > 1 ? "s" : ""} found` : "No matching Contact found"} />
          <StatusRow state={check.accounts.length ? "warn" : "done"} label={check.accounts.length ? `${check.accounts.length} matching Account${check.accounts.length > 1 ? "s" : ""} found` : "No matching Account found"} />
        </ul>

        <div className="mt-3 space-y-2">
          {all.map((m) => (
            <MatchCard key={`${m.type}-${m.id}`} match={m} selected={mode === "update" && target?.id === m.id} onSelect={mode === "update" ? () => setTarget(m) : undefined} />
          ))}
        </div>

        {mode === "view" && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            {best && (
              <a href={best.url} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="inline-flex h-12 items-center justify-center gap-2 rounded-sf border border-sf-brand bg-sf-brand px-5 text-base font-semibold text-white hover:bg-sf-brand-dark">
                <ExternalLink className="h-5 w-5" aria-hidden /> Open Existing Customer
              </a>
            )}
            <Button variant="neutral" size="lg" icon={<RefreshCw className="h-4 w-4" aria-hidden />} onClick={() => setMode("update")}>Update Existing Record</Button>
            <Button variant="ghost" size="lg" onClick={() => setMode("duplicate")}>Create New Lead Anyway</Button>
            <button type="button" onClick={onBack} className="mt-1 text-sm font-semibold text-sf-brand hover:underline">Back to review</button>
          </div>
        )}

        {mode === "update" && (
          <div className="mt-4 space-y-3">
            <Alert tone="info" title={`Update ${target?.type ?? "record"}: ${target?.title ?? ""}`}>
              Details from the card will be written onto this record. Fields that are empty on the card are left unchanged.
            </Alert>
            {updateError && <Alert tone="error" title="Update failed">{updateError}</Alert>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
              <Button variant="neutral" size="lg" onClick={() => setMode("view")} disabled={updating}>Cancel</Button>
              <Button variant="brand" size="lg" icon={<RefreshCw className="h-4 w-4" aria-hidden />} loading={updating} onClick={doUpdate} disabled={!target}>Confirm Update</Button>
            </div>
          </div>
        )}

        {mode === "duplicate" && (
          <div className="mt-4 space-y-3">
            <Alert tone="warning" title="This may create a duplicate Lead.">
              A matching record already exists. Only continue if this is genuinely a separate opportunity.
            </Alert>
            {createError && <Alert tone="error" title="Lead not created">{createError}</Alert>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
              <Button variant="neutral" size="lg" onClick={() => setMode("view")} disabled={creating}>Cancel</Button>
              <Button variant="destructive" size="lg" icon={<UserPlus className="h-4 w-4" aria-hidden />} loading={creating} onClick={create}>Create New Lead Anyway</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
