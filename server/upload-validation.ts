const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export class UploadValidationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function validImageSignature(buffer: Buffer, mime: string): boolean {
  if (mime === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return buffer.length >= 4
      && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  }
  if (mime === 'image/webp') {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

export function decodeImageDataUrl(data: string): { buffer: Buffer; mime: string; extension: string } {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(data);
  if (!match) throw new UploadValidationError('Invalid data format. Expected data URL with base64.', 400);

  const mime = match[1];
  const base64 = match[3];
  if (base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) {
    throw new UploadValidationError('Invalid base64 image data', 400);
  }

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const estimatedBytes = (base64.length / 4) * 3 - padding;
  if (estimatedBytes > MAX_UPLOAD_BYTES) throw new UploadValidationError('File too large', 413);

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length !== estimatedBytes || buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError('Invalid base64 image data', 400);
  }
  if (!validImageSignature(buffer, mime)) {
    throw new UploadValidationError('Image content does not match its declared type', 400);
  }
  return {
    buffer,
    mime,
    extension: mime === 'image/jpeg' || mime === 'image/jpg' ? '.jpg' : `.${mime.split('/')[1]}`,
  };
}
