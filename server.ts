import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import type { Server } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { activeDataSource, db } from './server/db-adapter.js';
import { configureTrustProxy, rateLimitConfiguration, uploadConfiguration } from './server/config.js';
import { BoundedMemoryRateLimiter, rateLimitMiddleware } from './server/rate-limit.js';
import { safeLogError, safeRequestContext, type RequestWithId } from './server/safe-log.js';
import { decodeImageDataUrl, UploadValidationError } from './server/upload-validation.js';
import {
  allowRecoveryAttempt,
  clearSessionCookies,
  clearLoginRateLimit,
  createAdminSession,
  hashOpaqueToken,
  isSuperAdminRole,
  loginRateLimit,
  requireAdmin,
  requireCsrf,
  requireRecentPassword,
  requireSuperAdmin,
  toSafeAdmin,
  verifyAdminPassword,
  type AdminRequest,
} from './server/auth.js';
import { hashAdminPassword, isValidAdminPassword, MIN_ADMIN_PASSWORD_LENGTH } from './server/password.js';
import { passwordResetUrl, sendPasswordResetEmail } from './server/mailer.js';
import {
  absolutePublicUrl,
  breadcrumbStructuredData,
  canonicalBaseUrl,
  injectSeoDocument,
  organizationStructuredData,
  xmlEscape,
  type SeoDocument,
} from './server/seo.js';

const app = express();
configureTrustProxy(app, process.env.TRUST_PROXY);
const DEFAULT_PORT = 3000;
const MAX_PORT = 3010;
const requestedPort = Number(process.env.PORT ?? NaN);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : DEFAULT_PORT;

const production = process.env.NODE_ENV === 'production';
const hstsEnabled = production && process.env.HSTS_ENABLED?.trim().toLowerCase() === 'true';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "connect-src 'self'",
].join('; ');

app.use((req: RequestWithId, res, next) => {
  req.requestId = crypto.randomUUID();
  res.set({
    'X-Request-ID': req.requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': contentSecurityPolicy,
  });
  if (hstsEnabled) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '10mb' }));
app.use((error: unknown, req: RequestWithId, res: express.Response, next: express.NextFunction) => {
  const parserError = error as { type?: string; status?: number };
  if (parserError.type === 'entity.parse.failed' || parserError.status === 400) {
    safeLogError('Rejected malformed JSON request.', error, safeRequestContext(req));
    res.status(400).json({ error: 'Malformed JSON request' });
    return;
  }
  next(error);
});

// Dynamic API content must not be served from a stale browser/proxy cache.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Runtime uploads may live outside the release directory on persistent storage.
const uploads = uploadConfiguration(process.env);
try {
  fs.mkdirSync(uploads.directory, { recursive: true, mode: 0o750 });
  fs.accessSync(uploads.directory, fs.constants.W_OK);
} catch (error) {
  safeLogError('Configured upload directory is unavailable or not writable.', error);
  throw new Error('UPLOAD_DIR must reference a writable directory.');
}
app.use(uploads.publicPath, express.static(uploads.directory, {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=604800');
  },
}));

type AsyncRoute = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>;
const asyncRoute = (handler: AsyncRoute): express.RequestHandler => (req, res, next) => {
  void Promise.resolve(handler(req, res, next)).catch(next);
};

// Upload endpoint for admins: accepts JSON { filename, data } where data is a data URL (base64).
app.post('/api/admin/upload', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { filename, data } = req.body as { filename?: string; data?: string };
  if (typeof filename !== 'string' || !filename.trim() || typeof data !== 'string') {
    return res.status(400).json({ error: 'filename and data are required' });
  }

  let decoded: ReturnType<typeof decodeImageDataUrl>;
  try {
    decoded = decodeImageDataUrl(data);
  } catch (error) {
    if (error instanceof UploadValidationError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const outName = Date.now() + '-' + crypto.randomUUID() + decoded.extension;
  const outPath = path.resolve(uploads.directory, outName);
  if (path.dirname(outPath) !== uploads.directory) return res.status(400).json({ error: 'Invalid upload path' });
  try {
    await fs.promises.writeFile(outPath, decoded.buffer, { flag: 'wx', mode: 0o640 });
    const url = `${uploads.publicPath}/${outName}`;
    res.json({ url });
  } catch (error) {
    safeLogError('Unable to save uploaded image.', error, safeRequestContext(req as RequestWithId));
    res.status(500).json({ error: 'Failed to save file' });
  }
}));

const publicRateConfig = rateLimitConfiguration(process.env);
const inquiryRateLimiter = new BoundedMemoryRateLimiter(
  publicRateConfig.windowMs,
  publicRateConfig.inquiryMax,
  publicRateConfig.maxEntries,
);
const newsletterRateLimiter = new BoundedMemoryRateLimiter(
  publicRateConfig.windowMs,
  publicRateConfig.newsletterMax,
  publicRateConfig.maxEntries,
);

function requiredText(value: unknown, maximum: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : undefined;
}

function optionalText(value: unknown, maximum: number): string | undefined {
  if (value === undefined || value === null || value === '') return '';
  return requiredText(value, maximum);
}

function normalizedEmail(value: unknown): string | undefined {
  const email = requiredText(value, 320)?.toLowerCase();
  return email && EMAIL_PATTERN.test(email) ? email : undefined;
}

// --- API ENDPOINTS ---

app.get('/api/health', asyncRoute(async (req, res) => {
  try {
    await db.getSettings();
    res.json({ status: 'ok', database: 'ready' });
  } catch (error) {
    safeLogError('Health check database readiness failed.', error, safeRequestContext(req as RequestWithId));
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
}));

// 1. Authentication
app.post('/api/auth/login', loginRateLimit, asyncRoute(async (req, res) => {
  const { username, password, remember_me } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const admin = await db.getAdminByUsername(username);
  if (!admin || !await verifyAdminPassword(admin, password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  clearLoginRateLimit(req);
  await createAdminSession(res, admin, remember_me === true);
  res.json({
    user: toSafeAdmin(admin),
  });
}));

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ user: (req as AdminRequest).admin });
});

app.get('/api/auth/verify', requireAdmin, (req, res) => {
  res.json({ valid: true, user: (req as AdminRequest).admin });
});

app.post('/api/auth/logout', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const session = (req as AdminRequest).adminSession!;
  await db.revokeAdminSession(session.id, new Date().toISOString());
  clearSessionCookies(res);
  res.json({ success: true });
}));

app.post('/api/auth/confirm-password', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const current = (req as AdminRequest).admin!;
  const password = req.body.password;
  if (typeof password !== 'string' || !password) return res.status(400).json({ error: 'Password is required' });
  const admin = await db.getAdminById(current.id);
  if (!admin || !await verifyAdminPassword(admin, password)) {
    return res.status(400).json({ error: 'Password is incorrect' });
  }
  await db.confirmAdminSession((req as AdminRequest).adminSession!.id, new Date().toISOString());
  res.json({ success: true, message: 'Password confirmed' });
}));

const RECOVERY_GENERIC_MESSAGE = 'If an eligible account exists, a reset link has been sent.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/auth/forgot-password', asyncRoute(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  res.json({ message: RECOVERY_GENERIC_MESSAGE });
  if (!EMAIL_PATTERN.test(email) || !allowRecoveryAttempt(req, email)) return;

  void (async () => {
    const admin = await db.getAdminByEmail(email);
    if (!admin || !isSuperAdminRole(admin.role)) return;
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const now = new Date();
    await db.createPasswordResetToken({
      admin_id: admin.id,
      token_hash: hashOpaqueToken(rawToken),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 20 * 60 * 1000).toISOString(),
      used_at: null,
    });
    await sendPasswordResetEmail(admin.email!, passwordResetUrl(rawToken));
  })().catch(error => safeLogError('Unable to complete password recovery delivery.', error, safeRequestContext(req as RequestWithId)));
}));

app.post('/api/auth/reset-password', asyncRoute(async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const password = req.body.password;
  const confirmPassword = req.body.confirm_password;
  if (!allowRecoveryAttempt(req, 'password-reset')) {
    return res.status(429).json({ error: 'Too many reset attempts. Please try again later.' });
  }
  if (!token || !isValidAdminPassword(password) || password !== confirmPassword) {
    return res.status(400).json({ error: 'Invalid reset request or password confirmation' });
  }

  const now = new Date().toISOString();
  const resetToken = await db.consumePasswordResetToken(hashOpaqueToken(token), now);
  if (!resetToken) return res.status(400).json({ error: 'Reset token is invalid or expired' });
  const admin = await db.getAdminById(resetToken.admin_id);
  if (!admin || !isSuperAdminRole(admin.role)) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  await db.updateAdminPassword(admin.id, await hashAdminPassword(password));
  await db.revokeAdminSessionsByAdminId(admin.id, now);
  res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
}));

// Admin users and password management
app.get('/api/admin/users', requireAdmin, requireSuperAdmin, asyncRoute(async (_req, res) => {
  const admins = await db.getAdmins();
  res.json(admins.map(toSafeAdmin));
}));

app.post('/api/admin/users', requireAdmin, requireCsrf, requireSuperAdmin, requireRecentPassword, asyncRoute(async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
  const password = req.body.password;

  if (!username || !EMAIL_PATTERN.test(email) || !name || !role) {
    return res.status(400).json({ error: 'Username, valid email, name, and role are required' });
  }
  if (!isValidAdminPassword(password)) {
    return res.status(400).json({ error: `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters` });
  }
  if (await db.getAdminByUsername(username)) {
    return res.status(409).json({ error: 'An admin with this username already exists' });
  }

  const admin = await db.createAdmin({
    username,
    email,
    name,
    role,
    passwordHash: await hashAdminPassword(password),
  });
  res.status(201).json(toSafeAdmin(admin));
}));

app.put('/api/admin/users/:id', requireAdmin, requireCsrf, requireSuperAdmin, requireRecentPassword, asyncRoute(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!name || !role || !EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Valid email, name, and role are required' });

  const target = await db.getAdminById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Admin user not found' });
  if (isSuperAdminRole(target.role) && !isSuperAdminRole(role) && await db.countSuperAdmins() <= 1) {
    return res.status(409).json({ error: 'The last Super Admin cannot be demoted' });
  }

  const updated = await db.updateAdmin(req.params.id, { name, role, email });
  if (!updated) return res.status(404).json({ error: 'Admin user not found' });
  res.json(toSafeAdmin(updated));
}));

app.delete('/api/admin/users/:id', requireAdmin, requireCsrf, requireSuperAdmin, requireRecentPassword, asyncRoute(async (req, res) => {
  const currentAdmin = (req as AdminRequest).admin!;
  if (currentAdmin.id === req.params.id) {
    return res.status(409).json({ error: 'You cannot delete your own admin account' });
  }

  const target = await db.getAdminById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Admin user not found' });
  if (isSuperAdminRole(target.role) && await db.countSuperAdmins() <= 1) {
    return res.status(409).json({ error: 'The last Super Admin cannot be deleted' });
  }

  if (!await db.deleteAdmin(req.params.id)) return res.status(404).json({ error: 'Admin user not found' });
  res.json({ success: true, message: 'Admin user deleted' });
}));

app.patch('/api/admin/users/:id/password', requireAdmin, requireCsrf, requireSuperAdmin, requireRecentPassword, asyncRoute(async (req, res) => {
  const password = req.body.password;
  if (!isValidAdminPassword(password)) {
    return res.status(400).json({ error: `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters` });
  }
  if (!await db.getAdminById(req.params.id)) return res.status(404).json({ error: 'Admin user not found' });

  await db.updateAdminPassword(req.params.id, await hashAdminPassword(password));
  await db.revokeAdminSessionsByAdminId(req.params.id, new Date().toISOString());
  res.json({ success: true, message: 'Password reset successfully' });
}));

app.patch('/api/admin/me/password', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const currentAdmin = (req as AdminRequest).admin!;
  const currentPassword = req.body.current_password;
  const newPassword = req.body.new_password;
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (!isValidAdminPassword(newPassword)) {
    return res.status(400).json({ error: `New password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters` });
  }

  const admin = await db.getAdminById(currentAdmin.id);
  if (!admin) return res.status(401).json({ error: 'Admin account is no longer available' });
  if (!await verifyAdminPassword(admin, currentPassword)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  await db.updateAdminPassword(admin.id, await hashAdminPassword(newPassword));
  await db.revokeAdminSessionsByAdminId(admin.id, new Date().toISOString());
  clearSessionCookies(res);
  res.json({ success: true, session_revoked: true, message: 'Your password was changed successfully. Please sign in again.' });
}));

// 2. Categories
app.get('/api/categories', asyncRoute(async (req, res) => {
  res.json(await db.getCategories());
}));

app.post('/api/categories', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { slug, name_en, name_am, description_en, description_am } = req.body;
  if (!slug || !name_en || !name_am) {
    return res.status(400).json({ error: 'Slug and both English/Amharic names are required' });
  }
  const newCat = await db.createCategory({ slug, name_en, name_am, description_en, description_am });
  res.status(201).json(newCat);
}));

app.put('/api/categories/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const updated = await db.updateCategory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json(updated);
}));

app.delete('/api/categories/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteCategory(req.params.id);
  if (!success) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
}));

// 3. Products
app.get('/api/products', asyncRoute(async (req, res) => {
  const { category, search, featured } = req.query;
  let products = await db.getProducts();

  if (featured === 'true') {
    products = products.filter(p => p.is_featured);
  }
  if (category) {
    products = products.filter(p => p.category_id === category);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    products = products.filter(p => 
      p.title_en.toLowerCase().includes(q) || 
      p.title_am.toLowerCase().includes(q) ||
      p.description_en.toLowerCase().includes(q) ||
      p.description_am.toLowerCase().includes(q) ||
      p.origin_en.toLowerCase().includes(q) ||
      p.origin_am.toLowerCase().includes(q)
    );
  }
  res.json(products);
}));

app.get('/api/products/:slugOrId', asyncRoute(async (req, res) => {
  const { slugOrId } = req.params;
  const product = await db.getProductBySlug(slugOrId) || await db.getProductById(slugOrId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

app.post('/api/products', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const {
    category_id, slug, title_en, title_am, description_en, description_am,
    content_en, content_am, origin_en, origin_am, grade_en, grade_am,
    processing_en, processing_am, packaging_en, packaging_am,
    availability_en, availability_am, price_en, price_am,
    image_url, elevation, is_featured
  } = req.body;

  if (!category_id || !slug || !title_en || !title_am) {
    return res.status(400).json({ error: 'Category, slug, and titles in both languages are required' });
  }

  const newProd = await db.createProduct({
    category_id, slug, title_en, title_am, description_en, description_am,
    content_en, content_am, origin_en, origin_am, grade_en, grade_am,
    processing_en, processing_am, packaging_en, packaging_am,
    availability_en, availability_am, price_en, price_am,
    image_url: image_url || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800',
    elevation: elevation || '1,800m',
    is_featured: !!is_featured
  });
  res.status(201).json(newProd);
}));

app.put('/api/products/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const updated = await db.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  res.json(updated);
}));

app.delete('/api/products/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteProduct(req.params.id);
  if (!success) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
}));

// 4. Services
app.get('/api/services', asyncRoute(async (req, res) => {
  res.json(await db.getServices());
}));

app.get('/api/services/:slug', asyncRoute(async (req, res) => {
  const service = await db.getServiceBySlug(req.params.slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
}));

app.post('/api/services', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { slug, title_en, title_am, description_en, description_am, content_en, content_am, icon_name, image_url } = req.body;
  if (!slug || !title_en || !title_am) {
    return res.status(400).json({ error: 'Slug and bilingual titles are required' });
  }
  const newService = await db.createService({
    slug, title_en, title_am, description_en, description_am, content_en, content_am,
    icon_name: icon_name || 'Layers',
    image_url: image_url || 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=800'
  });
  res.status(201).json(newService);
}));

app.put('/api/services/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const updated = await db.updateService(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Service not found' });
  res.json(updated);
}));

app.delete('/api/services/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteService(req.params.id);
  if (!success) return res.status(404).json({ error: 'Service not found' });
  res.json({ success: true });
}));

// 5. News
app.get('/api/news', asyncRoute(async (req, res) => {
  const { search } = req.query;
  let posts = await db.getNewsPosts();
  if (search) {
    const q = (search as string).toLowerCase();
    posts = posts.filter(p =>
      p.title_en.toLowerCase().includes(q) ||
      p.title_am.toLowerCase().includes(q) ||
      p.excerpt_en.toLowerCase().includes(q) ||
      p.excerpt_am.toLowerCase().includes(q)
    );
  }
  res.json(posts);
}));

app.get('/api/news/:slug', asyncRoute(async (req, res) => {
  const post = await db.getNewsPostBySlug(req.params.slug)
    || (await db.getNewsPosts()).find(candidate => candidate.id === req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
}));

app.post('/api/news', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { slug, title_en, title_am, excerpt_en, excerpt_am, content_en, content_am, category_en, category_am, image_url, author_en, author_am } = req.body;
  if (!slug || !title_en || !title_am) {
    return res.status(400).json({ error: 'Slug and bilingual titles are required' });
  }
  const newPost = await db.createNewsPost({
    slug, title_en, title_am, excerpt_en, excerpt_am, content_en, content_am, category_en, category_am,
    image_url: image_url || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800',
    author_en: author_en || 'Konjo Press Team',
    author_am: author_am || 'የኮንጆ ጋዜጠኛ ክፍል'
  });
  res.status(201).json(newPost);
}));

app.put('/api/news/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const updated = await db.updateNewsPost(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Post not found' });
  res.json(updated);
}));

app.delete('/api/news/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteNewsPost(req.params.id);
  if (!success) return res.status(404).json({ error: 'Post not found' });
  res.json({ success: true });
}));

// 6. Gallery
app.get('/api/gallery', asyncRoute(async (req, res) => {
  res.json(await db.getGalleryImages());
}));

app.post('/api/gallery', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { category_en, category_am, title_en, title_am, image_url, description_en, description_am } = req.body;
  if (!image_url || !title_en || !title_am) {
    return res.status(400).json({ error: 'Image URL and bilingual titles are required' });
  }
  const newImg = await db.createGalleryImage({
    category_en: category_en || 'General',
    category_am: category_am || 'ጠቅላላ',
    title_en, title_am, image_url, description_en, description_am
  });
  res.status(201).json(newImg);
}));

app.put('/api/gallery/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const updated = await db.updateGalleryImage(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Gallery item not found' });
  res.json(updated);
}));

app.delete('/api/gallery/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteGalleryImage(req.params.id);
  if (!success) return res.status(404).json({ error: 'Gallery item not found' });
  res.json({ success: true });
}));

// 7. Inquiries
app.get('/api/inquiries', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await db.getInquiries());
}));

app.post('/api/inquiries', rateLimitMiddleware(
  inquiryRateLimiter,
  'Too many inquiry requests. Please try again later.',
), asyncRoute(async (req, res) => {
  const company_name = requiredText(req.body.company_name, 255);
  const contact_name = requiredText(req.body.contact_name, 255);
  const email = normalizedEmail(req.body.email);
  const phone = optionalText(req.body.phone, 100);
  const country = optionalText(req.body.country, 191);
  const product_id = optionalText(req.body.product_id, 191);
  const coffee_type = optionalText(req.body.coffee_type, 255);
  const volume_required = optionalText(req.body.volume_required, 191);
  const target_price = optionalText(req.body.target_price, 191);
  const message = requiredText(req.body.message, 10_000);
  if (!company_name || !contact_name || !email || phone === undefined || country === undefined
      || product_id === undefined || coffee_type === undefined || volume_required === undefined
      || target_price === undefined || !message) {
    return res.status(400).json({ error: 'Invalid inquiry fields' });
  }
  const newInq = await db.createInquiry({
    company_name, contact_name, email,
    phone,
    country,
    product_id,
    coffee_type: coffee_type || 'General Inquiry',
    volume_required,
    target_price,
    message
  });
  res.status(201).json(newInq);
}));

app.put('/api/inquiries/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  const updated = await db.updateInquiryStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Inquiry not found' });
  res.json(updated);
}));

app.delete('/api/inquiries/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteInquiry(req.params.id);
  if (!success) return res.status(404).json({ error: 'Inquiry not found' });
  res.json({ success: true });
}));

// 8. Newsletter
app.get('/api/newsletter', requireAdmin, asyncRoute(async (req, res) => {
  res.json(await db.getNewsletterSubscribers());
}));

app.post('/api/newsletter', rateLimitMiddleware(
  newsletterRateLimiter,
  'Too many subscription requests. Please try again later.',
), asyncRoute(async (req, res) => {
  const email = normalizedEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  await db.subscribeNewsletter(email);
  res.status(201).json({ success: true, message: 'Subscription received' });
}));

app.delete('/api/newsletter/:id', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const success = await db.deleteSubscriber(req.params.id);
  if (!success) return res.status(404).json({ error: 'Subscriber not found' });
  res.json({ success: true });
}));

// 9. Site Settings
app.get('/api/settings', asyncRoute(async (req, res) => {
  res.json(await db.getSettings());
}));

app.post('/api/settings', requireAdmin, requireCsrf, asyncRoute(async (req, res) => {
  const { key, value_en, value_am } = req.body;
  if (!key) return res.status(400).json({ error: 'Setting key is required' });
  const updated = await db.updateSetting(key, value_en, value_am);
  res.json(updated);
}));

// 10. Global Search
app.get('/api/search', asyncRoute(async (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
  if (!q) {
    return res.json({ products: [], services: [], news: [] });
  }
  
  const products = (await db.getProducts()).filter(p =>
    p.title_en.toLowerCase().includes(q) || p.title_am.toLowerCase().includes(q) ||
    p.description_en.toLowerCase().includes(q) || p.description_am.toLowerCase().includes(q) ||
    p.origin_en.toLowerCase().includes(q) || p.origin_am.toLowerCase().includes(q)
  );

  const services = (await db.getServices()).filter(s =>
    s.title_en.toLowerCase().includes(q) || s.title_am.toLowerCase().includes(q) ||
    s.description_en.toLowerCase().includes(q) || s.description_am.toLowerCase().includes(q)
  );

  const news = (await db.getNewsPosts()).filter(n =>
    n.title_en.toLowerCase().includes(q) || n.title_am.toLowerCase().includes(q) ||
    n.excerpt_en.toLowerCase().includes(q) || n.excerpt_am.toLowerCase().includes(q)
  );

  res.json({ products, services, news });
}));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', method: req.method });
});

// Repository/API error boundary. Detailed errors are logged server-side only.
app.use((error: unknown, req: RequestWithId, res: express.Response, _next: express.NextFunction) => {
  const repositoryError = error as { code?: string; message?: string };
  const statusByCode: Record<string, number> = {
    DUPLICATE: 409,
    CATEGORY_IN_USE: 409,
    NOT_FOUND: 404,
    INVALID_CATEGORY: 400,
    INVALID_RELATION: 400,
    INVALID_INQUIRY_STATUS: 400,
  };
  const status = repositoryError.code ? statusByCode[repositoryError.code] : undefined;

  if (status) {
    return res.status(status).json({ error: repositoryError.message || 'Database operation rejected' });
  }

  safeLogError('Unhandled API error.', error, safeRequestContext(req));
  return res.status(500).json({ error: 'Internal server error' });
});

// --- VITE DEV SERVER OR PRODUCTION DIST SERVING ---

const publicRouteSeo: Record<string, Pick<SeoDocument, 'title' | 'description'>> = {
  '/': {
    title: 'Konjo Buna | Premium Ethiopian Coffee',
    description: 'Carefully selected Ethiopian coffee from Sidama, Yirgacheffe and other renowned origins.',
  },
  '/about': {
    title: 'About Konjo Buna',
    description: 'Learn about Konjo Buna, our Ethiopian coffee heritage, values and quality-focused processing.',
  },
  '/products': {
    title: 'Ethiopian Coffee Products | Konjo Buna',
    description: 'Explore Konjo Buna Ethiopian coffee products, origins, grades, processing and export availability.',
  },
  '/services': {
    title: 'Coffee Services | Konjo Buna',
    description: 'Discover Konjo Buna coffee processing, packaging, sourcing and export services.',
  },
  '/news': {
    title: 'Coffee News | Konjo Buna',
    description: 'Read the latest Konjo Buna company and Ethiopian coffee news.',
  },
  '/gallery': {
    title: 'Coffee Gallery | Konjo Buna',
    description: 'View Konjo Buna coffee products, processing, facilities and Ethiopian coffee culture.',
  },
  '/contact': {
    title: 'Contact and Export Inquiry | Konjo Buna',
    description: 'Contact Konjo Buna for Ethiopian coffee, wholesale and export inquiries.',
  },
  '/faq': {
    title: 'Frequently Asked Questions | Konjo Buna',
    description: 'Answers to common questions about Konjo Buna coffee products and export services.',
  },
  '/search': {
    title: 'Search | Konjo Buna',
    description: 'Search Konjo Buna products, services and news.',
  },
  '/admin': {
    title: 'CMS Admin | Konjo Buna',
    description: 'Secure Konjo Buna content administration.',
  },
  '/admin/reset-password': {
    title: 'Reset CMS Password | Konjo Buna',
    description: 'Secure Konjo Buna CMS password reset.',
  },
};

const routeKey = (pathname: string, prefix: string): string | undefined => {
  const match = new RegExp(`^${prefix}/([^/]+)$`).exec(pathname);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};

async function seoForRoute(pathname: string, baseUrl: string): Promise<SeoDocument | undefined> {
  const staticSeo = publicRouteSeo[pathname];
  if (staticSeo) {
    const crumbs = pathname === '/'
      ? [{ name: 'Home', path: '/' }]
      : [{ name: 'Home', path: '/' }, { name: staticSeo.title.replace(/ \|.*$/, ''), path: pathname }];
    return {
      ...staticSeo,
      canonicalUrl: `${baseUrl}${pathname === '/' ? '' : pathname}`,
      noIndex: pathname.startsWith('/admin') || pathname === '/search',
      structuredData: [organizationStructuredData(baseUrl), breadcrumbStructuredData(baseUrl, crumbs)],
    };
  }

  const productKey = routeKey(pathname, '/products');
  if (productKey) {
    const product = await db.getProductBySlug(productKey) || await db.getProductById(productKey);
    if (!product) return undefined;
    const canonicalPath = `/products/${encodeURIComponent(product.slug)}`;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    const imageUrl = absolutePublicUrl(product.image_url, baseUrl);
    return {
      title: `${product.title_en} | Konjo Buna`,
      description: product.description_en,
      canonicalUrl,
      imageUrl,
      type: 'product',
      structuredData: [
        organizationStructuredData(baseUrl),
        breadcrumbStructuredData(baseUrl, [
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
          { name: product.title_en, path: canonicalPath },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title_en,
          description: product.description_en,
          image: imageUrl,
          sku: product.id,
          brand: { '@type': 'Brand', name: 'Konjo Buna' },
          countryOfOrigin: 'Ethiopia',
          url: canonicalUrl,
        },
      ],
    };
  }

  const newsKey = routeKey(pathname, '/news');
  if (newsKey) {
    const post = await db.getNewsPostBySlug(newsKey)
      || (await db.getNewsPosts()).find(candidate => candidate.id === newsKey);
    if (!post) return undefined;
    const canonicalPath = `/news/${encodeURIComponent(post.slug)}`;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    const imageUrl = absolutePublicUrl(post.image_url, baseUrl);
    return {
      title: `${post.title_en} | Konjo Buna`,
      description: post.excerpt_en,
      canonicalUrl,
      imageUrl,
      type: 'article',
      structuredData: [
        organizationStructuredData(baseUrl),
        breadcrumbStructuredData(baseUrl, [
          { name: 'Home', path: '/' },
          { name: 'News', path: '/news' },
          { name: post.title_en, path: canonicalPath },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title_en,
          description: post.excerpt_en,
          image: imageUrl,
          datePublished: post.published_at,
          author: { '@type': 'Organization', name: post.author_en || 'Konjo Buna' },
          publisher: { '@type': 'Organization', name: 'Konjo Buna', logo: { '@type': 'ImageObject', url: `${baseUrl}/favicon.svg` } },
          mainEntityOfPage: canonicalUrl,
        },
      ],
    };
  }
  return undefined;
}

function requestBaseUrl(req: express.Request): string {
  return canonicalBaseUrl(process.env.APP_URL, `${req.protocol}://${req.get('host') ?? 'localhost'}`);
}

function notFoundHtml(baseUrl: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page Not Found | Konjo Buna</title><link rel="canonical" href="${baseUrl}/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"></head><body style="font-family:system-ui;background:#F8F1E7;color:#2D2A26;margin:0;display:grid;min-height:100vh;place-items:center"><main style="text-align:center;padding:2rem"><h1>Page not found</h1><p>The page you requested does not exist.</p><a href="/" style="color:#7E4015">Return to Konjo Buna</a></main></body></html>`;
}

let httpServer: Server | undefined;
let shuttingDown = false;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Integrate Vite development server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server loaded as middleware');
  } else {
    // Serve compiled files in production
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    let indexTemplatePromise: Promise<string> | undefined;
    const indexTemplate = () => indexTemplatePromise ??= fs.promises.readFile(indexPath, 'utf8');

    app.get('/robots.txt', (req, res) => {
      const baseUrl = requestBaseUrl(req);
      res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${baseUrl}/sitemap.xml\n`);
    });
    app.get('/sitemap.xml', asyncRoute(async (req, res) => {
      const baseUrl = requestBaseUrl(req);
      const [products, posts] = await Promise.all([db.getProducts(), db.getNewsPosts()]);
      const paths = [
        '/', '/about', '/products', '/services', '/news', '/gallery', '/contact', '/faq',
        ...products.map(product => `/products/${encodeURIComponent(product.slug)}`),
        ...posts.map(post => `/news/${encodeURIComponent(post.slug)}`),
      ];
      const urls = paths.map(route => `<url><loc>${xmlEscape(`${baseUrl}${route === '/' ? '' : route}`)}</loc></url>`).join('');
      res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
    }));

    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (/[\\/]assets[\\/].+-[A-Za-z0-9_-]+\.[^.]+$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    }));
    app.get('*', asyncRoute(async (req, res) => {
      const baseUrl = requestBaseUrl(req);
      const seo = await seoForRoute(req.path, baseUrl);
      if (!seo) return res.status(404).type('html').send(notFoundHtml(baseUrl));
      const html = injectSeoDocument(await indexTemplate(), seo);
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(html);
    }));
    app.use((error: unknown, req: RequestWithId, res: express.Response, _next: express.NextFunction) => {
      safeLogError(`Production page request failed${req.requestId ? ` (${req.requestId})` : ''}.`, error);
      if (res.headersSent) return;
      res.status(500).type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Server error | Konjo Buna</title></head><body><main><h1>Something went wrong</h1><p>Please try again later.</p></main></body></html>');
    });
    console.log('Production server serving static assets from dist/');
  }

  const bindPort = async (port: number) => {
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Konjo Coffee Server running on http://0.0.0.0:${port}`);
        resolve();
      });
      httpServer = server;
      server.on('error', reject);
    });
  };

  let currentPort = PORT;
  while (true) {
    try {
      await bindPort(currentPort);
      break;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        if (process.env.PORT) {
          console.error(`Port ${currentPort} is already in use. Set a different PORT environment variable or stop the process using it.`);
          process.exit(1);
        }

        if (currentPort < MAX_PORT) {
          console.warn(`Port ${currentPort} is in use, trying port ${currentPort + 1}...`);
          currentPort += 1;
          continue;
        }

        console.error(`Ports ${DEFAULT_PORT}-${MAX_PORT} are all in use. Please set PORT to an open port.`);
        process.exit(1);
      }
      throw err;
    }
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; closing the Konjo Coffee server.`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  try {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
    }
    if (activeDataSource === 'mysql') {
      const { prisma } = await import('./server/prisma.js');
      await prisma.$disconnect();
    }
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    safeLogError('Graceful shutdown failed.', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => void gracefulShutdown('SIGINT'));

void startServer();
