/**
 * visitingCardParser - pure JavaScript service module (no LWC imports).
 *
 * Raw Text -> AI / Parsing Logic -> Structured CRM Data.
 * Used by scanVisitingCard to turn OCR text and QR payloads into the
 * VisitingCardData shape the Apex controller expects. Keeping it dependency
 * free means it is unit-tested with Node (see ocr-service/tests/lwc-parser.test.ts)
 * and can be replaced by a server-side AI parser without touching the UI.
 */

export const CARD_FIELDS = ['firstName', 'lastName', 'title', 'company', 'email', 'phone', 'mobile', 'website', 'country'];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)[A-Z0-9-]+(?:\.[A-Z0-9-]+)+(?:\/\S*)?|(?:https?:\/\/)[A-Z0-9-]+(?:\.[A-Z0-9-]+)+(?:\/\S*)?)\b/i;
const BARE_DOMAIN_RE = /^[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.(com|net|org|io|co|in|ai|biz|info|us|uk|de|ae|sa|tech|app|dev)(?:\.[a-z]{2})?$/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;

const TITLE_WORDS = [
    'chief', 'officer', 'ceo', 'cto', 'cfo', 'coo', 'cro', 'cmo', 'cio', 'vp', 'svp', 'evp', 'president', 'vice', 'director', 'manager', 'head',
    'lead', 'founder', 'co-founder', 'partner', 'owner', 'engineer', 'developer', 'architect', 'consultant', 'analyst', 'specialist', 'executive',
    'associate', 'coordinator', 'representative', 'sales', 'marketing', 'revenue', 'operations', 'product', 'account', 'business', 'development',
    'designer', 'principal', 'senior', 'junior', 'advisor', 'strategist', 'chairman', 'managing', 'general', 'regional', 'national', 'global',
    'supervisor', 'administrator', 'procurement', 'purchasing', 'buyer', 'sourcing', 'import', 'export', 'exports', 'imports', 'category', 'merchandising'
];

const COMPANY_SUFFIXES = [
    'inc', 'inc.', 'ltd', 'ltd.', 'llc', 'llp', 'plc', 'pvt', 'pvt.', 'private', 'limited', 'corp', 'corp.', 'corporation', 'co', 'co.', 'company',
    'group', 'holdings', 'technologies', 'technology', 'tech', 'solutions', 'systems', 'software', 'services', 'labs', 'studio', 'studios', 'consulting',
    'industries', 'enterprises', 'international', 'global', 'partners', 'ventures', 'networks', 'digital', 'media', 'logistics', 'foods', 'food',
    'trading', 'traders', 'exports', 'imports', 'pharma', 'bank', 'gmbh', 's.a.', 'ag', 'bv', 'sdn', 'bhd', 'fzco', 'fze', 'fzc', 'llc.'
];

const ADDRESS_WORDS = [
    'street', 'st.', 'road', 'rd', 'rd.', 'avenue', 'ave', 'ave.', 'lane', 'ln', 'boulevard', 'blvd', 'drive', 'dr.', 'floor', 'fl.', 'suite', 'ste',
    'building', 'bldg', 'block', 'tower', 'plaza', 'park', 'nagar', 'colony', 'sector', 'phase', 'layout', 'complex', 'mall', 'square', 'p.o.', 'po box',
    'pin', 'pincode', 'zip', 'office', 'unit', 'level', 'estate', 'highway', 'cross', 'main', 'junction', 'near', 'opp', 'opp.', 'behind', 'campus',
    'apartment', 'apt', 'warehouse', 'industrial', 'zone', 'free zone'
];

const COUNTRIES = {
    india: 'India', 'united states': 'United States', usa: 'USA', 'u.s.a.': 'USA', 'united kingdom': 'United Kingdom', uk: 'UK', 'u.k.': 'UK',
    canada: 'Canada', australia: 'Australia', germany: 'Germany', france: 'France', singapore: 'Singapore', 'united arab emirates': 'United Arab Emirates',
    uae: 'UAE', 'u.a.e.': 'UAE', dubai: 'UAE', 'saudi arabia': 'Saudi Arabia', ksa: 'Saudi Arabia', qatar: 'Qatar', oman: 'Oman', kuwait: 'Kuwait',
    bahrain: 'Bahrain', japan: 'Japan', china: 'China', netherlands: 'Netherlands', ireland: 'Ireland', spain: 'Spain', italy: 'Italy',
    switzerland: 'Switzerland', sweden: 'Sweden', malaysia: 'Malaysia', indonesia: 'Indonesia', philippines: 'Philippines', thailand: 'Thailand',
    vietnam: 'Vietnam', 'new zealand': 'New Zealand', 'south africa': 'South Africa', brazil: 'Brazil', mexico: 'Mexico', 'sri lanka': 'Sri Lanka',
    bangladesh: 'Bangladesh', nepal: 'Nepal', pakistan: 'Pakistan', egypt: 'Egypt', turkey: 'Turkey', kenya: 'Kenya', nigeria: 'Nigeria'
};

const NAME_STOPWORDS = new Set(['phone', 'mobile', 'email', 'e-mail', 'web', 'website', 'tel', 'fax', 'cell', 'office', 'address', 'contact', 'www', 'http', 'https', 'the', 'and', 'of', 'for', 'call', 'visit']);

const MOBILE_LABEL_RE = /\b(m|mob|mobile|cell|c|hp|h\/p|whatsapp)\b\s*[:.-]?/i;
const PHONE_LABEL_RE = /\b(t|tel|tele|telephone|ph|phone|office|o|landline|l|desk|d)\b\s*[:.-]?/i;
const FAX_LABEL_RE = /\b(f|fax)\b\s*[:.-]?/i;

function words(line) {
    return line.split(/\s+/).filter(Boolean);
}
function normalise(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function titleCase(value) {
    return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function looksLikeTitle(line) {
    const ws = words(line.toLowerCase()).map((w) => w.replace(/[^a-z-]/g, ''));
    if (ws.length === 0 || ws.length > 7) return false;
    if (/[@\d]/.test(line)) return false;
    return ws.some((w) => TITLE_WORDS.includes(w));
}
function looksLikeCompany(line) {
    const ws = words(line.toLowerCase()).map((w) => w.replace(/,/g, ''));
    return ws.some((w) => COMPANY_SUFFIXES.includes(w)) && !/@/.test(line);
}
function looksLikeAddress(line) {
    const lw = line.toLowerCase();
    const hasAddressWord = ADDRESS_WORDS.some((w) => new RegExp(`(^|[^a-z])${escapeRe(w)}([^a-z]|$)`).test(lw));
    const hasNumberAndComma = /\d/.test(line) && /,/.test(line);
    const hasPostal = /\b\d{5,6}\b/.test(line) && !/\d{7,}/.test(line);
    return hasAddressWord || hasNumberAndComma || hasPostal;
}
function findCountry(line) {
    const lw = line.toLowerCase();
    for (const key of Object.keys(COUNTRIES)) {
        if (new RegExp(`(^|[^a-z])${escapeRe(key)}([^a-z]|$)`).test(lw)) return COUNTRIES[key];
    }
    return undefined;
}
function cleanPhone(raw) {
    return raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}
function isMobileNumber(digits) {
    const d = digits.replace(/\D/g, '');
    if (/^(91)?[6-9]\d{9}$/.test(d) || /^0[6-9]\d{9}$/.test(d)) return true; // India
    if (/^(44)?7\d{9}$/.test(d) || /^07\d{9}$/.test(d)) return true; // UK
    if (/^(971)?5\d{8}$/.test(d) || /^05\d{8}$/.test(d)) return true; // UAE
    if (/^(966)?5\d{8}$/.test(d) || /^05\d{8}$/.test(d)) return true; // KSA
    return false;
}
function looksLikeName(line) {
    if (/[@\d]/.test(line)) return false;
    const ws = words(line.replace(/[.,]/g, ''));
    if (ws.length < 2 || ws.length > 4) return false;
    if (ws.some((w) => NAME_STOPWORDS.has(w.toLowerCase()))) return false;
    if (looksLikeTitle(line) || looksLikeCompany(line) || looksLikeAddress(line)) return false;
    return ws.every((w) => /^[A-Z][A-Za-z'’-]*$/.test(w) || /^[A-Z]\.?$/.test(w));
}

/** "Dr. Anna Maria Rossi" -> { firstName: "Anna", lastName: "Maria Rossi" } */
export function splitName(name) {
    const honorifics = /^(mr|mrs|ms|miss|dr|prof|er|adv|sri|shri|smt|eng)\.?$/i;
    const suffixes = /^(jr|sr|ii|iii|iv|phd|mba|cpa|esq)\.?$/i;
    const parts = words((name || '').replace(/,/g, ' ')).filter((w) => !honorifics.test(w)).filter((w) => !suffixes.test(w));
    if (parts.length === 0) return {};
    if (parts.length === 1) return { firstName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Removes empty values so callers can rely on `undefined`. */
export function compact(contact) {
    const out = {};
    Object.keys(contact || {}).forEach((k) => {
        const v = contact[k];
        if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    });
    return out;
}

/**
 * Rule-based parser: raw OCR text -> structured fields.
 * Returns { contact, unclassified } where contact uses the VisitingCardData keys.
 */
export function parseCardText(rawText) {
    const lines = (rawText || '')
        .split(/\r?\n/)
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter((l) => l.length > 1);

    const contact = {};
    const consumed = new Set();
    const phones = [];

    // Pass 1: email, website, phone numbers.
    lines.forEach((line, i) => {
        let remainder = line;
        const email = line.match(EMAIL_RE);
        if (email && !contact.email) {
            contact.email = email[0].toLowerCase();
            remainder = remainder.replace(email[0], ' ');
            consumed.add(i);
        }
        const url = remainder.match(URL_RE);
        if (url && !contact.website) {
            contact.website = url[0].replace(/[.,]$/, '');
            remainder = remainder.replace(url[0], ' ');
            consumed.add(i);
        } else if (!contact.website && BARE_DOMAIN_RE.test(remainder.trim()) && !EMAIL_RE.test(remainder)) {
            contact.website = remainder.trim();
            consumed.add(i);
            remainder = '';
        }
        const matches = remainder.match(PHONE_RE) || [];
        for (const m of matches) {
            const digits = m.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) continue;
            const before = remainder.slice(0, remainder.indexOf(m)).slice(-14);
            let kind = 'phone';
            if (FAX_LABEL_RE.test(before)) kind = 'fax';
            else if (MOBILE_LABEL_RE.test(before)) kind = 'mobile';
            else if (PHONE_LABEL_RE.test(before)) kind = 'phone';
            else if (isMobileNumber(digits)) kind = 'mobile';
            phones.push({ number: cleanPhone(m), kind });
            remainder = remainder.replace(m, ' ');
            consumed.add(i);
        }
    });
    for (const p of phones) {
        if (p.kind === 'mobile' && !contact.mobile) contact.mobile = p.number;
        else if (p.kind === 'phone' && !contact.phone) contact.phone = p.number;
    }
    for (const p of phones) {
        if (p.kind === 'fax') continue;
        if (!contact.mobile && p.number !== contact.phone) { contact.mobile = p.number; continue; }
        if (!contact.phone && p.number !== contact.mobile) contact.phone = p.number;
    }

    const remaining = lines.map((line, i) => ({ line, i })).filter(({ i }) => !consumed.has(i));

    // Pass 2: title, company, geography.
    for (const { line, i } of remaining) {
        if (!contact.title && looksLikeTitle(line)) {
            contact.title = line.replace(/[|,;]+$/, '').trim();
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
    for (const { line, i } of remaining) {
        if (consumed.has(i)) continue;
        const country = findCountry(line);
        if (country || looksLikeAddress(line)) {
            if (country && !contact.country) contact.country = country;
            consumed.add(i);
        }
    }

    // Pass 3: company from the email / website domain matched against a remaining line.
    const domain = contact.email ? contact.email.split('@')[1].split('.')[0]
        : contact.website ? contact.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('.')[0] : undefined;
    if (!contact.company && domain) {
        const nd = normalise(domain);
        let best;
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

    // Pass 4: the person's name.
    const localPart = contact.email ? contact.email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '') : '';
    let nameLine;
    let bestScore = -1;
    for (const { line, i } of remaining) {
        if (consumed.has(i) || !looksLikeName(line)) continue;
        let score = 1;
        if (localPart) {
            const ws = words(line.toLowerCase().replace(/[^a-z\s]/g, ''));
            if (ws.some((w) => w.length >= 3 && (localPart.startsWith(w) || localPart.includes(w)))) score += 2;
        }
        score += Math.max(0, 1 - i / lines.length);
        if (score > bestScore) { bestScore = score; nameLine = { line, i }; }
    }
    if (nameLine) {
        Object.assign(contact, splitName(nameLine.line));
        consumed.add(nameLine.i);
    }

    // Pass 5: fall back to a short capitalised line, then to the domain itself.
    if (!contact.company) {
        for (const { line, i } of remaining) {
            if (consumed.has(i)) continue;
            if (words(line).length <= 3 && /^[A-Z]/.test(line) && !/[@\d]/.test(line) && !looksLikeTitle(line)) {
                contact.company = line.trim();
                consumed.add(i);
                break;
            }
        }
    }
    if (!contact.company && domain) contact.company = titleCase(domain);

    const unclassified = lines.filter((_, i) => !consumed.has(i));
    return { contact: compact(contact), unclassified };
}

function unescapeVCard(value) {
    return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');
}

/** vCard 2.1 / 3.0 / 4.0 text -> contact fields. */
export function parseVCard(text) {
    const unfolded = text.replace(/\r?\n[ \t]/g, '');
    const contact = {};
    let formattedName;
    for (const rawLine of unfolded.split(/\r?\n/)) {
        const line = rawLine.trim();
        const idx = line.indexOf(':');
        if (idx < 0) continue;
        const head = line.slice(0, idx);
        const value = unescapeVCard(line.slice(idx + 1).trim());
        const [nameWithGroup, ...params] = head.split(';');
        const name = (nameWithGroup.includes('.') ? nameWithGroup.split('.').pop() : nameWithGroup).toUpperCase();
        const paramText = params.join(';').toUpperCase();
        switch (name) {
            case 'N': {
                const [last, first] = value.split(';');
                if (last) contact.lastName = last.trim();
                if (first) contact.firstName = first.trim();
                break;
            }
            case 'FN': formattedName = value; break;
            case 'ORG': contact.company = value.split(';')[0].trim(); break;
            case 'TITLE': contact.title = value; break;
            case 'EMAIL': if (!contact.email) contact.email = value.toLowerCase(); break;
            case 'TEL': {
                const isCell = /CELL|MOBILE/.test(paramText);
                const number = value.replace(/^tel:/i, '');
                if (isCell && !contact.mobile) contact.mobile = number;
                else if (!isCell && !contact.phone) contact.phone = number;
                else if (!contact.mobile) contact.mobile = number;
                else if (!contact.phone) contact.phone = number;
                break;
            }
            case 'URL': if (!contact.website) contact.website = value; break;
            case 'ADR': {
                const parts = value.split(';');
                if (parts[6]) contact.country = parts[6].trim();
                break;
            }
            default: break;
        }
    }
    if (!contact.firstName && !contact.lastName && formattedName) Object.assign(contact, splitName(formattedName));
    return compact(contact);
}

/** MECARD:N:Last,First;ORG:...;TEL:...;EMAIL:...;URL:...;; */
export function parseMeCard(text) {
    const body = text.replace(/^MECARD:/i, '').replace(/;;\s*$/, '');
    const contact = {};
    const fields = body.split(/(?<!\\);/).map((f) => f.replace(/\;/g, ';'));
    for (const field of fields) {
        const idx = field.indexOf(':');
        if (idx < 0) continue;
        const key = field.slice(0, idx).toUpperCase();
        const value = field.slice(idx + 1).trim();
        if (!value) continue;
        switch (key) {
            case 'N': {
                const [last, first] = value.split(',');
                if (last) contact.lastName = last.trim();
                if (first) contact.firstName = first.trim();
                break;
            }
            case 'ORG': contact.company = value; break;
            case 'TITLE': contact.title = value; break;
            case 'TEL': if (!contact.mobile) contact.mobile = value; else if (!contact.phone) contact.phone = value; break;
            case 'EMAIL': contact.email = value.toLowerCase(); break;
            case 'URL': contact.website = value; break;
            case 'ADR': { const parts = value.split(','); if (parts[3]) contact.country = parts[3].trim(); break; }
            default: break;
        }
    }
    return compact(contact);
}

/** Interprets a decoded QR payload. Returns { format, contact }. */
export function parseQrPayload(raw) {
    const text = (raw || '').trim();
    if (/^BEGIN:VCARD/i.test(text)) return { format: 'vcard', contact: parseVCard(text) };
    if (/^MECARD:/i.test(text)) return { format: 'mecard', contact: parseMeCard(text) };
    if (/^(https?:\/\/|www\.)/i.test(text)) return { format: 'url', contact: { website: text } };
    return { format: 'text', contact: {} };
}

function digits(v) {
    return (v || '').replace(/\D/g, '');
}

/**
 * Merges contact layers by priority (first layer wins per field) and records
 * where each value came from: [{ source: 'qr'|'ocr'|'service', contact }].
 */
export function mergeLayers(layers) {
    const contact = {};
    const sources = {};
    for (const layer of layers) {
        const clean = compact(layer.contact);
        for (const field of CARD_FIELDS) {
            if (contact[field] === undefined && clean[field] !== undefined) {
                contact[field] = clean[field];
                sources[field] = layer.source;
            }
        }
    }
    if (contact.mobile && contact.phone && digits(contact.mobile).slice(-10) === digits(contact.phone).slice(-10)) {
        delete contact.phone;
        delete sources.phone;
    }
    return { contact, sources };
}

/** Extracted | Partially Extracted | Failed - the audit value for Lead.Scan_Status__c. */
export function scanStatusFor(contact) {
    const c = compact(contact);
    const hasName = Boolean(c.firstName || c.lastName);
    const hasContact = Boolean(c.email || c.mobile || c.phone);
    if (hasName && c.company && hasContact) return 'Extracted';
    if (hasName || c.company || hasContact) return 'Partially Extracted';
    return 'Failed';
}
