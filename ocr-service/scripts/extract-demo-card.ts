/**
 * Runs the full extraction pipeline (OCR -> QR -> parsing -> structured CRM
 * data) on a card image from the command line, without the UI.
 *
 *   npm run demo:extract                       # uses public/demo/ameen-azeez-card.png
 *   npm run demo:extract -- path/to/card.jpg
 */
import fs from "node:fs/promises";
import path from "node:path";
import { extractFromCardImage } from "../src/lib/extraction";

async function main() {
  const file = process.argv[2] ?? path.join("public", "demo", "ameen-azeez-card.png");
  const image = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const result = await extractFromCardImage(image, mime);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
