import type { SalesforceClient } from "./types";
import { MockSalesforceClient } from "./mock-client";
import { JsforceSalesforceClient } from "./jsforce-client";

export * from "./types";
export { criteriaFromContact, phoneKey, domainOf, normaliseCompany } from "./criteria";
export { checkDuplicates, checkObject, summarise } from "./duplicate-check";
export type { DuplicateCheckResult, RecordMatch, MatchedField, ObjectCheckResult } from "./duplicate-check";
export { seedExistingCustomer, isExistingCustomerSeeded, resetMockStore } from "./mock-client";

let cached: SalesforceClient | null = null;

/** Resolves the Salesforce backend from SALESFORCE_PROVIDER ("mock" | "jsforce"). */
export function getSalesforceClient(): SalesforceClient {
  if (cached) return cached;
  const provider = (process.env.SALESFORCE_PROVIDER ?? "mock").toLowerCase();
  cached = provider === "jsforce" ? new JsforceSalesforceClient() : new MockSalesforceClient();
  return cached;
}

export function isMockSalesforce(): boolean {
  return getSalesforceClient().name === "mock";
}
