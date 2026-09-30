import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, User, UserPlus } from "lucide-react";
import { getSalesforceClient, type SalesforceObjectType } from "@/lib/salesforce";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  FirstName: "First Name", LastName: "Last Name", Title: "Title", Company: "Company", Name: "Account Name", Email: "Email", Phone: "Phone",
  MobilePhone: "Mobile", Website: "Website", Street: "Street", City: "City", State: "State/Province", Country: "Country", Status: "Lead Status",
  LeadSource: "Lead Source", Description: "Description", Industry: "Industry", Type: "Type", BillingStreet: "Billing Street", BillingCity: "Billing City",
  BillingState: "Billing State", BillingCountry: "Billing Country", NumberOfEmployees: "Employees", MailingStreet: "Mailing Street", MailingCity: "Mailing City",
  MailingState: "Mailing State", MailingCountry: "Mailing Country", CreatedDate: "Created", AccountId: "Account ID",
};

function resolveType(value: string): SalesforceObjectType | null {
  const t = value.toLowerCase();
  return t === "lead" ? "Lead" : t === "contact" ? "Contact" : t === "account" ? "Account" : null;
}

/** Lightning-style record page used by "Open Existing Customer" / "Open Lead" with the mock org. */
export default async function RecordPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type: rawType, id } = await params;
  const type = resolveType(rawType);
  if (!type) notFound();
  const found = await getSalesforceClient().getRecord(type, id);
  if (!found) notFound();

  const record = found.record as unknown as Record<string, unknown>;
  const name = type === "Account" ? String(record.Name ?? "") : [record.FirstName, record.LastName].filter(Boolean).join(" ");
  const subtitle = type === "Account"
    ? [record.Industry, record.Type].filter(Boolean).join(" · ")
    : [record.Title, type === "Contact" ? (record.Account as { Name?: string } | undefined)?.Name : record.Company].filter(Boolean).join(" · ");
  const Icon = type === "Account" ? Building2 : type === "Contact" ? User : UserPlus;

  const entries = Object.entries(record).filter(([k, v]) => k !== "Id" && k !== "Account" && k !== "attributes" && v !== undefined && v !== null && v !== "");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-sf-brand hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Scan Visiting Card</Link>
      <div className="mt-3 flex items-center gap-3 rounded-sf border border-sf-border bg-white p-4 shadow-sf-card">
        <span className={`flex h-12 w-12 items-center justify-center rounded-sf text-white ${type === "Account" ? "bg-[#7f8de1]" : type === "Contact" ? "bg-[#a094ed]" : "bg-[#f88962]"}`}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-sf-text-muted">{type}</p>
          <h1 className="truncate text-xl font-bold text-sf-text">{name}</h1>
          {subtitle && <p className="truncate text-sm text-sf-text-weak">{subtitle}</p>}
        </div>
        <Badge tone="neutral">{id}</Badge>
      </div>

      <Card title="Details" className="mt-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs font-semibold text-sf-text-muted">{LABELS[k] ?? k}</dt>
              <dd className="mt-0.5 truncate border-b border-sf-border pb-1 text-sm text-sf-text">{k === "CreatedDate" ? new Date(String(v)).toLocaleString() : String(v)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <p className="mt-3 text-xs text-sf-text-muted">This is the in-app record view of the mock Salesforce org. With a real org configured, these links open the record in Lightning Experience.</p>
    </div>
  );
}
