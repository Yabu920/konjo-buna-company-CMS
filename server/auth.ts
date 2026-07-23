import 'dotenv/config';
import crypto from 'node:crypto';
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import { db } from './db-adapter.js';
import type { Admin, AdminSession } from './db.js';
import { rateLimitConfiguration } from './config.js';
import { hashAdminPassword, verifyStoredAdminPassword } from './password.js';
import { BoundedMemoryRateLimiter, clientIp } from './rate-limit.js';
import { safeLogError } from './safe-log.js';

export interface SafeAdmin {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
}

export interface AdminRequest extends Request {
  admin?: SafeAdmin;
  adminSession?: AdminSession;
}

export const SESSION_COOKIE_NAME = 'konjo_session';
export const CSRF_COOKIE_NAME = 'konjo_csrf';
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const REMEMBER_SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const RECENT_PASSWORD_MS = 10 * 60 * 1000;

const secureCookies = process.env.NODE_ENV === 'production';

export const toSafeAdmin = (admin: Admin): SafeAdmin => ({
  id: admin.id,
  username: admin.username,
  email: admin.email ?? null,
  name: admin.name,
  role: admin.role,
});

export function isSuperAdminRole(role: string | undefined): boolean {
  return role?.trim().toLowerCase().replace(/\s+/g, '') === 'superadmin';
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function parseCookies(req: Request): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function baseCookieOptions(httpOnly: boolean): CookieOptions {
  return { httpOnly, secure: secureCookies, sameSite: 'lax', path: '/' };
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions(true));
  res.clearCookie(CSRF_COOKIE_NAME, baseCookieOptions(false));
}

export async function createAdminSession(res: Response, admin: Admin, rememberMe: boolean): Promise<void> {
  const now = new Date();
  const duration = rememberMe ? REMEMBER_SESSION_ABSOLUTE_MS : SESSION_ABSOLUTE_MS;
  const sessionToken = randomToken();
  const csrfToken = randomToken();
  await db.createAdminSession({
    admin_id: admin.id,
    token_hash: hashOpaqueToken(sessionToken),
    csrf_hash: hashOpaqueToken(csrfToken),
    created_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    absolute_expires_at: new Date(now.getTime() + duration).toISOString(),
    remember_me: rememberMe,
    password_confirmed_at: now.toISOString(),
    revoked_at: null,
  });

  const sessionOptions = baseCookieOptions(true);
  const csrfOptions = baseCookieOptions(false);
  if (rememberMe) {
    sessionOptions.maxAge = REMEMBER_SESSION_ABSOLUTE_MS;
    csrfOptions.maxAge = REMEMBER_SESSION_ABSOLUTE_MS;
  }
  res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionOptions);
  // This is a synchronizer value, not an authentication credential.
  res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfOptions);
}

export async function verifyAdminPassword(admin: Admin, password: string): Promise<boolean> {
  const isLegacyHash = !admin.passwordHash.startsWith('$2');
  if (!await verifyStoredAdminPassword(password, admin.passwordHash)) return false;
  if (!isLegacyHash) return true;

  try {
    await db.updateAdminPassword(admin.id, await hashAdminPassword(password));
  } catch (error) {
    safeLogError('Unable to upgrade legacy admin password hash.', error, { adminId: admin.id });
  }
  return true;
}

async function loadAdminSession(req: AdminRequest, res: Response): Promise<boolean> {
  const rawToken = parseCookies(req)[SESSION_COOKIE_NAME];
  if (!rawToken) return false;

  const session = await db.getAdminSessionByTokenHash(hashOpaqueToken(rawToken));
  if (!session || session.revoked_at) return false;

  const now = Date.now();
  const inactiveSince = new Date(session.last_activity_at).getTime();
  const absoluteExpiry = new Date(session.absolute_expires_at).getTime();
  if (!Number.isFinite(inactiveSince) || !Number.isFinite(absoluteExpiry)
      || now - inactiveSince > SESSION_INACTIVITY_MS || now >= absoluteExpiry) {
    await db.revokeAdminSession(session.id, new Date(now).toISOString());
    clearSessionCookies(res);
    return false;
  }

  const admin = await db.getAdminById(session.admin_id);
  if (!admin) {
    await db.revokeAdminSession(session.id, new Date(now).toISOString());
    clearSessionCookies(res);
    return false;
  }

  const touched = await db.touchAdminSession(session.id, new Date(now).toISOString());
  if (!touched) return false;
  req.admin = toSafeAdmin(admin);
  req.adminSession = touched;
  return true;
}

export const requireAdmin: RequestHandler = async (req: AdminRequest, res, next) => {
  try {
    if (!await loadAdminSession(req, res)) {
      clearSessionCookies(res);
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireCsrf: RequestHandler = (req: AdminRequest, res, next) => {
  const headerToken = req.get('X-CSRF-Token')?.trim();
  const cookieToken = parseCookies(req)[CSRF_COOKIE_NAME];
  if (!headerToken || !cookieToken || !req.adminSession
      || !constantTimeEqual(headerToken, cookieToken)
      || !constantTimeEqual(hashOpaqueToken(headerToken), req.adminSession.csrf_hash)) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }
  next();
};

export const requireSuperAdmin: RequestHandler = (req: AdminRequest, res, next) => {
  if (!req.admin || !isSuperAdminRole(req.admin.role)) {
    res.status(403).json({ error: 'Super Admin permission required' });
    return;
  }
  next();
};

export const requireRecentPassword: RequestHandler = (req: AdminRequest, res, next) => {
  const confirmedAt = req.adminSession?.password_confirmed_at;
  if (!confirmedAt || Date.now() - new Date(confirmedAt).getTime() > RECENT_PASSWORD_MS) {
    res.status(403).json({
      error: 'Recent password confirmation required',
      code: 'RECENT_PASSWORD_REQUIRED',
    });
    return;
  }
  next();
};

const rateConfig = rateLimitConfiguration(process.env);
const loginAttempts = new BoundedMemoryRateLimiter(rateConfig.windowMs, rateConfig.loginMax, rateConfig.maxEntries);
const recoveryIpAttempts = new BoundedMemoryRateLimiter(rateConfig.windowMs, rateConfig.recoveryIpMax, rateConfig.maxEntries);
const recoveryTargetAttempts = new BoundedMemoryRateLimiter(rateConfig.windowMs, rateConfig.recoveryTargetMax, rateConfig.maxEntries);

export const loginRateLimit: RequestHandler = (req, res, next) => {
  const result = loginAttempts.consume(clientIp(req));
  if (!result.allowed) {
    res.set('Retry-After', String(result.retryAfterSeconds));
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    return;
  }
  next();
};

export function allowRecoveryAttempt(req: Request, discriminator: string): boolean {
  const ip = clientIp(req);
  const target = hashOpaqueToken(discriminator);
  return recoveryIpAttempts.consume(ip).allowed
    && recoveryTargetAttempts.consume(`${ip}:${target}`).allowed;
}

export function clearLoginRateLimit(req: Request): void {
  loginAttempts.reset(clientIp(req));
}
