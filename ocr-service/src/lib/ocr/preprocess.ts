import sharp from "sharp";
import type { Region } from "./types";

/**
 * Normalises a visiting-card photo for OCR:
 *  - respects EXIF orientation (phone photos)
 *  - upscales small images so text is at least ~2000px wide
 *  - converts to greyscale and boosts contrast
 *
 * Returns PNG bytes. Kept separate from any specific OCR provider so cloud
 * providers can reuse it (or skip it) as they see fit.
 */
export async function preprocessForOcr(image: Buffer, maskRegions: Region[] = []): Promise<Buffer> {
  let base = sharp(image).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const targetWidth = 2000;

  if (maskRegions.length && width && height) {
    // Paint white rectangles over regions we do not want OCR to read.
    const pad = 8;
    const overlays = maskRegions
      .map((r) => ({
        left: Math.max(0, Math.floor(r.left - pad)),
        top: Math.max(0, Math.floor(r.top - pad)),
        width: Math.min(width, Math.ceil(r.width + pad * 2)),
        height: Math.min(height, Math.ceil(r.height + pad * 2)),
      }))
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({
        input: { create: { width: Math.min(r.width, width - r.left), height: Math.min(r.height, height - r.top), channels: 3 as const, background: "#ffffff" } },
        left: r.left,
        top: r.top,
      }));
    if (overlays.length) {
      base = sharp(await base.composite(overlays).toBuffer());
    }
  }

  let pipeline = base.grayscale().normalise();
  if (width > 0 && width < targetWidth) {
    pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: false });
  }
  return pipeline.png().toBuffer();
}

/** Decodes an image to raw RGBA pixels (used by the QR decoder). */
export async function toRgba(
  image: Buffer,
  maxWidth = 1600,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const { data, info } = await sharp(image)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}
