import { NextResponse } from "next/server";
import { getSalesforceClient } from "@/lib/salesforce";
import { compactContact, type CardContact } from "@/lib/crm/types";

export const runtime = "nodejs";

/**
 * POST { contact, description? } -> creates a Salesforce Lead from the
 * confirmed card data. Only called after the salesperson has reviewed the
 * fields and the duplicate check has run.
 */
export async function POST(request: Request) {
  let body: { contact?: CardContact; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const contact = compactContact(body.contact ?? {});
  if (!contact.lastName && !contact.firstName) {
    return NextResponse.json({ error: "A name is required to create a Lead." }, { status: 422 });
  }
  if (!contact.company) {
    return NextResponse.json({ error: "Company is required to create a Lead." }, { status: 422 });
  }

  try {
    const result = await getSalesforceClient().createLead({
      ...contact,
      leadSource: "Trade Show / Exhibition",
      description: body.description ?? "Created from a scanned visiting card.",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lead creation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
