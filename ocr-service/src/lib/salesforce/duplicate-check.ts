import type { CardContact } from "../crm/types";
import type {
  SalesforceClient,
  SalesforceLead,
  SalesforceContact,
  SalesforceAccount,
  SalesforceObjectType,
  DuplicateSearchCriteria,
} from "./types";
import { criteriaFromContact, phoneKey, domainOf, normaliseCompany } from "./criteria";

export type MatchFieldKey = "email" | "phone" | "name" | "company" | "website";

export interface MatchedField {
  key: MatchFieldKey;
  label: string;     // "Email Match"
  value: string;     // the value that matched, as stored in Salesforce
}

export interface RecordMatch<T = SalesforceLead | SalesforceContact | SalesforceAccount> {
  type: SalesforceObjectType;
  id: string;
  title: string;         // display name for the card
  subtitle?: string;     // e.g. "Head of Sales · Fingertip"
  url: string;
  confidence: number;    // 0-100
  matchedFields: MatchedField[];
  record: T;
}

export interface ObjectCheckResult {
  type: SalesforceObjectType;
  matches: RecordMatch[];
}

export interface DuplicateCheckResult {
  status: "new" | "match";
  leads: RecordMatch<SalesforceLead>[];
  contacts: RecordMatch<SalesforceContact>[];
  accounts: RecordMatch<SalesforceAccount>[];
  /** Highest-confidence record across all objects, when status = "match". */
  bestMatch?: RecordMatch;
  /** Confidence of the best match, 0-100. */
  confidence: number;
  criteria: DuplicateSearchCriteria;
  checkedAt: string;
}

// Weights per matching signal. They sum above 1 on purpose: two strong
// signals (email + phone) saturate to ~100%.
const WEIGHTS: Record<SalesforceObjectType, Partial<Record<MatchFieldKey, number>>> = {
  Lead:    { email: 0.55, phone: 0.35, name: 0.25, company: 0.2, website: 0.2 },
  Contact: { email: 0.55, phone: 0.35, name: 0.25, company: 0.2, website: 0.2 },
  Account: { company: 0.55, website: 0.4, phone: 0.3, email: 0.35 },
};

function score(type: SalesforceObjectType, fields: MatchedField[]): number {
  const raw = fields.reduce((sum, f) => sum + (WEIGHTS[type][f.key] ?? 0), 0);
  // Soft cap so one signal reads as "possible", two as "likely", three as "near certain".
  const capped = 1 - Math.exp(-2.6 * raw);
  return Math.round(Math.min(0.99, capped) * 100);
}

function matchPerson(
  type: "Lead" | "Contact",
  r: SalesforceLead | SalesforceContact,
  c: DuplicateSearchCriteria,
  companyName?: string,
  website?: string,
): MatchedField[] {
  const fields: MatchedField[] = [];
  if (c.email && r.Email && r.Email.toLowerCase() === c.email) fields.push({ key: "email", label: "Email Match", value: r.Email });
  const phones = [r.Phone, r.MobilePhone].filter(Boolean) as string[];
  const phoneHit = phones.find((p) => c.phones.includes(phoneKey(p) ?? "__"));
  if (phoneHit) fields.push({ key: "phone", label: "Phone Match", value: phoneHit });
  if (c.firstName && c.lastName && r.FirstName?.toLowerCase() === c.firstName.toLowerCase() && r.LastName.toLowerCase() === c.lastName.toLowerCase()) {
    fields.push({ key: "name", label: "Name Match", value: `${r.FirstName} ${r.LastName}` });
  }
  if (c.company && companyName && normaliseCompany(companyName) === normaliseCompany(c.company)) {
    fields.push({ key: "company", label: "Company Match", value: companyName });
  }
  const recDomain = domainOf(r.Email) ?? domainOf(website);
  if (c.domain && recDomain === c.domain && !fields.some((f) => f.key === "email")) {
    fields.push({ key: "website", label: "Domain Match", value: recDomain! });
  }
  return fields;
}

function matchAccount(a: SalesforceAccount, c: DuplicateSearchCriteria): MatchedField[] {
  const fields: MatchedField[] = [];
  if (c.company && normaliseCompany(a.Name) === normaliseCompany(c.company)) fields.push({ key: "company", label: "Company Match", value: a.Name });
  const d = domainOf(a.Website);
  if (c.domain && d === c.domain) fields.push({ key: "website", label: "Website Match", value: a.Website! });
  if (a.Phone && c.phones.includes(phoneKey(a.Phone) ?? "__")) fields.push({ key: "phone", label: "Phone Match", value: a.Phone });
  return fields;
}

/** Runs the duplicate check for one Salesforce object. Used to drive the step-by-step progress UI. */
export async function checkObject(client: SalesforceClient, type: SalesforceObjectType, contact: CardContact): Promise<ObjectCheckResult> {
  const criteria = criteriaFromContact(contact);
  const matches: RecordMatch[] = [];

  if (type === "Lead") {
    for (const r of await client.findLeads(criteria)) {
      const fields = matchPerson("Lead", r, criteria, r.Company, r.Website);
      if (!fields.length) continue;
      matches.push({ type, id: r.Id, title: [r.FirstName, r.LastName].filter(Boolean).join(" "), subtitle: [r.Title, r.Company].filter(Boolean).join(" · "), url: client.recordUrl(type, r.Id), confidence: score(type, fields), matchedFields: fields, record: r });
    }
  } else if (type === "Contact") {
    for (const r of await client.findContacts(criteria)) {
      const fields = matchPerson("Contact", r, criteria, r.Account?.Name);
      if (!fields.length) continue;
      matches.push({ type, id: r.Id, title: [r.FirstName, r.LastName].filter(Boolean).join(" "), subtitle: [r.Title, r.Account?.Name].filter(Boolean).join(" · "), url: client.recordUrl(type, r.Id), confidence: score(type, fields), matchedFields: fields, record: r });
    }
  } else {
    for (const a of await client.findAccounts(criteria)) {
      const fields = matchAccount(a, criteria);
      if (!fields.length) continue;
      matches.push({ type, id: a.Id, title: a.Name, subtitle: [a.Industry, a.Type].filter(Boolean).join(" · "), url: client.recordUrl(type, a.Id), confidence: score(type, fields), matchedFields: fields, record: a });
    }
  }

  matches.sort((x, y) => y.confidence - x.confidence);
  return { type, matches };
}

/** Full check across Leads, Contacts and Accounts. */
export async function checkDuplicates(client: SalesforceClient, contact: CardContact): Promise<DuplicateCheckResult> {
  const [leads, contacts, accounts] = await Promise.all([
    checkObject(client, "Lead", contact),
    checkObject(client, "Contact", contact),
    checkObject(client, "Account", contact),
  ]);
  return summarise(contact, leads.matches as RecordMatch<SalesforceLead>[], contacts.matches as RecordMatch<SalesforceContact>[], accounts.matches as RecordMatch<SalesforceAccount>[]);
}

export function summarise(
  contact: CardContact,
  leads: RecordMatch<SalesforceLead>[],
  contacts: RecordMatch<SalesforceContact>[],
  accounts: RecordMatch<SalesforceAccount>[],
): DuplicateCheckResult {
  const all: RecordMatch[] = [...contacts, ...leads, ...accounts];
  const bestMatch = all.reduce<RecordMatch | undefined>((best, m) => (!best || m.confidence > best.confidence ? m : best), undefined);

  // Overall confidence combines the best person match with a corroborating
  // account match, so "same person + same company" reads higher than either alone.
  let confidence = bestMatch?.confidence ?? 0;
  const personBest = [...contacts, ...leads][0];
  const accountBest = accounts[0];
  if (personBest && accountBest) {
    const union = new Set([...personBest.matchedFields, ...accountBest.matchedFields].map((f) => f.key));
    const combined = score(personBest.type, Array.from(union).map((key) => ({ key, label: "", value: "" })));
    confidence = Math.max(confidence, combined);
  }

  return {
    status: all.length ? "match" : "new",
    leads,
    contacts,
    accounts,
    bestMatch,
    confidence,
    criteria: criteriaFromContact(contact),
    checkedAt: new Date().toISOString(),
  };
}
