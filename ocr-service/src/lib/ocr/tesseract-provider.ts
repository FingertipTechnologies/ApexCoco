import { createWorker, type Worker } from "tesseract.js";
import path from "node:path";
import fs from "node:fs";
import type { OcrProvider, OcrResult, OcrLine, OcrOptions } from "./types";
import { preprocessForOcr } from "./preprocess";

/** Words below this tesseract confidence (0-100) are discarded. */
const MIN_WORD_CONFIDENCE = 40;

/**
 * Locates the bundled English traineddata. Falls back to the tesseract.js
 * default CDN path when the package is not installed.
 */
function resolveLangPath(): string | undefined {
  if (process.env.TESSERACT_LANG_PATH) return process.env.TESSERACT_LANG_PATH;
  const candidate = path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
  return fs.existsSync(path.join(candidate, "eng.traineddata.gz")) ? candidate : undefined;
}

/**
 * Local OCR using tesseract.js. Runs entirely inside the Node process, so the
 * demo works without any external API key. Language data (~4 MB) is fetched
 * once and cached under `.tesseract-cache/`.
 */
export class TesseractOcrProvider implements OcrProvider {
  readonly name = "tesseract.js";
  private workerPromise: Promise<Worker> | null = null;

  private getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = createWorker("eng", 1, {
        // English language data is bundled via the @tesseract.js-data/eng
        // npm package so the demo works offline (no CDN download at runtime).
        langPath: resolveLangPath(),
        cachePath: path.join(process.cwd(), ".tesseract-cache"),
        gzip: true,
        // Silence per-progress logging in the server console.
        logger: () => {},
      }).then(async (worker) => {
        await worker.setParameters({
          // Treat the card as a single block of text with mixed layout.
          preserve_interword_spaces: "1",
        });
        return worker;
      });
    }
    return this.workerPromise;
  }

  async recognize(image: Buffer, options: OcrOptions = {}): Promise<OcrResult> {
    const worker = await this.getWorker();
    const prepared = await preprocessForOcr(image, options.maskRegions);
    const { data } = await worker.recognize(prepared, {}, { blocks: true });

    const lines: OcrLine[] = [];
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          // Drop low-confidence fragments (logos, icons, decorative marks read
          // as text). Genuine words on a legible card score well above this.
          const words = line.words
            .map((w) => ({ text: w.text.trim(), confidence: w.confidence }))
            .filter((w) => w.text && w.confidence >= MIN_WORD_CONFIDENCE && !/^[^A-Za-z0-9+@]+$/.test(w.text));
          if (!words.length) continue;
          const text = words.map((w) => w.text).join(" ");
          lines.push({
            text,
            confidence: words.reduce((sum, w) => sum + w.confidence, 0) / words.length,
            words,
          });
        }
      }
    }

    return {
      text: lines.length ? lines.map((l) => l.text).join("\n") : data.text.trim(),
      lines,
      confidence: Number.isFinite(data.confidence) ? data.confidence : undefined,
      provider: this.name,
    };
  }
}
