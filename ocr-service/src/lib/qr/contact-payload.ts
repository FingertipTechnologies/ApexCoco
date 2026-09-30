import type { CardContact } from "../crm/types";
import { compactContact } from "../crm/types";

export type QrPayloadFormat = "vcard" | "mecard" | "url" | "text";

export interface ParsedQrPayload {
  format: QrPayloadFormat;
  contact?: CardContact;
}

/**
 * Interprets the text found in a QR code. Business cards usually embed a
 * vCard (BEGIN:VCARD) or MeCard (MECARD:) payload; some only carry a URL.
 */
export function parseQrPayload(raw: string): ParsedQrPayload {
  const text = raw.trim();
  if (/^BEGIN:VCARD/i.test(text)) {
    return { format: "vcard", contact: parseVCard(text) };
  }
  if (/^MECARD:/i.test(text)) {
    return { format: "mecard", contact: parseMeCard(text) };
  }
  if (/^(https?:\/\/|www\.)/i.test(text)) {
    return { format: "url", contact: compactContact({ website: text }) };
  }
  return { format: "text" };
}

function unescapeVCard(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseVCard(text: string): CardContact {
  // Unfold continuation lines (RFC 6350: CRLF followed by a space/tab).
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const contact: CardContact = {};
  let formattedName: string | undefined;

  for (const rawLine of unfolded.split(/\r?\n/)) {
    const line = rawLine.trim();
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const head = line.slice(0, idx);
    const value = unescapeVCard(line.slice(idx + 1).trim());
    const [nameWithGroup, ...params] = head.split(";");
    const name = (nameWithGroup.includes(".") ? nameWithGroup.split(".").pop()! : nameWithGroup).toUpperCase();
    const paramText = params.join(";").toUpperCase();

    switch (name) {
      case "N": {
        const [last, first] = value.split(";");
        if (last) contact.lastName = last.trim();
        if (first) contact.firstName = first.trim();
        break;
      }
      case "FN":
        formattedName = value;
        break;
      case "ORG":
        contact.company = value.split(";")[0].trim();
        break;
      case "TITLE":
        contact.jobTitle = value;
        break;
      case "EMAIL":
        if (!contact.email) contact.email = value;
        break;
      case "TEL": {
        const isCell = /CELL|MOBILE/.test(paramText);
        const number = value.replace(/^tel:/i, "");
        if (isCell && !contact.mobile) contact.mobile = number;
        else if (!isCell && !contact.phone) contact.phone = number;
        else if (!contact.mobile) contact.mobile = number;
        else if (!contact.phone) contact.phone = number;
        break;
      }
      case "URL":
        if (!contact.website) contact.website = value;
        break;
      case "ADR": {
        // ADR: PO box; extended; street; locality; region; postal code; country
        const parts = value.split(";");
        const street = [parts[1], parts[2]].filter(Boolean).join(", ").trim();
        if (street) contact.address = street;
        if (parts[3]) contact.city = parts[3].trim();
        if (parts[4]) contact.state = parts[4].trim();
        if (parts[6]) contact.country = parts[6].trim();
        break;
      }
    }
  }

  if (!contact.firstName && !contact.lastName && formattedName) {
    const parts = formattedName.trim().split(/\s+/);
    contact.firstName = parts[0];
    if (parts.length > 1) contact.lastName = parts.slice(1).join(" ");
  }

  return compactContact(contact);
}

export function parseMeCard(text: string): CardContact {
  const body = text.replace(/^MECARD:/i, "").replace(/;;\s*$/, "");
  const contact: CardContact = {};
  // Fields are separated by ";" (values may escape ";" with "\;").
  const fields = body.split(/(?<!\\);/).map((f) => f.replace(/\;/g, ";"));
  for (const field of fields) {
    const idx = field.indexOf(":");
    if (idx < 0) continue;
    const key = field.slice(0, idx).toUpperCase();
    const value = field.slice(idx + 1).trim();
    if (!value) continue;
    switch (key) {
      case "N": {
        const [last, first] = value.split(",");
        if (last) contact.lastName = last.trim();
        if (first) contact.firstName = first.trim();
        break;
      }
      case "ORG":
        contact.company = value;
        break;
      case "TITLE":
        contact.jobTitle = value;
        break;
      case "TEL":
        if (!contact.mobile) contact.mobile = value;
        else if (!contact.phone) contact.phone = value;
        break;
      case "EMAIL":
        contact.email = value;
        break;
      case "URL":
        contact.website = value;
        break;
      case "ADR": {
        const parts = value.split(",");
        contact.address = parts[0]?.trim();
        if (parts[1]) contact.city = parts[1].trim();
        if (parts[2]) contact.state = parts[2].trim();
        if (parts[3]) contact.country = parts[3].trim();
        break;
      }
    }
  }
  return compactContact(contact);
}
