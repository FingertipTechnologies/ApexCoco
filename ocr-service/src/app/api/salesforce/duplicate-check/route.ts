import { NextResponse } from "next/server";
import { getSalesforceClient, checkDuplicates, checkObject, type SalesforceObjectType } from "@/lib/salesforce";
import { compactContact, type CardContact } from "@/lib/crm/types";

export const runtime = "nodejs";

const OBJECTS: SalesforceObjectType[] = ["Lead", "Contact", "Account"];

/**
 * POST { contact, object? }
 *  - with `object` ("Lead" | "Contact" | "Account"): checks that object only
 *    (the UI calls this three times to show "Checking Leads..." etc.)
 *  - without: runs the full check and returns the summary.
 */
export async function POST(request: Request) {
  let body: { contact?: CardContact; object?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const contact = compactContact(body.contact ?? {});
  if (!Object.keys(contact).length) {
    return NextResponse.json({ error: "No contact details to check." }, { status: 400 });
  }

  const client = getSalesforceClient();
  try {
    if (body.object) {
      const type = OBJECTS.find((o) => o.toLowerCase() === body.object!.toLowerCase());
      if (!type) return NextResponse.json({ error: `Unknown object "${body.object}".` }, { status: 400 });
      return NextResponse.json(await checkObject(client, type, contact));
    }
    return NextResponse.json(await checkDuplicates(client, contact));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duplicate check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
