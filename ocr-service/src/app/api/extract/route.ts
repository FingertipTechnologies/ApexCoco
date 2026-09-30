import { NextResponse } from "next/server";
import { extractFromCardImage } from "@/lib/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/**
 * Visiting-card extraction endpoint. Accepts either:
 *  - multipart/form-data with an `image` file (used by the standalone demo UI), or
 *  - application/json { imageBase64, contentType, fileName } (used by the Salesforce
 *    Apex adapter VisitingCardHttpOcrProvider through a Named Credential).
 * Runs OCR + QR detection + parsing and returns structured CRM data.
 * Does NOT create any Salesforce record.
 *
 * When OCR_SERVICE_API_KEY is set, requests must send it in the `x-api-key` header.
 */
export async function POST(request: Request) {
  const unauthorised = checkApiKey(request);
  if (unauthorised) return unauthorised;

  let buffer: Buffer;
  let mimeType: string;
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("application/json")) {
    let body: { imageBase64?: string; contentType?: string; fileName?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!body.imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
    }
    mimeType = (body.contentType ?? "image/jpeg").toLowerCase();
    if (!ALLOWED.has(mimeType)) {
      return NextResponse.json({ error: `Unsupported image type "${mimeType}". Use JPEG, PNG or WebP.` }, { status: 415 });
    }
    buffer = Buffer.from(body.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!buffer.length) return NextResponse.json({ error: "imageBase64 could not be decoded." }, { status: 400 });
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart/form-data with an image, or a JSON body with imageBase64." }, { status: 400 });
    }
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image uploaded. Attach the visiting card as `image`." }, { status: 400 });
    }
    mimeType = file.type.toLowerCase();
    if (!ALLOWED.has(mimeType)) {
      return NextResponse.json({ error: `Unsupported image type "${file.type}". Use JPEG, PNG or WebP.` }, { status: 415 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
  }

  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 12 MB. Please use a smaller photo." }, { status: 413 });
  }

  try {
    const result = await extractFromCardImage(buffer, mimeType);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function checkApiKey(request: Request): NextResponse | null {
  const required = process.env.OCR_SERVICE_API_KEY;
  if (!required) return null;
  const provided = request.headers.get("x-api-key") ?? "";
  if (provided !== required) {
    return NextResponse.json({ error: "Unauthorised: missing or invalid x-api-key." }, { status: 401 });
  }
  return null;
}
