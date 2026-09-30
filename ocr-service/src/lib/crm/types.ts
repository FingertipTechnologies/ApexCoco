/**
 * Structured CRM data extracted from a visiting card.
 *
 * This is the contract between the extraction layer (OCR + QR + parsing)
 * and the Salesforce layer (duplicate check + Lead creation). Every field is
 * optional because a card may not carry it; the review screen lets the
 * salesperson fill in anything that is missing.
 */
export interface CardContact {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  company?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export type CardContactField = keyof CardContact;

export const CARD_CONTACT_FIELDS: readonly CardContactField[] = [
  "firstName",
  "lastName",
  "jobTitle",
  "company",
  "mobile",
  "phone",
  "email",
  "website",
  "address",
  "city",
  "state",
  "country",
] as const;

export const CARD_CONTACT_LABELS: Record<CardContactField, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  jobTitle: "Job Title",
  company: "Company",
  mobile: "Mobile",
  phone: "Phone",
  email: "Email",
  website: "Website",
  address: "Address",
  city: "City",
  state: "State",
  country: "Country",
};

/** Where a given field value came from, for the review screen badges. */
export type FieldSource = "ocr" | "qr" | "ai" | "manual";

export type FieldSources = Partial<Record<CardContactField, FieldSource>>;

/** Full result of processing one visiting-card image. */
export interface ExtractionResult {
  contact: CardContact;
  sources: FieldSources;
  /** Raw text produced by the OCR provider (shown in a collapsible panel). */
  rawText: string;
  /** Mean OCR word confidence 0-100, when the provider reports it. */
  ocrConfidence?: number;
  /** Decoded QR payload, if a QR code was found on the card. */
  qr?: {
    raw: string;
    format: "vcard" | "mecard" | "url" | "text";
    contact?: CardContact;
  };
  /** Which engines actually ran, for the UI timeline. */
  pipeline: {
    ocrProvider: string;
    parser: "heuristic" | "ai";
    qrDetected: boolean;
    durationMs: number;
  };
  warnings: string[];
}

/** Removes empty / whitespace-only values so downstream code can rely on `undefined`. */
export function compactContact(contact: CardContact): CardContact {
  const out: CardContact = {};
  for (const key of CARD_CONTACT_FIELDS) {
    const value = contact[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed;
    }
  }
  return out;
}

export function fullName(contact: CardContact): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
}
