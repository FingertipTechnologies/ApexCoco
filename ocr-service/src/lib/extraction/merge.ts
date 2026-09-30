import type { CardContact, CardContactField, FieldSources, FieldSource } from "../crm/types";
import { CARD_CONTACT_FIELDS, compactContact } from "../crm/types";

export interface Layer {
  source: FieldSource;
  contact: CardContact;
}

/**
 * Merges contact layers by priority (first layer wins per field) and records
 * where each final value came from. Typical order: QR (exact machine data),
 * then AI, then OCR heuristics.
 */
export function mergeContactLayers(layers: Layer[]): { contact: CardContact; sources: FieldSources } {
  const contact: CardContact = {};
  const sources: FieldSources = {};
  for (const layer of layers) {
    const clean = compactContact(layer.contact);
    for (const field of CARD_CONTACT_FIELDS) {
      if (contact[field] === undefined && clean[field] !== undefined) {
        contact[field] = clean[field];
        sources[field] = layer.source;
      }
    }
  }
  dedupePhones(contact, sources);
  return { contact, sources };
}

function dedupePhones(contact: CardContact, sources: FieldSources) {
  if (!contact.mobile || !contact.phone) return;
  // Compare on the trailing 10 digits so "+91 94950 72255" == "9495072255".
  const a = digits(contact.mobile).slice(-10);
  const b = digits(contact.phone).slice(-10);
  if (a && a === b) {
    delete contact.phone;
    delete sources.phone;
  }
}

export function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function fieldsPresent(contact: CardContact): CardContactField[] {
  return CARD_CONTACT_FIELDS.filter((f) => contact[f] !== undefined);
}
