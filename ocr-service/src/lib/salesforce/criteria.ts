import type { CardContact } from "../crm/types";
import type { DuplicateSearchCriteria } from "./types";

export function normalisePhone(value?: string): string | undefined {
  if (!value) return undefined;
  const d = value.replace(/\D/g, "");
  return d.length >= 7 ? d : undefined;
}

/** Last 10 digits - makes "+91 94950 72255" match "9495072255". */
export function phoneKey(value?: string): string | undefined {
  const d = normalisePhone(value);
  return d ? d.slice(-10) : undefined;
}

export function domainOf(emailOrUrl?: string): string | undefined {
  if (!emailOrUrl) return undefined;
  let host = emailOrUrl.trim().toLowerCase();
  if (host.includes("@")) host = host.split("@")[1];
  host = host.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const generic = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com", "protonmail.com", "aol.com"]);
  if (!host || generic.has(host)) return undefined;
  return host;
}

export function normaliseCompany(name?: string): string | undefined {
  if (!name) return undefined;
  const cleaned = name
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|ltd|llc|llp|plc|pvt|private|limited|corp|corporation|co|company|gmbh|technologies|technology|solutions)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

export function criteriaFromContact(contact: CardContact): DuplicateSearchCriteria {
  const phones = [phoneKey(contact.mobile), phoneKey(contact.phone)].filter((p): p is string => Boolean(p));
  return {
    email: contact.email?.trim().toLowerCase() || undefined,
    phones: Array.from(new Set(phones)),
    firstName: contact.firstName?.trim() || undefined,
    lastName: contact.lastName?.trim() || undefined,
    company: contact.company?.trim() || undefined,
    website: contact.website?.trim() || undefined,
    domain: domainOf(contact.email) ?? domainOf(contact.website),
  };
}
