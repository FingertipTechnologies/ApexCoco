import jsQR from "jsqr";
import sharp from "sharp";
import { toRgba } from "../ocr/preprocess";
import type { Region } from "../ocr/types";

export interface QrDecodeResult {
  data: string;
  /** Bounding box of the QR code in original-image pixel coordinates. */
  region?: Region;
}

/**
 * Detects and decodes a QR code from image bytes using jsQR.
 *
 * Tries the image at a few scales because a small QR on a large card photo
 * decodes more reliably once downsampled, while a low-res photo may need the
 * full size. Returns `null` when no QR code is found.
 */
export async function decodeQrFromImage(image: Buffer): Promise<QrDecodeResult | null> {
  const meta = await sharp(image).rotate().metadata();
  const originalWidth = meta.width ?? 0;

  const widths = [1200, 800, 1600, 2000];
  for (const width of widths) {
    try {
      const { data, width: w, height: h } = await toRgba(image, width);
      const found = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
      if (found?.data) {
        const scale = originalWidth && w ? originalWidth / w : 1;
        const corners = [
          found.location.topLeftCorner,
          found.location.topRightCorner,
          found.location.bottomLeftCorner,
          found.location.bottomRightCorner,
        ];
        const xs = corners.map((c) => c.x * scale);
        const ys = corners.map((c) => c.y * scale);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        return {
          data: found.data,
          region: { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top },
        };
      }
    } catch {
      // Ignore and try the next scale.
    }
  }
  return null;
}
