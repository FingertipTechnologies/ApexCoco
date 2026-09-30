import { NextResponse } from "next/server";
import { getSalesforceClient, type SalesforceObjectType } from "@/lib/salesforce";
import { compactContact, type CardContact } from "@/lib/crm/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ type: string; id: string }> };

function resolveType(value: string): SalesforceObjectType | null {
  const t = value.toLowerCase();
  return t === "lead" ? "Lead" : t === "contact" ? "Contact" : t === "account" ? "Account" : null;
}

/** GET an existing record ("Open Existing Customer"). */
export async function GET(_request: Request, { params }: Params) {
  const { type: rawType, id } = await params;
  const type = resolveType(rawType);
  if (!type) return NextResponse.json({ error: "Unknown object type." }, { status: 400 });
  try {
    const record = await getSalesforceClient().getRecord(type, id);
    if (!record) return NextResponse.json({ error: `${type} ${id} not found.` }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * PATCH { contact } -> "Update Existing Record": writes the confirmed card
 * details onto the existing Lead / Contact / Account. Only non-empty values
 * are written, so nothing already in Salesforce is blanked out.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { type: rawType, id } = await params;
  const type = resolveType(rawType);
  if (!type) return NextResponse.json({ error: "Unknown object type." }, { status: 400 });

  let body: { contact?: CardContact };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const c = compactContact(body.contact ?? {});

  const fields: Record<string, string | undefined> =
    type === "Account"
      ? { Website: c.website, Phone: c.phone ?? c.mobile, BillingStreet: c.address, BillingCity: c.city, BillingState: c.state, BillingCountry: c.country }
      : type === "Contact"
        ? { FirstName: c.firstName, LastName: c.lastName, Title: c.jobTitle, Email: c.email, Phone: c.phone, MobilePhone: c.mobile, MailingStreet: c.address, MailingCity: c.city, MailingState: c.state, MailingCountry: c.country }
        : { FirstName: c.firstName, LastName: c.lastName, Title: c.jobTitle, Company: c.company, Email: c.email, Phone: c.phone, MobilePhone: c.mobile, Website: c.website, Street: c.address, City: c.city, State: c.state, Country: c.country };

  try {
    const result = await getSalesforceClient().updateRecord({ type, id, fields });
    const updated = Object.entries(fields).filter(([, v]) => v).map(([k]) => k);
    return NextResponse.json({ ...result, updatedFields: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
