import { Connection } from "jsforce";
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

/**
 * Real Salesforce org adapter using jsforce (username + password + security
 * token). Select it with SALESFORCE_PROVIDER=jsforce. Queries use SOQL with
 * the same matching criteria as the mock client.
 */
export class JsforceSalesforceClient implements SalesforceClient {
  readonly name = "jsforce";
  private connPromise: Promise<Connection> | null = null;

  private conn(): Promise<Connection> {
    if (!this.connPromise) {
      const loginUrl = process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com";
      const username = process.env.SALESFORCE_USERNAME;
      const password = process.env.SALESFORCE_PASSWORD;
      const token = process.env.SALESFORCE_SECURITY_TOKEN ?? "";
      if (!username || !password) {
        throw new Error("SALESFORCE_USERNAME and SALESFORCE_PASSWORD are required for the jsforce provider");
      }
      const conn = new Connection({ loginUrl });
      this.connPromise = conn.login(username, password + token).then(() => conn);
    }
    return this.connPromise;
  }

  async findLeads(c: DuplicateSearchCriteria): Promise<SalesforceLead[]> {
    const clauses = [
      c.email && `Email = ${q(c.email)}`,
      ...c.phones.map((p) => `(Phone LIKE ${q("%" + p)} OR MobilePhone LIKE ${q("%" + p)})`),
      c.firstName && c.lastName && `(FirstName = ${q(c.firstName)} AND LastName = ${q(c.lastName)})`,
      c.company && `Company = ${q(c.company)}`,
      c.domain && `(Email LIKE ${q("%@" + c.domain)} OR Website LIKE ${q("%" + c.domain + "%")})`,
    ].filter(Boolean);
    if (!clauses.length) return [];
    const soql = `SELECT Id, FirstName, LastName, Title, Company, Email, Phone, MobilePhone, Website, Street, City, State, Country, Status, LeadSource, CreatedDate FROM Lead WHERE IsConverted = false AND (${clauses.join(" OR ")}) LIMIT 10`;
    const conn = await this.conn();
    const res = await conn.query<SalesforceLead>(soql);
    return res.records;
  }

  async findContacts(c: DuplicateSearchCriteria): Promise<SalesforceContact[]> {
    const clauses = [
      c.email && `Email = ${q(c.email)}`,
      ...c.phones.map((p) => `(Phone LIKE ${q("%" + p)} OR MobilePhone LIKE ${q("%" + p)})`),
      c.firstName && c.lastName && `(FirstName = ${q(c.firstName)} AND LastName = ${q(c.lastName)})`,
      c.domain && `Email LIKE ${q("%@" + c.domain)}`,
    ].filter(Boolean);
    if (!clauses.length) return [];
    const soql = `SELECT Id, FirstName, LastName, Title, Email, Phone, MobilePhone, AccountId, Account.Name, MailingStreet, MailingCity, MailingState, MailingCountry FROM Contact WHERE ${clauses.join(" OR ")} LIMIT 10`;
    const conn = await this.conn();
    const res = await conn.query<SalesforceContact>(soql);
    return res.records;
  }

  async findAccounts(c: DuplicateSearchCriteria): Promise<SalesforceAccount[]> {
    const clauses = [
      c.company && `Name = ${q(c.company)}`,
      c.domain && `Website LIKE ${q("%" + c.domain + "%")}`,
      ...c.phones.map((p) => `Phone LIKE ${q("%" + p)}`),
    ].filter(Boolean);
    if (!clauses.length) return [];
    const soql = `SELECT Id, Name, Website, Phone, Industry, Type, BillingStreet, BillingCity, BillingState, BillingCountry, NumberOfEmployees FROM Account WHERE ${clauses.join(" OR ")} LIMIT 10`;
    const conn = await this.conn();
    const res = await conn.query<SalesforceAccount>(soql);
    return res.records;
  }

  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    const conn = await this.conn();
    const fields = leadFieldsFromContact(input);
    const result = await conn.sobject("Lead").create(fields as Record<string, unknown>);
    if (!result.success) {
      throw new Error(`Salesforce rejected the Lead: ${JSON.stringify(result.errors)}`);
    }
    return { id: result.id, url: this.recordUrl("Lead", result.id), record: { Id: result.id, ...fields } };
  }

  async updateRecord(input: UpdateRecordInput): Promise<{ id: string; url?: string }> {
    const conn = await this.conn();
    const payload: Record<string, unknown> = { Id: input.id };
    for (const [key, value] of Object.entries(input.fields)) {
      if (value !== undefined && value !== "") payload[key] = value;
    }
    const result = await conn.sobject(input.type).update(payload as { Id: string });
    if (!result.success) throw new Error(`Salesforce rejected the update: ${JSON.stringify(result.errors)}`);
    return { id: input.id, url: this.recordUrl(input.type, input.id) };
  }

  async getRecord(type: SalesforceObjectType, id: string): Promise<SalesforceRecord | null> {
    const conn = await this.conn();
    try {
      const record = await conn.sobject(type).retrieve(id);
      return { type, record } as SalesforceRecord;
    } catch {
      return null;
    }
  }

  recordUrl(type: SalesforceObjectType, id: string): string {
    const base = process.env.SALESFORCE_INSTANCE_URL ?? "";
    return `${base}/lightning/r/${type}/${id}/view`;
  }
}

/** SOQL string literal escaping. */
function q(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}
