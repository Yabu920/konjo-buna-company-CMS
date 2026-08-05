import fs from 'node:fs';
import path from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BYTES_PER_MB = 1024 * 1024;
export const DEFAULT_MAX_VIDEO_UPLOAD_MB = 200;
export const ABSOLUTE_MAX_VIDEO_UPLOAD_MB = 300;

export interface VideoUploadConfiguration {
  maxMegabytes: number;
  maxBytes: number;
}

export interface ValidatedVideoMetadata {
  extension: '.mp4' | '.webm';
  mime: 'video/mp4' | 'video/webm';
}

export class VideoUploadValidationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function videoUploadConfiguration(environment: NodeJS.ProcessEnv): VideoUploadConfiguration {
  const configured = environment.MAX_VIDEO_UPLOAD_MB?.trim();
  const maxMegabytes = configured ? Number(configured) : DEFAULT_MAX_VIDEO_UPLOAD_MB;
  if (!Number.isSafeInteger(maxMegabytes) || maxMegabytes <= 0) {
    throw new Error('MAX_VIDEO_UPLOAD_MB must be a positive integer.');
  }
  if (maxMegabytes > ABSOLUTE_MAX_VIDEO_UPLOAD_MB) {
    throw new Error(`MAX_VIDEO_UPLOAD_MB cannot exceed ${ABSOLUTE_MAX_VIDEO_UPLOAD_MB}.`);
  }
  return { maxMegabytes, maxBytes: maxMegabytes * BYTES_PER_MB };
}

export function validateVideoMetadata(filename: string, contentType: string | undefined): ValidatedVideoMetadata {
  const extension = path.extname(path.basename(filename)).toLowerCase();
  const mime = contentType?.split(';', 1)[0].trim().toLowerCase();
  if (extension === '.mp4' && mime === 'video/mp4') return { extension, mime };
  if (extension === '.webm' && mime === 'video/webm') return { extension, mime };
  throw new VideoUploadValidationError('Only matching MP4 (video/mp4) and WebM (video/webm) files are allowed.', 415);
}

function hasValidSignature(header: Buffer, metadata: ValidatedVideoMetadata): boolean {
  if (metadata.extension === '.mp4') {
    return header.length >= 12 && header.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  return header.length >= 4 && header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
}

class VideoValidationTransform extends Transform {
  private bytesReceived = 0;
  private header = Buffer.alloc(0);

  constructor(
    private readonly metadata: ValidatedVideoMetadata,
    private readonly maxBytes: number,
  ) {
    super();
  }

  get size(): number {
    return this.bytesReceived;
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void): void {
    this.bytesReceived += chunk.length;
    if (this.bytesReceived > this.maxBytes) {
      callback(new VideoUploadValidationError('Video exceeds the configured upload limit.', 413));
      return;
    }
    if (this.header.length < 12) {
      this.header = Buffer.concat([this.header, chunk.subarray(0, 12 - this.header.length)]);
    }
    callback(null, chunk);
  }

  override _flush(callback: (error?: Error | null) => void): void {
    if (this.bytesReceived === 0) {
      callback(new VideoUploadValidationError('The uploaded video is empty.', 400));
      return;
    }
    if (!hasValidSignature(this.header, this.metadata)) {
      callback(new VideoUploadValidationError('Video content does not match its declared type.', 400));
      return;
    }
    callback();
  }
}

export async function streamValidatedVideo(
  source: Readable,
  temporaryPath: string,
  metadata: ValidatedVideoMetadata,
  maxBytes: number,
): Promise<number> {
  const validator = new VideoValidationTransform(metadata, maxBytes);
  try {
    await pipeline(source, validator, fs.createWriteStream(temporaryPath, { flags: 'wx', mode: 0o640 }));
    return validator.size;
  } catch (error) {
    await fs.promises.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
