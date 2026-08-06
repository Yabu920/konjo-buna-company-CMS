import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const THUMBNAIL_WIDTH = 640;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const inFlight = new Map<string, Promise<string>>();

export function thumbnailDirectory(uploadDirectory: string): string {
  return path.resolve(uploadDirectory, 'thumbnails');
}

export function originalNameFromThumbnail(filename: string): string | null {
  if (!filename.endsWith('.webp')) return null;
  const originalName = filename.slice(0, -'.webp'.length);
  if (!originalName || path.basename(originalName) !== originalName) return null;
  if (!SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(originalName).toLowerCase())) return null;
  return originalName;
}

async function createThumbnail(uploadDirectory: string, originalName: string): Promise<string> {
  const sourcePath = path.resolve(uploadDirectory, originalName);
  if (path.dirname(sourcePath) !== uploadDirectory) throw new Error('Invalid source image path');

  const destinationDirectory = thumbnailDirectory(uploadDirectory);
  const destinationPath = path.resolve(destinationDirectory, `${originalName}.webp`);
  if (path.dirname(destinationPath) !== destinationDirectory) throw new Error('Invalid thumbnail path');

  await fs.promises.access(sourcePath, fs.constants.R_OK);
  await fs.promises.mkdir(destinationDirectory, { recursive: true, mode: 0o750 });
  try {
    await fs.promises.access(destinationPath, fs.constants.R_OK);
    return destinationPath;
  } catch {
    // Generate the derivative below. The original upload is never modified.
  }

  const temporaryPath = `${destinationPath}.${process.pid}.tmp`;
  try {
    await sharp(sourcePath)
      .rotate()
      .resize({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_WIDTH, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(temporaryPath);
    await fs.promises.rename(temporaryPath, destinationPath);
    return destinationPath;
  } finally {
    await fs.promises.unlink(temporaryPath).catch(() => undefined);
  }
}

export function ensureImageThumbnail(uploadDirectory: string, originalName: string): Promise<string> {
  const existing = inFlight.get(originalName);
  if (existing) return existing;

  const pending = createThumbnail(uploadDirectory, originalName).finally(() => {
    inFlight.delete(originalName);
  });
  inFlight.set(originalName, pending);
  return pending;
}
