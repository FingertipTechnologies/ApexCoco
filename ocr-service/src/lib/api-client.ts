import type { CardContact, ExtractionResult } from "./crm/types";
import type { ObjectCheckResult, CreateLeadResult, SalesforceObjectType, SalesforceRecord } from "./salesforce";

/** Typed fetch helpers used by the client-side wizard. */

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export async function extractCard(file: File): Promise<ExtractionResult> {
  const form = new FormData();
  form.append("image", file, file.name);
  return handle(await fetch("/api/extract", { method: "POST", body: form }));
}

export async function checkObject(object: SalesforceObjectType, contact: CardContact): Promise<ObjectCheckResult> {
  return handle(
    await fetch("/api/salesforce/duplicate-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact, object }),
    }),
  );
}

export async function createLead(contact: CardContact): Promise<CreateLeadResult> {
  return handle(
    await fetch("/api/salesforce/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    }),
  );
}

export async function updateRecord(type: SalesforceObjectType, id: string, contact: CardContact): Promise<{ id: string; url?: string; updatedFields: string[] }> {
  return handle(
    await fetch(`/api/salesforce/records/${type.toLowerCase()}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    }),
  );
}

export async function getRecord(type: SalesforceObjectType, id: string): Promise<SalesforceRecord> {
  return handle(await fetch(`/api/salesforce/records/${type.toLowerCase()}/${id}`));
}
