"use client";

import { useEffect, useRef, useState } from "react";
import { SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { StatusRow, type RowState } from "@/components/ui/StatusRow";
import { checkObject } from "@/lib/api-client";
import { summarise, type DuplicateCheckResult, type RecordMatch } from "@/lib/salesforce/duplicate-check";
import type { SalesforceLead, SalesforceContact, SalesforceAccount, SalesforceObjectType } from "@/lib/salesforce/types";
import type { CardContact } from "@/lib/crm/types";
import { fullName } from "@/lib/crm/types";

interface Props {
  contact: CardContact;
  onDone: (result: DuplicateCheckResult) => void;
  onBack: () => void;
}

const ORDER: SalesforceObjectType[] = ["Lead", "Contact", "Account"];

/** Step 4 - checks Salesforce Leads, Contacts and Accounts one after another. */
export function DuplicateCheckStep({ contact, onDone, onBack }: Props) {
  const started = useRef(false);
  const [states, setStates] = useState<Record<SalesforceObjectType, RowState>>({ Lead: "pending", Contact: "pending", Account: "pending" });
  const [counts, setCounts] = useState<Partial<Record<SalesforceObjectType, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      const found: Partial<Record<SalesforceObjectType, RecordMatch[]>> = {};
      try {
        for (const type of ORDER) {
          setStates((s) => ({ ...s, [type]: "running" }));
          const res = await checkObject(type, contact);
          if (cancelled) return;
          found[type] = res.matches;
          setCounts((c) => ({ ...c, [type]: res.matches.length }));
          setStates((s) => ({ ...s, [type]: res.matches.length ? "warn" : "done" }));
        }
        const result = summarise(
          contact,
          (found.Lead ?? []) as RecordMatch<SalesforceLead>[],
          (found.Contact ?? []) as RecordMatch<SalesforceContact>[],
          (found.Account ?? []) as RecordMatch<SalesforceAccount>[],
        );
        setTimeout(() => { if (!cancelled) onDone(result); }, 700);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Salesforce lookup failed.");
        setStates((s) => {
          const next = { ...s };
          for (const t of ORDER) if (next[t] === "running") next[t] = "error";
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
      started.current = false; // allow React strict-mode re-run / retry
    };
  }, [contact, onDone, attempt]);

  const labels: Record<SalesforceObjectType, string> = { Lead: "Leads", Contact: "Contacts", Account: "Accounts" };

  return (
    <Card title="Checking Existing Records" icon={<SearchCheck className="h-4 w-4" aria-hidden />}>
      <p className="text-sm text-sf-text-weak">
        Looking for <span className="font-semibold text-sf-text">{fullName(contact) || "this contact"}</span>{contact.company ? <> at <span className="font-semibold text-sf-text">{contact.company}</span></> : null} across Salesforce using email, phone, name, company and web domain.
      </p>
      {!error && <div className="sf-progress-bar relative mt-4 h-1 overflow-hidden rounded-full bg-sf-brand-light" aria-hidden />}
      <ul className="mt-3 divide-y divide-sf-border" aria-live="polite">
        {ORDER.map((type) => {
          const st = states[type];
          const n = counts[type];
          const label = st === "running" ? `Checking ${labels[type]}...` : st === "pending" ? `Check ${labels[type]}` : n ? `${n} possible ${n === 1 ? type : labels[type]} match${n === 1 ? "" : "es"} found` : `No matching ${type} found`;
          return <StatusRow key={type} state={st} label={label} />;
        })}
      </ul>
      {error && (
        <div className="mt-4 space-y-3">
          <Alert tone="error" title="Salesforce lookup failed">{error}</Alert>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="neutral" onClick={onBack}>Back to review</Button>
            <Button variant="brand" onClick={() => { setError(null); setStates({ Lead: "pending", Contact: "pending", Account: "pending" }); setCounts({}); setAttempt((a) => a + 1); }}>Retry</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
