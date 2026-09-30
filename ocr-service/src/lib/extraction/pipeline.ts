import type { ExtractionResult } from "../crm/types";
import { getOcrProvider } from "../ocr";
import { decodeQrFromImage, parseQrPayload } from "../qr";
import { parseCardText } from "./heuristic-parser";
import { parseCardWithAi, isAiParserConfigured } from "./ai-parser";
import { mergeContactLayers, type Layer } from "./merge";

/**
 * Visiting Card Image -> OCR -> Raw Text -> Parsing (AI or heuristic) ->
 * Structured CRM Data, with QR-code data merged in when present.
 *
 * This never touches Salesforce: extraction and record creation are
 * deliberately separate steps so the salesperson can review first.
 */
export async function extractFromCardImage(image: Buffer, mimeType: string): Promise<ExtractionResult> {
  const started = Date.now();
  const warnings: string[] = [];
  const ocr = getOcrProvider();

  // 1. QR first: it is fast, and knowing where the code sits lets us mask it
  //    out so OCR does not turn the pattern into garbage words.
  const qrOutcome = await Promise.allSettled([decodeQrFromImage(image)]).then((r) => r[0]);
  const qrDecoded = qrOutcome.status === "fulfilled" ? qrOutcome.value : null;
  const qr = qrDecoded ? { raw: qrDecoded.data, ...parseQrPayload(qrDecoded.data) } : undefined;

  // 2. OCR -> raw text.
  const ocrOutcome = await Promise.allSettled([
    ocr.recognize(image, { maskRegions: qrDecoded?.region ? [qrDecoded.region] : [] }),
  ]).then((r) => r[0]);
  const ocrResult = ocrOutcome.status === "fulfilled" ? ocrOutcome.value : null;
  if (ocrOutcome.status === "rejected") {
    warnings.push(`OCR failed: ${errorMessage(ocrOutcome.reason)}`);
  }
  const rawText = ocrResult?.text ?? "";
  if (!rawText.trim()) warnings.push("OCR returned no text. Try a sharper, well-lit photo.");

  const layers: Layer[] = [];
  if (qr?.contact) layers.push({ source: "qr", contact: qr.contact });

  let parser: ExtractionResult["pipeline"]["parser"] = "heuristic";
  if (isAiParserConfigured()) {
    const ai = await parseCardWithAi({ image, mimeType, ocrText: rawText, qrContact: qr?.contact });
    if (ai.ok) {
      layers.push({ source: "ai", contact: ai.contact });
      parser = "ai";
    } else {
      warnings.push(`AI parsing unavailable (${ai.reason}); used heuristic parser.`);
    }
  }

  const heuristic = parseCardText(rawText);
  layers.push({ source: "ocr", contact: heuristic.contact });

  const merged = mergeContactLayers(layers);

  if (!merged.contact.firstName && !merged.contact.lastName) {
    warnings.push("Could not confidently identify the person's name. Please review.");
  }

  return {
    contact: merged.contact,
    sources: merged.sources,
    rawText,
    ocrConfidence: ocrResult?.confidence,
    qr: qr ? { raw: qr.raw, format: qr.format, contact: qr.contact } : undefined,
    pipeline: {
      ocrProvider: ocr.name,
      parser,
      qrDetected: Boolean(qr),
      durationMs: Date.now() - started,
    },
    warnings,
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
