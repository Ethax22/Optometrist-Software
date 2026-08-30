import "server-only";

import sharp from "sharp";

/**
 * Turns a photographed / scanned signature into a transparent PNG:
 * paper-white pixels become fully transparent, ink stays opaque, and the
 * result is cropped tight to the ink. Without this a phone photo of a
 * signature drops a white rectangle into the prescription PDF, which reads
 * as a box and a gap above the optometrist's name.
 */

/** Luminance at or above this counts as paper; below `INK_LUMINANCE` counts as ink. */
const PAPER_LUMINANCE = 200;
const INK_LUMINANCE = 120;

/** Padding (px) kept around the ink so strokes are not clipped at the edge. */
const CROP_PADDING = 4;

export type ProcessedSignature = { data: Buffer; mimeType: "image/png" };

export async function makeSignatureTransparent(input: Buffer): Promise<ProcessedSignature> {
  const { data, info } = await sharp(input)
    .rotate() // honour EXIF orientation before we touch raw pixels
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // Fully transparent at paper white, fully opaque at ink, linear between
      // the two so antialiased stroke edges stay smooth instead of jagged.
      let alpha: number;
      if (luminance >= PAPER_LUMINANCE) {
        alpha = 0;
      } else if (luminance <= INK_LUMINANCE) {
        alpha = 255;
      } else {
        alpha = Math.round(
          ((PAPER_LUMINANCE - luminance) / (PAPER_LUMINANCE - INK_LUMINANCE)) * 255,
        );
      }

      // Respect any transparency the source already had.
      data[i + 3] = Math.min(data[i + 3], alpha);

      if (data[i + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const transparent = sharp(data, { raw: { width, height, channels } });

  // Nothing survived the threshold (a blank or very light scan): keep the
  // full frame rather than failing the upload.
  if (maxX < minX || maxY < minY) {
    return { data: await transparent.png().toBuffer(), mimeType: "image/png" };
  }

  const left = Math.max(0, minX - CROP_PADDING);
  const top = Math.max(0, minY - CROP_PADDING);

  const cropped = await transparent
    .extract({
      left,
      top,
      width: Math.min(width - left, maxX - minX + 1 + CROP_PADDING * 2),
      height: Math.min(height - top, maxY - minY + 1 + CROP_PADDING * 2),
    })
    .png()
    .toBuffer();

  return { data: cropped, mimeType: "image/png" };
}
