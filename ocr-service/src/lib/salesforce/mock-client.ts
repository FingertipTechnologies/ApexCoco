import type {
  SalesforceClient,
  SalesforceLead,
  SalesforceContact,
  SalesforceAccount,
  DuplicateSearchCriteria,
  CreateLeadInput,
  CreateLeadResult,
  UpdateRecordInput,
  SalesforceObjectType,
  SalesforceRecord,
} from "./types";
import { leadFieldsFromContact } from "./types";
import { phoneKey, domainOf, normaliseCompany } from "./criteria";

/**
 * In-memory Salesforce used for the demo. Data lives on `globalThis` so it
 * survives Next.js hot reloads in development.
 *
 * By default it holds a handful of unrelated records, so a freshly scanned
 * card resolves to "New Prospect". Toggling `seedExistingCustomer(true)`
 * (via the demo controls, or SALESFORCE_MOCK_SEED_EXISTING=true) adds a
 * "Fingertip" Account + Contact so the "Potential Existing Customer Found"
 * path can be shown.
 */
interface MockStore {
  leads: SalesforceLead[];
  contacts: SalesforceContact[];
  accounts: SalesforceAccount[];
  existingSeeded: boolean;
  counter: number;
}

const EXISTING_ACCOUNT_ID = "001DEMO000FINGERTIP";
const EXISTING_CONTACT_ID = "003DEMO000AMEENAZEEZ";

declare global {
  var __apexcocoMockStore: MockStore | undefined;
}

function baseStore(): MockStore {
  return {
    counter: 1,
    existingSeeded: false,
    accounts: [
      { Id: "001DEMO000ACME00001", Name: "Acme Manufacturing", Website: "https://acme-mfg.example.com", Phone: "+1 415 555 0100", Industry: "Manufacturing", Type: "Customer - Direct", BillingCity: "San Jose", BillingState: "CA", BillingCountry: "United States" },
      { Id: "001DEMO000NORTH0001", Name: "Northwind Traders", Website: "https://northwind.example.com", Phone: "+44 20 7946 0000", Industry: "Retail", Type: "Prospect", BillingCity: "London", BillingCountry: "United Kingdom" },
      { Id: "001DEMO000KOCHI0001", Name: "Kochi Marine Exports Pvt Ltd", Website: "https://kochimarine.example.in", Phone: "+91 484 2668 100", Industry: "Food & Beverage", Type: "Customer - Channel", BillingCity: "Kochi", BillingState: "Kerala", BillingCountry: "India" },
    ],
    contacts: [
      { Id: "003DEMO000JANE00001", FirstName: "Jane", LastName: "Okafor", Title: "Procurement Manager", Email: "jane.okafor@acme-mfg.example.com", Phone: "+1 415 555 0101", AccountId: "001DEMO000ACME00001", Account: { Name: "Acme Manufacturing" }, MailingCity: "San Jose", MailingState: "CA", MailingCountry: "United States" },
      { Id: "003DEMO000RAVI00001", FirstName: "Ravi", LastName: "Menon", Title: "Director - Exports", Email: "ravi@kochimarine.example.in", MobilePhone: "+91 98470 11223", AccountId: "001DEMO000KOCHI0001", Account: { Name: "Kochi Marine Exports Pvt Ltd" }, MailingCity: "Kochi", MailingState: "Kerala", MailingCountry: "India" },
    ],
    leads: [
      { Id: "00QDEMO000ABCFOODS1", FirstName: "John", LastName: "Smith", Title: "Procurement Manager", Company: "ABC Foods International", Email: "john.smith@abcfoods.com", Phone: "+1 415 555 0100", Website: "abcfoods.com", Country: "USA", Status: "Open - Not Contacted", LeadSource: "Trade Show / Exhibition", CreatedDate: "2026-09-20T10:00:00.000Z" },
      { Id: "00QDEMO000PRIYA0001", FirstName: "Priya", LastName: "Nair", Title: "Founder", Company: "Bloom Organics", Email: "priya@bloomorganics.example.com", MobilePhone: "+91 98950 44556", Status: "Working - Contacted", LeadSource: "Web", City: "Bengaluru", State: "Karnataka", Country: "India", CreatedDate: "2026-09-12T09:30:00.000Z" },
    ],
  };
}

function store(): MockStore {
  if (!globalThis.__apexcocoMockStore) {
    globalThis.__apexcocoMockStore = baseStore();
    if ((process.env.SALESFORCE_MOCK_SEED_EXISTING ?? "false").toLowerCase() === "true") {
      seedExistingCustomer(true);
    }
  }
  return globalThis.__apexcocoMockStore;
}

/** Adds/removes the "Fingertip" account + "Ameen Azeez" contact used to demo the match path. */
export function seedExistingCustomer(enabled: boolean): void {
  const s = store();
  s.accounts = s.accounts.filter((a) => a.Id !== EXISTING_ACCOUNT_ID);
  s.contacts = s.contacts.filter((c) => c.Id !== EXISTING_CONTACT_ID);
  if (enabled) {
    s.accounts.unshift({
      Id: EXISTING_ACCOUNT_ID,
      Name: "Fingertip",
      Website: "https://www.fingertipplus.com",
      Phone: "+91 94950 72255",
      Industry: "Technology",
      Type: "Customer - Direct",
      BillingCity: "Kochi",
      BillingState: "Kerala",
      BillingCountry: "India",
      NumberOfEmployees: 120,
    });
    s.contacts.unshift({
      Id: EXISTING_CONTACT_ID,
      FirstName: "Ameen",
      LastName: "Azeez",
      Title: "Head of Sales",
      Email: "ameen@fingertipplus.com",
      MobilePhone: "9495072255",
      AccountId: EXISTING_ACCOUNT_ID,
      Account: { Name: "Fingertip" },
      MailingCity: "Kochi",
      MailingState: "Kerala",
      MailingCountry: "India",
    });
  }
  s.existingSeeded = enabled;
}

export function isExistingCustomerSeeded(): boolean {
  return store().existingSeeded;
}

export function resetMockStore(): void {
  globalThis.__apexcocoMockStore = baseStore();
}

function nextId(prefix: string): string {
  const s = store();
  const n = String(s.counter++).padStart(4, "0");
  return `${prefix}DEMO00NEW${n}`;
}

function eq(a?: string, b?: string): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export class MockSalesforceClient implements SalesforceClient {
  readonly name = "mock";

  async findLeads(c: DuplicateSearchCriteria): Promise<SalesforceLead[]> {
    await simulateLatency();
    return store().leads.filter((l) =>
      eq(l.Email, c.email) ||
      c.phones.some((p) => phoneKey(l.Phone) === p || phoneKey(l.MobilePhone) === p) ||
      (eq(l.FirstName, c.firstName) && eq(l.LastName, c.lastName)) ||
      (c.company && normaliseCompany(l.Company) === normaliseCompany(c.company)) ||
      (c.domain && (domainOf(l.Email) === c.domain || domainOf(l.Website) === c.domain)),
    );
  }

  async findContacts(c: DuplicateSearchCriteria): Promise<SalesforceContact[]> {
    await simulateLatency();
    return store().contacts.filter((r) =>
      eq(r.Email, c.email) ||
      c.phones.some((p) => phoneKey(r.Phone) === p || phoneKey(r.MobilePhone) === p) ||
      (eq(r.FirstName, c.firstName) && eq(r.LastName, c.lastName)) ||
      (c.domain && domainOf(r.Email) === c.domain),
    );
  }

  async findAccounts(c: DuplicateSearchCriteria): Promise<SalesforceAccount[]> {
    await simulateLatency();
    return store().accounts.filter((a) =>
      (c.company && normaliseCompany(a.Name) === normaliseCompany(c.company)) ||
      (c.domain && domainOf(a.Website) === c.domain) ||
      c.phones.some((p) => phoneKey(a.Phone) === p),
    );
  }

  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    await simulateLatency();
    const record: SalesforceLead = {
      Id: nextId("00Q"),
      ...leadFieldsFromContact(input),
      CreatedDate: new Date().toISOString(),
    };
    store().leads.unshift(record);
    return { id: record.Id, url: this.recordUrl("Lead", record.Id), record };
  }

  async updateRecord(input: UpdateRecordInput): Promise<{ id: string; url?: string }> {
    await simulateLatency();
    const s = store();
    const list: Array<{ Id: string }> = input.type === "Lead" ? s.leads : input.type === "Contact" ? s.contacts : s.accounts;
    const record = list.find((r) => r.Id === input.id);
    if (!record) throw new Error(`${input.type} ${input.id} not found`);
    for (const [key, value] of Object.entries(input.fields)) {
      if (value !== undefined && value !== "") (record as Record<string, unknown>)[key] = value;
    }
    return { id: input.id, url: this.recordUrl(input.type, input.id) };
  }

  async getRecord(type: SalesforceObjectType, id: string): Promise<SalesforceRecord | null> {
    const s = store();
    if (type === "Lead") { const r = s.leads.find((x) => x.Id === id); return r ? { type, record: r } : null; }
    if (type === "Contact") { const r = s.contacts.find((x) => x.Id === id); return r ? { type, record: r } : null; }
    const r = s.accounts.find((x) => x.Id === id);
    return r ? { type, record: r } : null;
  }

  recordUrl(type: SalesforceObjectType, id: string): string {
    return `/records/${type.toLowerCase()}/${id}`;
  }
}

function simulateLatency(): Promise<void> {
  const ms = 350 + Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
