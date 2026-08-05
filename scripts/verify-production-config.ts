import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { parseTrustProxy, resolveDataSourceConfiguration, uploadConfiguration } from '../server/config.js';
import { decodeImageDataUrl } from '../server/upload-validation.js';
import {
  streamValidatedVideo,
  validateVideoMetadata,
  videoUploadConfiguration,
} from '../server/video-upload.js';
import { inquiryProductValues } from '../src/inquiry.js';
import { parseAppRoute } from '../src/routing.js';
import type { Product } from '../src/types.js';

function expectConfigurationFailure(environment: NodeJS.ProcessEnv, description: string): void {
  assert.throws(() => resolveDataSourceConfiguration(environment), undefined, description);
}

expectConfigurationFailure({ NODE_ENV: 'production' }, 'production must reject missing DATA_SOURCE');
expectConfigurationFailure({ NODE_ENV: 'production', DATA_SOURCE: 'other' }, 'production must reject invalid DATA_SOURCE');
expectConfigurationFailure({ NODE_ENV: 'production', DATA_SOURCE: 'json' }, 'production must reject JSON mode');
expectConfigurationFailure({ NODE_ENV: 'production', DATA_SOURCE: 'mysql' }, 'MySQL mode must require DATABASE_URL');

assert.deepEqual(
  resolveDataSourceConfiguration({
    NODE_ENV: 'production',
    DATA_SOURCE: 'mysql',
    DATABASE_URL: 'mysql://audit-user:audit-password@localhost:3306/audit_database',
  }).dataSource,
  'mysql',
);
assert.equal(resolveDataSourceConfiguration({ NODE_ENV: 'development', DATA_SOURCE: 'json' }).dataSource, 'json');
assert.equal(parseTrustProxy(undefined), false);
assert.equal(parseTrustProxy('false'), false);
assert.equal(parseTrustProxy('1'), 1);
assert.equal(parseTrustProxy('loopback'), 'loopback');
assert.throws(() => parseTrustProxy('true'));
assert.throws(() => parseTrustProxy('0.0.0.0/0'));
assert.equal(uploadConfiguration({}, '/safe/application').publicPath, '/uploads');
assert.throws(() => uploadConfiguration({ PUBLIC_UPLOAD_PATH: '/../private' }, '/safe/application'));
assert.throws(() => decodeImageDataUrl('data:image/png;base64,PGh0bWw+PC9odG1sPg=='));
assert.throws(() => decodeImageDataUrl('data:image/png;base64,not-valid-base64'));
assert.equal(decodeImageDataUrl('data:image/png;base64,iVBORw0KGgo=').mime, 'image/png');
assert.equal(videoUploadConfiguration({}).maxMegabytes, 200);
assert.equal(videoUploadConfiguration({ MAX_VIDEO_UPLOAD_MB: '300' }).maxMegabytes, 300);
assert.throws(() => videoUploadConfiguration({ MAX_VIDEO_UPLOAD_MB: '301' }));
assert.deepEqual(validateVideoMetadata('gallery.mp4', 'video/mp4'), { extension: '.mp4', mime: 'video/mp4' });
assert.deepEqual(validateVideoMetadata('gallery.webm', 'video/webm'), { extension: '.webm', mime: 'video/webm' });
assert.throws(() => validateVideoMetadata('gallery.mp4', 'video/webm'));

const videoTestDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'konjo-video-upload-'));
try {
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.from('test')]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('webm-test')]);
  const mp4Path = path.join(videoTestDirectory, 'valid.mp4.part');
  const webmPath = path.join(videoTestDirectory, 'valid.webm.part');
  assert.equal(await streamValidatedVideo(Readable.from(mp4), mp4Path, validateVideoMetadata('valid.mp4', 'video/mp4'), 1024), mp4.length);
  assert.equal(await streamValidatedVideo(Readable.from(webm), webmPath, validateVideoMetadata('valid.webm', 'video/webm'), 1024), webm.length);

  const disguisedPath = path.join(videoTestDirectory, 'disguised.mp4.part');
  await assert.rejects(streamValidatedVideo(Readable.from(Buffer.from('not a video')), disguisedPath, validateVideoMetadata('bad.mp4', 'video/mp4'), 1024));
  assert.equal(fs.existsSync(disguisedPath), false);

  const oversizedPath = path.join(videoTestDirectory, 'oversized.mp4.part');
  await assert.rejects(streamValidatedVideo(Readable.from(mp4), oversizedPath, validateVideoMetadata('large.mp4', 'video/mp4'), 8));
  assert.equal(fs.existsSync(oversizedPath), false);

  const interruptedPath = path.join(videoTestDirectory, 'interrupted.webm.part');
  const interrupted = new Readable({
    read() {
      this.push(webm.subarray(0, 4));
      this.destroy(new Error('simulated interrupted upload'));
    },
  });
  await assert.rejects(streamValidatedVideo(interrupted, interruptedPath, validateVideoMetadata('interrupted.webm', 'video/webm'), 1024));
  assert.equal(fs.existsSync(interruptedPath), false);
} finally {
  await fs.promises.rm(videoTestDirectory, { recursive: true, force: true });
}

const isolatedProduct = {
  id: 'qa-isolated-product-id',
  title_en: 'QA Isolated Coffee',
  title_am: 'á‹¨á‰…á‹¨áŠ  á‰¡áŠ“',
} as Product;
assert.deepEqual(inquiryProductValues([isolatedProduct], isolatedProduct.id), {
  product_id: isolatedProduct.id,
  coffee_type: isolatedProduct.title_en,
});
assert.deepEqual(inquiryProductValues([isolatedProduct], ''), { product_id: '', coffee_type: 'General Inquiry' });
assert.deepEqual(parseAppRoute('/products/qa-coffee'), { view: 'product-detail', productKey: 'qa-coffee', newsKey: null, searchQuery: '' });
assert.deepEqual(parseAppRoute('/news/qa-news'), { view: 'news', productKey: null, newsKey: 'qa-news', searchQuery: '' });

console.log('Production configuration verification passed without connecting to a database.');
