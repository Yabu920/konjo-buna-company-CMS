import path from 'node:path';
import type { Application } from 'express';

export type DataSource = 'json' | 'mysql';

export interface DataSourceConfiguration {
  dataSource: DataSource;
  databaseUrl?: string;
}

function validMysqlUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'mysql:'
      && Boolean(url.hostname)
      && Boolean(url.username)
      && Boolean(url.pathname.replace(/^\//, ''));
  } catch {
    return false;
  }
}

export function resolveDataSourceConfiguration(
  environment: NodeJS.ProcessEnv,
): DataSourceConfiguration {
  const production = environment.NODE_ENV === 'production';
  const requested = environment.DATA_SOURCE?.trim().toLowerCase();

  if (requested !== 'json' && requested !== 'mysql') {
    throw new Error(production
      ? 'Production startup requires DATA_SOURCE=mysql.'
      : 'DATA_SOURCE must be explicitly set to json or mysql.');
  }
  if (production && requested !== 'mysql') {
    throw new Error('Production startup requires DATA_SOURCE=mysql; JSON mode is development-only.');
  }
  if (requested === 'mysql') {
    const databaseUrl = environment.DATABASE_URL?.trim();
    if (!databaseUrl || !validMysqlUrl(databaseUrl)) {
      throw new Error('MySQL mode requires a valid mysql:// DATABASE_URL.');
    }
    return { dataSource: 'mysql', databaseUrl };
  }
  return { dataSource: 'json' };
}

const UNSAFE_PROXY_VALUES = new Set(['true', '*', '0.0.0.0/0', '::/0']);

export function parseTrustProxy(value: string | undefined): false | number | string | string[] {
  const normalized = value?.trim();
  if (!normalized || normalized.toLowerCase() === 'false') return false;
  if (UNSAFE_PROXY_VALUES.has(normalized.toLowerCase())) {
    throw new Error('TRUST_PROXY is too broad. Use a verified hop count, loopback, IP address, or CIDR.');
  }
  if (/^[1-9]\d*$/.test(normalized)) return Number(normalized);

  const entries = normalized.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) return false;
  const validEntry = /^(loopback|linklocal|uniquelocal|\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?|[0-9a-f:]+(?:\/\d{1,3})?)$/i;
  if (!entries.every((entry) => validEntry.test(entry) && !UNSAFE_PROXY_VALUES.has(entry.toLowerCase()))) {
    throw new Error('TRUST_PROXY contains an unsupported value.');
  }
  return entries.length === 1 ? entries[0] : entries;
}

export function configureTrustProxy(app: Application, value: string | undefined): void {
  app.set('trust proxy', parseTrustProxy(value));
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export interface RateLimitConfiguration {
  windowMs: number;
  maxEntries: number;
  loginMax: number;
  recoveryIpMax: number;
  recoveryTargetMax: number;
  inquiryMax: number;
  newsletterMax: number;
}

export function rateLimitConfiguration(environment: NodeJS.ProcessEnv): RateLimitConfiguration {
  return {
    windowMs: positiveInteger(environment.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000, 'RATE_LIMIT_WINDOW_MS'),
    maxEntries: positiveInteger(environment.RATE_LIMIT_MAX_ENTRIES, 10_000, 'RATE_LIMIT_MAX_ENTRIES'),
    loginMax: positiveInteger(environment.LOGIN_RATE_LIMIT_MAX, 10, 'LOGIN_RATE_LIMIT_MAX'),
    recoveryIpMax: positiveInteger(environment.RECOVERY_IP_RATE_LIMIT_MAX, 10, 'RECOVERY_IP_RATE_LIMIT_MAX'),
    recoveryTargetMax: positiveInteger(environment.RECOVERY_TARGET_RATE_LIMIT_MAX, 5, 'RECOVERY_TARGET_RATE_LIMIT_MAX'),
    inquiryMax: positiveInteger(environment.INQUIRY_RATE_LIMIT_MAX, 10, 'INQUIRY_RATE_LIMIT_MAX'),
    newsletterMax: positiveInteger(environment.NEWSLETTER_RATE_LIMIT_MAX, 20, 'NEWSLETTER_RATE_LIMIT_MAX'),
  };
}

export interface UploadConfiguration {
  directory: string;
  publicPath: string;
}

export function uploadConfiguration(environment: NodeJS.ProcessEnv, cwd = process.cwd()): UploadConfiguration {
  const configuredDirectory = environment.UPLOAD_DIR?.trim() || 'uploads';
  const directory = path.isAbsolute(configuredDirectory)
    ? path.normalize(configuredDirectory)
    : path.resolve(cwd, configuredDirectory);

  let publicPath = environment.PUBLIC_UPLOAD_PATH?.trim() || '/uploads';
  if (!publicPath.startsWith('/')) publicPath = `/${publicPath}`;
  publicPath = publicPath.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/uploads';
  if (publicPath.includes('..') || publicPath.includes('\\') || /[?#]/.test(publicPath)) {
    throw new Error('PUBLIC_UPLOAD_PATH must be a safe URL path.');
  }
  return { directory, publicPath };
}
