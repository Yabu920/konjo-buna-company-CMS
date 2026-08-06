const LOCAL_UPLOAD_PATTERN = /^(\/uploads)\/([^/?#]+)$/i;

export function thumbnailUrl(source: string | null | undefined): string {
  if (!source) return '';
  const match = source.match(LOCAL_UPLOAD_PATTERN);
  if (!match) return source;

  const [, uploadPath, filename] = match;
  if (filename.startsWith('thumbnails/')) return source;
  return `${uploadPath}/thumbnails/${encodeURIComponent(filename)}.webp`;
}
