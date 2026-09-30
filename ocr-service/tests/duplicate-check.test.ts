import { describe, it, expect, beforeEach } from "vitest";
import { MockSalesforceClient, seedExistingCustomer, resetMockStore } from "@/lib/salesforce/mock-client";
import { checkDuplicates } from "@/lib/salesforce/duplicate-check";
import { criteriaFromContact, phoneKey, domainOf, normaliseCompany } from "@/lib/salesforce/criteria";
import type { CardContact } from "@/lib/crm/types";

const ameen: CardContact = {
  firstName: "Ameen",
  lastName: "Azeez",
  jobTitle: "Chief Revenue Officer",
  company: "Fingertip",
  mobile: "9495072255",
  email: "ameen@fingertipplus.com",
  website: "www.fingertipplus.com",
};

describe("criteria normalisation", () => {
  it("normalises phones to the last 10 digits", () => {
    expect(phoneKey("+91 94950 72255")).toBe("9495072255");
    expect(phoneKey("9495072255")).toBe("9495072255");
    expect(phoneKey("123")).toBeUndefined();
  });
  it("extracts a company domain from email or website, ignoring webmail", () => {
    expect(domainOf("ameen@fingertipplus.com")).toBe("fingertipplus.com");
    expect(domainOf("https://www.fingertipplus.com/team")).toBe("fingertipplus.com");
    expect(domainOf("someone@gmail.com")).toBeUndefined();
  });
  it("strips legal suffixes from company names", () => {
    expect(normaliseCompany("Fingertip Technologies Pvt. Ltd.")).toBe("fingertip");
    expect(normaliseCompany("Fingertip")).toBe("fingertip");
  });
  it("builds search criteria from a contact", () => {
    const c = criteriaFromContact(ameen);
    expect(c.email).toBe("ameen@fingertipplus.com");
    expect(c.phones).toEqual(["9495072255"]);
    expect(c.domain).toBe("fingertipplus.com");
  });
});

describe("checkDuplicates against the mock org", () => {
  beforeEach(() => resetMockStore());

  it("reports a new prospect when nothing matches", async () => {
    const result = await checkDuplicates(new MockSalesforceClient(), ameen);
    expect(result.status).toBe("new");
    expect(result.leads).toHaveLength(0);
    expect(result.contacts).toHaveLength(0);
    expect(result.accounts).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it("finds the seeded Fingertip account and contact with high confidence", async () => {
    seedExistingCustomer(true);
    const result = await checkDuplicates(new MockSalesforceClient(), ameen);
    expect(result.status).toBe("match");
    expect(result.accounts.map((a) => a.title)).toContain("Fingertip");
    expect(result.contacts.map((c) => c.title)).toContain("Ameen Azeez");
    const contact = result.contacts[0];
    expect(contact.matchedFields.map((f) => f.key).sort()).toEqual(["company", "email", "name", "phone"]);
    expect(contact.confidence).toBeGreaterThanOrEqual(90);
    expect(result.confidence).toBeGreaterThanOrEqual(90);
    expect(result.bestMatch?.type).toBe("Contact");
  });

  it("matches on phone alone with lower confidence", async () => {
    seedExistingCustomer(true);
    const result = await checkDuplicates(new MockSalesforceClient(), { firstName: "A", lastName: "Z", company: "Other Co", mobile: "+91 94950 72255" });
    expect(result.status).toBe("match");
    const contact = result.contacts[0];
    expect(contact.matchedFields.map((f) => f.key)).toEqual(["phone"]);
    expect(contact.confidence).toBeLessThan(70);
  });

  it("creates a lead that is then found by the next check", async () => {
    const client = new MockSalesforceClient();
    const created = await client.createLead({ ...ameen, leadSource: "Trade Show" });
    expect(created.id).toMatch(/^00Q/);
    expect(created.record.Company).toBe("Fingertip");
    expect(created.record.LastName).toBe("Azeez");
    const result = await checkDuplicates(client, ameen);
    expect(result.leads.map((l) => l.id)).toContain(created.id);
  });
});
