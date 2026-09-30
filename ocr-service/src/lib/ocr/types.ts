/**
 * OCR provider interface.
 *
 * The rest of the app only depends on this contract, so a production OCR
 * provider (Google Vision, AWS Textract, Azure Document Intelligence, ...)
 * can be added by implementing `OcrProvider` and registering it in
 * `src/lib/ocr/index.ts`.
 */
export interface OcrWord {
  text: string;
  confidence: number; // 0-100
}

export interface OcrLine {
  text: string;
  confidence: number; // 0-100
  words: OcrWord[];
}

export interface OcrResult {
  /** Full recognised text, lines separated by "\n". */
  text: string;
  lines: OcrLine[];
  /** Mean confidence 0-100 across recognised words, if available. */
  confidence?: number;
  provider: string;
}

/** Axis-aligned rectangle in original-image pixel coordinates. */
export interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OcrOptions {
  /**
   * Areas to blank out before recognition, e.g. a QR code that was already
   * decoded separately (its pattern otherwise turns into garbage words).
   */
  maskRegions?: Region[];
}

export interface OcrProvider {
  readonly name: string;
  /**
   * Recognise text in an image.
   * @param image  Raw image bytes (PNG/JPEG/WebP). Providers may preprocess.
   */
  recognize(image: Buffer, options?: OcrOptions): Promise<OcrResult>;
}
