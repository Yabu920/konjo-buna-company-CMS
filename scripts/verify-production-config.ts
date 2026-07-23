import assert from 'node:assert/strict';
import { parseTrustProxy, resolveDataSourceConfiguration, uploadConfiguration } from '../server/config.js';
import { decodeImageDataUrl } from '../server/upload-validation.js';
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
