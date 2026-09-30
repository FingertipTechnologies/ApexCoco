import type { CardContact } from "../crm/types";
import { compactContact } from "../crm/types";

/**
 * Deterministic, rule-based parser that turns raw OCR text from a visiting
 * card into structured CRM fields. It is the default parsing engine and also
 * the fallback when the AI parser is not configured or fails.
 *
 * Strategy: classify each line by strong signals first (email, URL, phone),
 * then by vocabulary (job titles, address words, geography), then infer the
 * company from the email domain, and finally pick the person's name from the
 * remaining "clean" lines near the top of the card.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)[A-Z0-9-]+(?:\.[A-Z0-9-]+)+(?:\/\S*)?|(?:https?:\/\/)[A-Z0-9-]+(?:\.[A-Z0-9-]+)+(?:\/\S*)?)\b/i;
const BARE_DOMAIN_RE = /^[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.(com|net|org|io|co|in|ai|biz|info|us|uk|de|tech|app|dev)(?:\.[a-z]{2})?$/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;

const TITLE_WORDS = [
  "chief", "officer", "ceo", "cto", "cfo", "coo", "cro", "cmo", "cio", "vp", "svp", "evp",
  "president", "vice", "director", "manager", "head", "lead", "founder", "co-founder",
  "partner", "owner", "engineer", "developer", "architect", "consultant", "analyst",
  "specialist", "executive", "associate", "coordinator", "representative", "sales",
  "marketing", "revenue", "operations", "product", "account", "business", "development",
  "designer", "principal", "senior", "junior", "advisor", "strategist", "chairman",
  "managing", "general", "regional", "national", "global", "supervisor", "administrator",
];

const COMPANY_SUFFIXES = [
  "inc", "inc.", "ltd", "ltd.", "llc", "llp", "plc", "pvt", "pvt.", "private", "limited",
  "corp", "corp.", "corporation", "co", "co.", "company", "group", "holdings", "technologies",
  "technology", "tech", "solutions", "systems", "software", "services", "labs", "studio",
  "studios", "consulting", "industries", "enterprises", "international", "global", "partners",
  "ventures", "networks", "digital", "media", "logistics", "foods", "pharma", "bank", "gmbh",
  "s.a.", "ag", "bv", "sdn", "bhd",
];

const ADDRESS_WORDS = [
  "street", "st.", "road", "rd", "rd.", "avenue", "ave", "ave.", "lane", "ln", "boulevard",
  "blvd", "drive", "dr.", "floor", "fl.", "suite", "ste", "building", "bldg", "block", "tower",
  "plaza", "park", "nagar", "colony", "sector", "phase", "layout", "complex", "mall", "square",
  "p.o.", "po box", "pin", "pincode", "zip", "office", "unit", "level", "estate", "highway",
  "cross", "main", "junction", "near", "opp", "opp.", "behind", "campus", "apartment", "apt",
];

const COUNTRIES = [
  "india", "united states", "usa", "u.s.a.", "united kingdom", "uk", "u.k.", "canada",
  "australia", "germany", "france", "singapore", "united arab emirates", "uae", "u.a.e.",
  "saudi arabia", "qatar", "oman", "kuwait", "bahrain", "japan", "china", "netherlands",
  "ireland", "spain", "italy", "switzerland", "sweden", "malaysia", "indonesia", "philippines",
  "thailand", "vietnam", "new zealand", "south africa", "brazil", "mexico", "sri lanka",
  "bangladesh", "nepal", "pakistan",
];

const STATES = [
  // India
  "kerala", "karnataka", "tamil nadu", "telangana", "andhra pradesh", "maharashtra", "gujarat",
  "delhi", "new delhi", "punjab", "haryana", "rajasthan", "uttar pradesh", "madhya pradesh",
  "west bengal", "bihar", "odisha", "goa", "assam", "jharkhand", "chhattisgarh", "uttarakhand",
  "himachal pradesh", "jammu", "kashmir",
  // US (full names only, abbreviations are handled separately)
  "california", "texas", "new york", "florida", "washington", "illinois", "massachusetts",
  "new jersey", "georgia", "virginia", "colorado", "arizona", "oregon", "north carolina",
  "pennsylvania", "ohio", "michigan", "minnesota", "nevada", "utah",
];

const US_STATE_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const NAME_STOPWORDS = new Set([
  "phone", "mobile", "email", "e-mail", "web", "website", "tel", "fax", "cell", "office",
  "address", "contact", "www", "http", "https", "the", "and", "of", "for", "call", "visit",
]);

const MOBILE_LABEL_RE = /\b(m|mob|mobile|cell|c|hp|h\/p)\b\s*[:.-]?/i;
const PHONE_LABEL_RE = /\b(t|tel|tele|telephone|ph|phone|office|o|landline|l|desk|d)\b\s*[:.-]?/i;
const FAX_LABEL_RE = /\b(f|fax)\b\s*[:.-]?/i;

export interface HeuristicParseResult {
  contact: CardContact;
  /** Lines the parser could not classify (useful for debugging). */
  unclassified: string[];
}

function words(line: string): string[] {
  return line.split(/\s+/).filter(Boolean);
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikeTitle(line: string): boolean {
  const lw = line.toLowerCase();
  const ws = words(lw).map((w) => w.replace(/[^a-z-]/g, ""));
  if (ws.length === 0 || ws.length > 7) return false;
  const hits = ws.filter((w) => TITLE_WORDS.includes(w)).length;
  if (hits === 0) return false;
  // Short all-caps acronyms like "CEO" count as titles on their own.
  return hits >= 1 && !/[@\d]/.test(line);
}

function looksLikeCompany(line: string): boolean {
  const ws = words(line.toLowerCase()).map((w) => w.replace(/[,]/g, ""));
  return ws.some((w) => COMPANY_SUFFIXES.includes(w)) && !/[@]/.test(line);
}

function looksLikeAddress(line: string): boolean {
  const lw = line.toLowerCase();
  const hasAddressWord = ADDRESS_WORDS.some((w) => new RegExp(`(^|[^a-z])${w.replace(/\./g, "\\.")}([^a-z]|$)`).test(lw));
  const hasNumberAndComma = /\d/.test(line) && /,/.test(line);
  const hasPostal = /\b\d{5,6}\b/.test(line) && !/\d{7,}/.test(line);
  return hasAddressWord || hasNumberAndComma || hasPostal;
}

function findCountry(line: string): string | undefined {
  const lw = line.toLowerCase();
  for (const c of COUNTRIES) {
    if (new RegExp(`(^|[^a-z])${c.replace(/\./g, "\\.")}([^a-z]|$)`).test(lw)) {
      return c === "usa" || c === "u.s.a." ? "United States" : c === "uk" || c === "u.k." ? "United Kingdom" : c === "uae" || c === "u.a.e." ? "United Arab Emirates" : titleCase(c);
    }
  }
  return undefined;
}

function findState(line: string): string | undefined {
  const lw = line.toLowerCase();
  for (const s of STATES) {
    if (new RegExp(`(^|[^a-z])${s}([^a-z]|$)`).test(lw)) return titleCase(s);
  }
  const abbr = line.match(/\b([A-Z]{2})\b(?=\s*[\d,]|$)/);
  if (abbr && US_STATE_ABBR.has(abbr[1])) return abbr[1];
  return undefined;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanPhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function isMobileNumber(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  // Indian mobile numbers: 10 digits starting 6-9 (optionally +91 / 0 prefix).
  if (/^(91)?[6-9]\d{9}$/.test(d) || /^0[6-9]\d{9}$/.test(d)) return true;
  // UK mobiles start 07 / +447.
  if (/^(44)?7\d{9}$/.test(d) || /^07\d{9}$/.test(d)) return true;
  // UAE mobiles 05x / +9715x.
  if (/^(971)?5\d{8}$/.test(d) || /^05\d{8}$/.test(d)) return true;
  return false;
}

function looksLikeName(line: string): boolean {
  if (/[@\d]/.test(line)) return false;
  const ws = words(line.replace(/[.,]/g, ""));
  if (ws.length < 2 || ws.length > 4) return false;
  if (ws.some((w) => NAME_STOPWORDS.has(w.toLowerCase()))) return false;
  if (looksLikeTitle(line) || looksLikeCompany(line) || looksLikeAddress(line)) return false;
  // Every word alphabetic (allow apostrophes / hyphens) and starts with a capital.
  return ws.every((w) => /^[A-Z][A-Za-z'’-]*$/.test(w) || /^[A-Z]\.?$/.test(w));
}

/** Split "Ameen Azeez" -> { firstName, lastName }; handles honorifics and initials. */
export function splitName(name: string): { firstName?: string; lastName?: string } {
  const honorifics = /^(mr|mrs|ms|miss|dr|prof|er|adv|sri|shri|smt)\.?$/i;
  const suffixes = /^(jr|sr|ii|iii|iv|phd|mba|cpa|esq)\.?$/i;
  const parts = words(name.replace(/,/g, " "))
    .filter((w) => !honorifics.test(w))
    .filter((w) => !suffixes.test(w));
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseCardText(rawText: string): HeuristicParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1);

  const contact: CardContact = {};
  const unclassified: string[] = [];
  const consumed = new Set<number>();
  const phones: { number: string; kind: "mobile" | "phone" | "fax" }[] = [];

  // Pass 1: strong regex signals - email, website, phone numbers.
  lines.forEach((line, i) => {
    let remainder = line;
    const email = line.match(EMAIL_RE);
    if (email && !contact.email) {
      contact.email = email[0].toLowerCase();
      remainder = remainder.replace(email[0], " ");
      consumed.add(i);
    }
    const url = remainder.match(URL_RE);
    if (url && !contact.website) {
      contact.website = url[0].replace(/[.,]$/, "");
      remainder = remainder.replace(url[0], " ");
      consumed.add(i);
    } else if (!contact.website && BARE_DOMAIN_RE.test(remainder.trim()) && !EMAIL_RE.test(remainder)) {
      contact.website = remainder.trim();
      consumed.add(i);
      remainder = "";
    }

    const phoneMatches = remainder.match(PHONE_RE) ?? [];
    for (const m of phoneMatches) {
      const digits = m.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) continue;
      const before = remainder.slice(0, remainder.indexOf(m)).slice(-14);
      const kind: "mobile" | "phone" | "fax" = FAX_LABEL_RE.test(before)
        ? "fax"
        : MOBILE_LABEL_RE.test(before)
          ? "mobile"
          : PHONE_LABEL_RE.test(before)
            ? "phone"
            : isMobileNumber(digits)
              ? "mobile"
              : "phone";
      phones.push({ number: cleanPhone(m), kind });
      remainder = remainder.replace(m, " ");
      consumed.add(i);
    }
  });

  for (const p of phones) {
    if (p.kind === "mobile" && !contact.mobile) contact.mobile = p.number;
    else if (p.kind === "phone" && !contact.phone) contact.phone = p.number;
  }
  // If only one number was found and it was classified as "phone" but no
  // mobile exists, keep it as phone; if only mobiles were found the second one
  // becomes the phone so nothing is lost.
  for (const p of phones) {
    if (p.kind === "fax") continue;
    if (!contact.mobile && p.number !== contact.phone) { contact.mobile = p.number; continue; }
    if (!contact.phone && p.number !== contact.mobile) { contact.phone = p.number; }
  }

  // Pass 2: vocabulary signals - title, company, address, geography.
  const remaining = lines.map((line, i) => ({ line, i })).filter(({ i }) => !consumed.has(i));

  for (const { line, i } of remaining) {
    if (!contact.jobTitle && looksLikeTitle(line)) {
      contact.jobTitle = line.replace(/[|,;]+$/, "").trim();
      consumed.add(i);
    }
  }
  for (const { line, i } of remaining) {
    if (consumed.has(i)) continue;
    if (!contact.company && looksLikeCompany(line)) {
      contact.company = line.trim();
      consumed.add(i);
    }
  }

  const addressLines: string[] = [];
  for (const { line, i } of remaining) {
    if (consumed.has(i)) continue;
    const country = findCountry(line);
    const state = findState(line);
    if (looksLikeAddress(line) || country || state) {
      if (country && !contact.country) contact.country = country;
      if (state && !contact.state) contact.state = state;
      // City: a capitalised word before the state/postal code on a geo line.
      const cityMatch = line.match(/([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+)?)\s*,?\s*(?:[A-Z][a-z]+\s)?(?:\b\d{5,6}\b|$)/);
      if ((country || state) && cityMatch && !contact.city) {
        const candidate = cityMatch[1].trim();
        if (candidate.toLowerCase() !== (state ?? "").toLowerCase() && candidate.toLowerCase() !== (country ?? "").toLowerCase() && !ADDRESS_WORDS.includes(candidate.toLowerCase())) {
          contact.city = candidate;
        }
      }
      if (looksLikeAddress(line) || !(country || state) || (line.length > (country ?? state ?? "").length + 4)) {
        addressLines.push(line);
      }
      consumed.add(i);
    }
  }
  if (addressLines.length) {
    contact.address = addressLines.join(", ").replace(/\s*,\s*,/g, ",");
  }

  // Pass 3: company from email domain, matched against a remaining line.
  const domain = contact.email?.split("@")[1]?.split(".")[0] ?? (contact.website ? contact.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].split(".")[0] : undefined);
  if (!contact.company && domain) {
    const nd = normalise(domain);
    let best: { line: string; i: number; score: number } | undefined;
    for (const { line, i } of remaining) {
      if (consumed.has(i)) continue;
      const nl = normalise(line);
      if (!nl || nl.length < 3) continue;
      let score = 0;
      if (nl === nd) score = 3;
      else if (nd.startsWith(nl) || nl.startsWith(nd)) score = 2;
      else if (nd.includes(nl) || nl.includes(nd)) score = 1;
      if (score > 0 && (!best || score > best.score)) best = { line, i, score };
    }
    if (best) {
      contact.company = best.line.trim();
      consumed.add(best.i);
    }
  }

  // Pass 4: person's name from the remaining clean lines (prefer the top of the card,
  // and prefer a line whose first word matches the email local part).
  const localPart = contact.email?.split("@")[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  let nameLine: { line: string; i: number } | undefined;
  let bestScore = -1;
  for (const { line, i } of remaining) {
    if (consumed.has(i)) continue;
    if (!looksLikeName(line)) continue;
    let score = 1;
    if (localPart) {
      const ws = words(line.toLowerCase().replace(/[^a-z\s]/g, ""));
      if (ws.some((w) => w.length >= 3 && (localPart.startsWith(w) || localPart.includes(w)))) score += 2;
    }
    score += Math.max(0, 1 - i / lines.length); // earlier lines score slightly higher
    if (score > bestScore) { bestScore = score; nameLine = { line, i }; }
  }
  if (nameLine) {
    Object.assign(contact, splitName(nameLine.line));
    consumed.add(nameLine.i);
  }

  // Pass 5: with no explicit company line, use a single-word capitalised line that isn't the name.
  if (!contact.company) {
    for (const { line, i } of remaining) {
      if (consumed.has(i)) continue;
      const ws = words(line);
      if (ws.length <= 3 && /^[A-Z]/.test(line) && !/[@\d]/.test(line) && !looksLikeTitle(line)) {
        contact.company = line.trim();
        consumed.add(i);
        break;
      }
    }
  }
  // Last resort: derive company from the email domain ("fingertipplus" -> "Fingertipplus").
  if (!contact.company && domain) {
    contact.company = titleCase(domain);
  }

  lines.forEach((line, i) => { if (!consumed.has(i)) unclassified.push(line); });

  return { contact: compactContact(contact), unclassified };
}
