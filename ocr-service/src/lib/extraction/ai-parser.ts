import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CardContact } from "../crm/types";
import { compactContact } from "../crm/types";

/**
 * AI-based structured extraction using Claude. It sees the card image itself
 * plus the OCR text, so it can fix OCR mistakes and resolve layout ambiguity
 * (e.g. which line is the company vs. the person). Enabled only when
 * `ANTHROPIC_API_KEY` is set; otherwise the heuristic parser is used.
 */

const CardContactSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  mobile: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
});

const SYSTEM_PROMPT = `You extract contact details from business (visiting) cards for a Salesforce CRM.
Return only what is printed on the card or provided in the QR payload. Do not invent values.
Rules:
- firstName/lastName: the person's name, split on the first space. Drop honorifics (Mr, Dr).
- jobTitle: the role as printed (e.g. "Chief Revenue Officer").
- company: the organisation name, without legal suffixes only if they are absent on the card.
- mobile vs phone: mobile numbers (cell, +91 10-digit, "M:") go in mobile; landlines/office go in phone. Keep digits and a leading + only.
- email lowercase. website without trailing punctuation.
- address: street portion only; city/state/country split into their own fields when present.
- Use null for anything not on the card.`;

export type AiParserOutcome =
  | { ok: true; contact: CardContact; model: string }
  | { ok: false; reason: string };

export function isAiParserConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function parseCardWithAi(input: {
  image: Buffer;
  mimeType: string;
  ocrText: string;
  qrContact?: CardContact;
}): Promise<AiParserOutcome> {
  if (!isAiParserConfigured()) return { ok: false, reason: "ANTHROPIC_API_KEY not set" };

  const model = process.env.EXTRACTION_MODEL ?? "claude-opus-5-5";
  const client = new Anthropic();
  const mediaType = normaliseMediaType(input.mimeType);
  if (!mediaType) return { ok: false, reason: `Unsupported image type ${input.mimeType}` };

  const context = [
    `OCR text from the card:\n${input.ocrText || "(none)"}`,
    input.qrContact ? `Contact decoded from the card's QR code (authoritative):\n${JSON.stringify(input.qrContact, null, 2)}` : "",
    "Extract the structured contact from the image, using the OCR text and QR data as supporting evidence.",
  ].filter(Boolean).join("\n\n");

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: input.image.toString("base64") } },
            { type: "text", text: context },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(CardContactSchema) },
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, reason: "Model declined the request" };
    }
    const parsed = response.parsed_output;
    if (!parsed) return { ok: false, reason: "Model returned no structured output" };

    const contact: CardContact = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") (contact as Record<string, string>)[key] = value;
    }
    return { ok: true, contact: compactContact(contact), model };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }
}

function normaliseMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  const m = mimeType.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "image/jpeg";
  if (m === "image/png") return "image/png";
  if (m === "image/webp") return "image/webp";
  if (m === "image/gif") return "image/gif";
  return null;
}
