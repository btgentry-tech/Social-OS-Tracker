import sharp from "sharp";
import fs from "fs";
import path from "path";

const THUMBNAIL_DIR = path.resolve("data/thumbnails");

export async function downloadAndAnalyzeThumbnail(videoId: string, url: string): Promise<{
  localPath: string;
  score: number;
  metrics: { brightness: number; contrast: number; entropy: number; edgeDensity: number };
} | null> {
  try {
    if (!url) return null;
    if (!fs.existsSync(THUMBNAIL_DIR)) {
      fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
    }

    const localPath = path.join(THUMBNAIL_DIR, `${videoId}.jpg`);

    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localPath, buffer);

    const image = sharp(buffer);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const pixels = info.width * info.height;
    const channels = info.channels;

    let sumBrightness = 0;
    let sumSqBrightness = 0;
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumBrightness += lum;
      sumSqBrightness += lum * lum;
      histogram[Math.min(255, Math.round(lum))]++;
    }

    const brightness = sumBrightness / pixels;
    const variance = (sumSqBrightness / pixels) - (brightness * brightness);
    const contrast = Math.sqrt(Math.max(0, variance));

    let entropy = 0;
    for (const count of histogram) {
      if (count > 0) {
        const p = count / pixels;
        entropy -= p * Math.log2(p);
      }
    }

    const sobelData = await sharp(buffer).greyscale().raw().toBuffer();
    const w = info.width;
    let edgeSum = 0;
    const greyPixels = w * info.height;
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const gx = -sobelData[idx - w - 1] - 2 * sobelData[idx - 1] - sobelData[idx + w - 1]
          + sobelData[idx - w + 1] + 2 * sobelData[idx + 1] + sobelData[idx + w + 1];
        const gy = -sobelData[idx - w - 1] - 2 * sobelData[idx - w] - sobelData[idx - w + 1]
          + sobelData[idx + w - 1] + 2 * sobelData[idx + w] + sobelData[idx + w + 1];
        edgeSum += Math.sqrt(gx * gx + gy * gy);
      }
    }
    const edgeDensity = edgeSum / greyPixels;

    const brightnessScore = brightness >= 80 && brightness <= 180 ? 25 : (brightness >= 60 && brightness <= 200 ? 15 : 5);
    const contrastScore = Math.min(25, (contrast / 80) * 25);
    const entropyScore = Math.min(25, (entropy / 7) * 25);
    const edgeScore = Math.min(25, (edgeDensity / 40) * 25);
    const score = Math.round(brightnessScore + contrastScore + entropyScore + edgeScore);

    return {
      localPath,
      score: Math.min(100, score),
      metrics: {
        brightness: Math.round(brightness * 10) / 10,
        contrast: Math.round(contrast * 10) / 10,
        entropy: Math.round(entropy * 100) / 100,
        edgeDensity: Math.round(edgeDensity * 10) / 10,
      },
    };
  } catch (err) {
    console.error(`Thumbnail analysis failed for ${videoId}:`, err);
    return null;
  }
}
