import { NextResponse } from "next/server";
import { getSalesforceClient, isMockSalesforce, seedExistingCustomer, isExistingCustomerSeeded, resetMockStore } from "@/lib/salesforce";
import { getOcrProvider } from "@/lib/ocr";
import { isAiParserConfigured } from "@/lib/extraction/ai-parser";

export const runtime = "nodejs";

function snapshot() {
  return {
    salesforceProvider: getSalesforceClient().name,
    mock: isMockSalesforce(),
    simulateExistingCustomer: isMockSalesforce() ? isExistingCustomerSeeded() : false,
    ocrProvider: getOcrProvider().name,
    aiParser: isAiParserConfigured(),
  };
}

/** GET current demo configuration (shown in the header). */
export async function GET() {
  return NextResponse.json(snapshot());
}

/**
 * POST { simulateExistingCustomer?: boolean, reset?: boolean }
 * Mock backend only: toggles the seeded "Fingertip" customer so both demo
 * branches (New Prospect / Existing Customer) can be shown.
 */
export async function POST(request: Request) {
  if (!isMockSalesforce()) {
    return NextResponse.json({ error: "Demo controls are only available with the mock Salesforce backend." }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { simulateExistingCustomer?: boolean; reset?: boolean };
  if (body.reset) resetMockStore();
  if (typeof body.simulateExistingCustomer === "boolean") seedExistingCustomer(body.simulateExistingCustomer);
  return NextResponse.json(snapshot());
}
