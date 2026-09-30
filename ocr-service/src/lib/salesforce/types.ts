import type { CardContact } from "../crm/types";

/**
 * Salesforce record shapes used by the demo. Field names mirror the standard
 * Salesforce API names so the same objects flow through the mock client and
 * the real jsforce client unchanged.
 */
export interface SalesforceLead {
  Id: string;
  FirstName?: string;
  LastName: string;
  Title?: string;
  Company: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  Website?: string;
  Street?: string;
  City?: string;
  State?: string;
  Country?: string;
  Status?: string;
  LeadSource?: string;
  Description?: string;
  CreatedDate?: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Title?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  AccountId?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingCountry?: string;
  Account?: { Name?: string };
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Website?: string;
  Phone?: string;
  Industry?: string;
  Type?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingCountry?: string;
  NumberOfEmployees?: number;
}

export type SalesforceObjectType = "Lead" | "Contact" | "Account";

export type SalesforceRecord =
  | { type: "Lead"; record: SalesforceLead }
  | { type: "Contact"; record: SalesforceContact }
  | { type: "Account"; record: SalesforceAccount };

/** Fields the duplicate check searches on. */
export interface DuplicateSearchCriteria {
  email?: string;
  phones: string[]; // normalised digits
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  domain?: string; // from email or website
}

export interface CreateLeadInput extends CardContact {
  leadSource?: string;
  description?: string;
}

export interface CreateLeadResult {
  id: string;
  url?: string;
  record: SalesforceLead;
}

export interface UpdateRecordInput {
  type: SalesforceObjectType;
  id: string;
  fields: Record<string, string | undefined>;
}

/**
 * Backend-agnostic Salesforce client. `MockSalesforceClient` is used for the
 * demo; `JsforceSalesforceClient` talks to a real org.
 */
export interface SalesforceClient {
  readonly name: string;
  findLeads(criteria: DuplicateSearchCriteria): Promise<SalesforceLead[]>;
  findContacts(criteria: DuplicateSearchCriteria): Promise<SalesforceContact[]>;
  findAccounts(criteria: DuplicateSearchCriteria): Promise<SalesforceAccount[]>;
  createLead(input: CreateLeadInput): Promise<CreateLeadResult>;
  updateRecord(input: UpdateRecordInput): Promise<{ id: string; url?: string }>;
  getRecord(type: SalesforceObjectType, id: string): Promise<SalesforceRecord | null>;
  /** Record URL for "Open Existing Customer" (real org) or the in-app record page (mock). */
  recordUrl(type: SalesforceObjectType, id: string): string;
}

/** Turns confirmed card data into Salesforce Lead fields. */
export function leadFieldsFromContact(input: CreateLeadInput): Omit<SalesforceLead, "Id"> {
  return {
    FirstName: input.firstName,
    LastName: input.lastName || input.firstName || "Unknown",
    Title: input.jobTitle,
    Company: input.company || "Unknown",
    Email: input.email,
    Phone: input.phone,
    MobilePhone: input.mobile,
    Website: input.website,
    Street: input.address,
    City: input.city,
    State: input.state,
    Country: input.country,
    Status: "Open - Not Contacted",
    LeadSource: input.leadSource ?? "Trade Show / Exhibition",
    Description: input.description,
  };
}
