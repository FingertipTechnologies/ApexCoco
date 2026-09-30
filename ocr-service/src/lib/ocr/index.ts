import type { OcrProvider, OcrResult } from "./types";
import { TesseractOcrProvider } from "./tesseract-provider";

export type { OcrProvider, OcrResult, OcrLine, OcrWord } from "./types";

/** Placeholder provider that returns no text (lets the QR + AI paths run alone). */
class NoopOcrProvider implements OcrProvider {
  readonly name = "none";
  async recognize(): Promise<OcrResult> {
    return { text: "", lines: [], provider: this.name };
  }
}

let cached: OcrProvider | null = null;

/**
 * Resolves the OCR provider from `OCR_PROVIDER`.
 * Add a production provider here, e.g. `case "google-vision": return new GoogleVisionOcrProvider()`.
 */
export function getOcrProvider(): OcrProvider {
  if (cached) return cached;
  const name = (process.env.OCR_PROVIDER ?? "tesseract").toLowerCase();
  switch (name) {
    case "none":
      cached = new NoopOcrProvider();
      break;
    case "tesseract":
    default:
      cached = new TesseractOcrProvider();
  }
  return cached;
}
