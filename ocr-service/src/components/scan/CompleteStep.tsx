"use client";

import { CheckCircle2, ExternalLink, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CARD_CONTACT_FIELDS, CARD_CONTACT_LABELS, fullName, type CardContact } from "@/lib/crm/types";
import type { CreateLeadResult } from "@/lib/salesforce/types";
import type { RecordMatch } from "@/lib/salesforce/duplicate-check";

export type Outcome =
  | { kind: "lead-created"; lead: CreateLeadResult }
  | { kind: "record-updated"; match: RecordMatch; updatedFields: string[]; url?: string };

/** Final success state for both branches. */
export function CompleteStep({ contact, outcome, onRestart }: { contact: CardContact; outcome: Outcome; onRestart: () => void }) {
  const url = outcome.kind === "lead-created" ? outcome.lead.url : outcome.url ?? outcome.match.url;
  const external = url ? /^https?:\/\//.test(url) : false;
  const title = outcome.kind === "lead-created" ? "Lead Created" : `${outcome.match.type} Updated`;

  return (
    <Card padded>
      <div className="flex flex-col items-center py-4 text-center">
        <span className="sf-pop flex h-16 w-16 items-center justify-center rounded-full bg-sf-success-bg text-sf-success">
          <CheckCircle2 className="h-9 w-9" aria-hidden />
        </span>
        <h2 className="mt-3 text-xl font-bold text-sf-text">{title}</h2>
        <p className="mt-1 text-sm text-sf-text-weak">
          {outcome.kind === "lead-created"
            ? <>A new Lead for <span className="font-semibold text-sf-text">{fullName(contact)}</span> at <span className="font-semibold text-sf-text">{contact.company}</span> is now in Salesforce, with no manual data entry.</>
            : <><span className="font-semibold text-sf-text">{outcome.match.title}</span> was updated with the details from the card.</>}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {outcome.kind === "lead-created" ? (
            <>
              <Badge tone="brand">Lead · {outcome.lead.id}</Badge>
              <Badge tone="neutral">Status · {outcome.lead.record.Status}</Badge>
              <Badge tone="neutral">Source · {outcome.lead.record.LeadSource}</Badge>
            </>
          ) : (
            <Badge tone="brand">{outcome.updatedFields.length} field{outcome.updatedFields.length === 1 ? "" : "s"} updated</Badge>
          )}
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 rounded-sf border border-sf-border bg-sf-bg p-3 text-sm sm:grid-cols-2">
        {CARD_CONTACT_FIELDS.filter((f) => contact[f]).map((f) => (
          <div key={f} className="min-w-0">
            <dt className="text-xs text-sf-text-muted">{CARD_CONTACT_LABELS[f]}</dt>
            <dd className="truncate font-medium text-sf-text">{contact[f]}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {url && (
          <a href={url} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="inline-flex h-12 items-center justify-center gap-2 rounded-sf border border-sf-brand bg-sf-brand px-5 text-base font-semibold text-white hover:bg-sf-brand-dark">
            <ExternalLink className="h-5 w-5" aria-hidden /> {outcome.kind === "lead-created" ? "Open Lead" : `Open ${outcome.match.type}`}
          </a>
        )}
        <Button variant="neutral" size="lg" icon={<ScanLine className="h-5 w-5" aria-hidden />} onClick={onRestart}>Scan Another Card</Button>
      </div>
    </Card>
  );
}
