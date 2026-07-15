import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonRecord = Record<string, unknown>;

type SourceDatabase = {
  admins: JsonRecord[];
  product_categories: JsonRecord[];
  products: JsonRecord[];
  services: JsonRecord[];
  news_posts: JsonRecord[];
  gallery_images: JsonRecord[];
  inquiries: JsonRecord[];
  newsletter_subscribers: JsonRecord[];
  site_settings: JsonRecord[];
};

type CollectionName = keyof SourceDatabase;
type Counts = Record<CollectionName, number>;

type PreparedDatabase = {
  admins: JsonRecord[];
  product_categories: JsonRecord[];
  products: JsonRecord[];
  services: JsonRecord[];
  news_posts: JsonRecord[];
  gallery_images: JsonRecord[];
  inquiries: JsonRecord[];
  newsletter_subscribers: JsonRecord[];
  site_settings: JsonRecord[];
};

type ValidationResult = {
  prepared: PreparedDatabase;
  found: Counts;
  warnings: string[];
  errors: string[];
  skipped: Counts;
};

const COLLECTIONS: CollectionName[] = [
  'admins',
  'product_categories',
  'products',
  'services',
  'news_posts',
  'gallery_images',
  'inquiries',
  'newsletter_subscribers',
  'site_settings',
];

const emptyCounts = (): Counts => Object.fromEntries(COLLECTIONS.map((name) => [name, 0])) as Counts;
const asString = (value: unknown): string => value == null ? '' : String(value);
const asBoolean = (value: unknown): boolean => value === true || value === 'true' || value === 1;

function parseDate(value: unknown, label: string, errors: string[]): Date {
  const date = new Date(asString(value));
  if (Number.isNaN(date.getTime())) {
    errors.push(`${label} has an invalid timestamp: ${JSON.stringify(value)}`);
    return new Date(0);
  }
  return date;
}

function readSource(): SourceDatabase {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const databasePath = path.resolve(scriptDir, '..', 'database.json');
  const parsed = JSON.parse(fs.readFileSync(databasePath, 'utf8')) as Record<string, unknown>;
  const source = {} as SourceDatabase;

  for (const name of COLLECTIONS) {
    const value = parsed[name];
    if (!Array.isArray(value)) {
      throw new Error(`database.json collection "${name}" is missing or is not an array.`);
    }
    source[name] = value as JsonRecord[];
  }

  return source;
}

function requireFields(collection: CollectionName, records: JsonRecord[], fields: string[], errors: string[]) {
  records.forEach((record, index) => {
    for (const field of fields) {
      if (!asString(record[field]).trim()) {
        errors.push(`${collection}[${index}] is missing required field "${field}".`);
      }
    }
  });
}

function findDuplicates(
  collection: CollectionName,
  records: JsonRecord[],
  field: string,
  errors: string[],
  caseInsensitive = false,
) {
  const seen = new Map<string, number>();
  records.forEach((record, index) => {
    const raw = asString(record[field]).trim();
    if (!raw) return;
    const key = caseInsensitive ? raw.toLowerCase() : raw;
    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      errors.push(`${collection} has duplicate ${field} "${raw}" at indexes ${firstIndex} and ${index}.`);
    } else {
      seen.set(key, index);
    }
  });
}

function validateAndPrepare(source: SourceDatabase): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const skipped = emptyCounts();
  const found = Object.fromEntries(COLLECTIONS.map((name) => [name, source[name].length])) as Counts;

  requireFields('admins', source.admins, ['id', 'username', 'passwordHash', 'name', 'role'], errors);
  requireFields('product_categories', source.product_categories, ['id', 'slug', 'name_en', 'name_am'], errors);
  requireFields('products', source.products, ['id', 'category_id', 'slug', 'title_en', 'title_am'], errors);
  requireFields('services', source.services, ['id', 'slug', 'title_en', 'title_am'], errors);
  requireFields('news_posts', source.news_posts, ['id', 'slug', 'title_en', 'title_am'], errors);
  requireFields('gallery_images', source.gallery_images, ['id', 'title_en', 'title_am', 'image_url'], errors);
  requireFields('inquiries', source.inquiries, ['id', 'company_name', 'contact_name', 'email', 'message'], errors);
  requireFields('newsletter_subscribers', source.newsletter_subscribers, ['id', 'email'], errors);
  requireFields('site_settings', source.site_settings, ['key'], errors);

  for (const name of COLLECTIONS.filter((name) => name !== 'site_settings')) {
    findDuplicates(name, source[name], 'id', errors);
  }
  findDuplicates('site_settings', source.site_settings, 'key', errors);
  findDuplicates('product_categories', source.product_categories, 'slug', errors, true);
  findDuplicates('products', source.products, 'slug', errors, true);
  findDuplicates('services', source.services, 'slug', errors, true);
  findDuplicates('news_posts', source.news_posts, 'slug', errors, true);
  findDuplicates('admins', source.admins, 'username', errors, true);
  findDuplicates('admins', source.admins, 'email', errors, true);

  const categoryIds = new Set(source.product_categories.map((item) => asString(item.id)));
  const productIds = new Set(source.products.map((item) => asString(item.id)));

  for (const [index, product] of source.products.entries()) {
    const categoryId = asString(product.category_id);
    if (categoryId && !categoryIds.has(categoryId)) {
      errors.push(`products[${index}] (${asString(product.id)}) references missing category_id "${categoryId}".`);
    }
  }

  const subscriberEmails = new Map<string, number>();
  const subscribers: JsonRecord[] = source.newsletter_subscribers.flatMap((subscriber, index): JsonRecord[] => {
    const email = asString(subscriber.email).trim().toLowerCase();
    const firstIndex = subscriberEmails.get(email);
    if (firstIndex !== undefined) {
      warnings.push(`newsletter_subscribers duplicate email "${email}" at indexes ${firstIndex} and ${index}; index ${index} will be skipped.`);
      skipped.newsletter_subscribers += 1;
      return [];
    }
    subscriberEmails.set(email, index);
    return [{ ...subscriber, email }];
  });

  const inquiries: JsonRecord[] = source.inquiries.map((inquiry, index): JsonRecord => {
    const requestedProductId = asString(inquiry.product_id).trim();
    let productId: string | null = requestedProductId || null;
    if (productId && !productIds.has(productId)) {
      warnings.push(`inquiries[${index}] (${asString(inquiry.id)}) references missing product_id "${productId}"; it will be imported as null.`);
      productId = null;
    }
    return { ...inquiry, product_id: productId, email: asString(inquiry.email).trim() };
  });

  const products = source.products.map((product, index) => ({
    ...product,
    created_at: parseDate(product.created_at, `products[${index}].created_at`, errors),
  }));
  const news = source.news_posts.map((post, index) => ({
    ...post,
    published_at: parseDate(post.published_at, `news_posts[${index}].published_at`, errors),
  }));
  const preparedInquiries = inquiries.map((inquiry, index) => ({
    ...inquiry,
    created_at: parseDate(inquiry.created_at, `inquiries[${index}].created_at`, errors),
  }));
  const preparedSubscribers = subscribers.map((subscriber, index) => ({
    ...subscriber,
    created_at: parseDate(subscriber.created_at, `newsletter_subscribers[${index}].created_at`, errors),
  }));

  return {
    found,
    warnings,
    errors,
    skipped,
    prepared: {
      ...source,
      products,
      news_posts: news,
      inquiries: preparedInquiries,
      newsletter_subscribers: preparedSubscribers,
    },
  };
}

function printCounts(title: string, counts: Counts) {
  console.log(`\n${title}`);
  for (const name of COLLECTIONS) console.log(`  ${name}: ${counts[name]}`);
}

function printMessages(title: string, messages: string[]) {
  console.log(`\n${title}: ${messages.length}`);
  if (messages.length === 0) console.log('  None');
  else messages.forEach((message) => console.log(`  - ${message}`));
}

function mysqlConfigFromUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql:// protocol.');
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!url.hostname || !url.username || !database) {
    throw new Error('DATABASE_URL must include host, username, and database name.');
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
  };
}

async function importToMySql(data: PreparedDatabase): Promise<Counts> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for a real import.');

  const [{ PrismaMariaDb }, { PrismaClient }] = await Promise.all([
    import('@prisma/adapter-mariadb'),
    import('../generated/prisma/client.js'),
  ]);
  const adapter = new PrismaMariaDb(mysqlConfigFromUrl(databaseUrl));
  const prisma = new PrismaClient({ adapter });
  const imported = emptyCounts();

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of data.admins) {
        const record = {
          id: asString(item.id), username: asString(item.username), passwordHash: asString(item.passwordHash),
          email: asString(item.email).trim().toLowerCase() || null,
          name: asString(item.name), role: asString(item.role),
        };
        await tx.admin.upsert({ where: { id: record.id }, create: record, update: record });
        imported.admins += 1;
      }
      for (const item of data.product_categories) {
        const record = {
          id: asString(item.id), slug: asString(item.slug), name_en: asString(item.name_en), name_am: asString(item.name_am),
          description_en: asString(item.description_en), description_am: asString(item.description_am),
        };
        await tx.productCategory.upsert({ where: { id: record.id }, create: record, update: record });
        imported.product_categories += 1;
      }
      for (const item of data.products) {
        const record = {
          id: asString(item.id), category_id: asString(item.category_id), slug: asString(item.slug),
          title_en: asString(item.title_en), title_am: asString(item.title_am), description_en: asString(item.description_en),
          description_am: asString(item.description_am), content_en: asString(item.content_en), content_am: asString(item.content_am),
          origin_en: asString(item.origin_en), origin_am: asString(item.origin_am), grade_en: asString(item.grade_en),
          grade_am: asString(item.grade_am), processing_en: asString(item.processing_en), processing_am: asString(item.processing_am),
          packaging_en: asString(item.packaging_en), packaging_am: asString(item.packaging_am),
          availability_en: asString(item.availability_en), availability_am: asString(item.availability_am),
          price_en: asString(item.price_en), price_am: asString(item.price_am), image_url: asString(item.image_url),
          elevation: asString(item.elevation), is_featured: asBoolean(item.is_featured), created_at: item.created_at as Date,
        };
        await tx.product.upsert({ where: { id: record.id }, create: record, update: record });
        imported.products += 1;
      }
      for (const item of data.services) {
        const record = {
          id: asString(item.id), slug: asString(item.slug), title_en: asString(item.title_en), title_am: asString(item.title_am),
          description_en: asString(item.description_en), description_am: asString(item.description_am),
          content_en: asString(item.content_en), content_am: asString(item.content_am),
          icon_name: asString(item.icon_name), image_url: asString(item.image_url),
        };
        await tx.service.upsert({ where: { id: record.id }, create: record, update: record });
        imported.services += 1;
      }
      for (const item of data.news_posts) {
        const record = {
          id: asString(item.id), slug: asString(item.slug), title_en: asString(item.title_en), title_am: asString(item.title_am),
          excerpt_en: asString(item.excerpt_en), excerpt_am: asString(item.excerpt_am), content_en: asString(item.content_en),
          content_am: asString(item.content_am), category_en: asString(item.category_en), category_am: asString(item.category_am),
          image_url: asString(item.image_url), author_en: asString(item.author_en), author_am: asString(item.author_am),
          published_at: item.published_at as Date,
        };
        await tx.newsPost.upsert({ where: { id: record.id }, create: record, update: record });
        imported.news_posts += 1;
      }
      for (const item of data.gallery_images) {
        const record = {
          id: asString(item.id), category_en: asString(item.category_en), category_am: asString(item.category_am),
          title_en: asString(item.title_en), title_am: asString(item.title_am), image_url: asString(item.image_url),
          description_en: asString(item.description_en), description_am: asString(item.description_am),
        };
        await tx.galleryImage.upsert({ where: { id: record.id }, create: record, update: record });
        imported.gallery_images += 1;
      }
      for (const item of data.inquiries) {
        const record = {
          id: asString(item.id), company_name: asString(item.company_name), contact_name: asString(item.contact_name),
          email: asString(item.email), phone: asString(item.phone), country: asString(item.country),
          product_id: item.product_id as string | null, coffee_type: asString(item.coffee_type),
          volume_required: asString(item.volume_required), target_price: asString(item.target_price),
          message: asString(item.message), status: asString(item.status) || 'new', created_at: item.created_at as Date,
        };
        await tx.inquiry.upsert({ where: { id: record.id }, create: record, update: record });
        imported.inquiries += 1;
      }
      for (const item of data.newsletter_subscribers) {
        const record = { id: asString(item.id), email: asString(item.email), created_at: item.created_at as Date };
        await tx.newsletterSubscriber.upsert({ where: { email: record.email }, create: record, update: record });
        imported.newsletter_subscribers += 1;
      }
      for (const item of data.site_settings) {
        const record = { key: asString(item.key), value_en: asString(item.value_en), value_am: asString(item.value_am) };
        await tx.siteSetting.upsert({ where: { key: record.key }, create: record, update: record });
        imported.site_settings += 1;
      }
    }, { maxWait: 10_000, timeout: 120_000 });
  } finally {
    await prisma.$disconnect();
  }

  return imported;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Konjo Coffee JSON → MySQL importer (${dryRun ? 'DRY RUN' : 'REAL IMPORT'})`);

  const source = readSource();
  const result = validateAndPrepare(source);
  printCounts('Counts found in database.json', result.found);
  printMessages('Warnings', result.warnings);
  printMessages('Critical validation errors', result.errors);
  printCounts('Records skipped during preparation', result.skipped);

  if (result.errors.length > 0) {
    console.error('\nImport stopped: fix all critical validation errors before retrying. No MySQL writes were attempted.');
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log('\nDry run successful. No MySQL connection was opened and no data was written.');
    console.log('Next: run the Prisma migration, then run `npm run prisma:import-json` for the real import.');
    return;
  }

  console.log('\nValidation passed. Starting one transactional MySQL import...');
  const imported = await importToMySql(result.prepared);
  printCounts('Records upserted into MySQL', imported);
  console.log('\nImport completed successfully and the transaction was committed.');
  console.log('Next: inspect the imported records with `npm run prisma:studio`.');
}

main().catch((error: unknown) => {
  console.error('\nImport failed. The transaction was not committed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
