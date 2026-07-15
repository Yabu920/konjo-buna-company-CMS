import bcrypt from 'bcryptjs';
import { verifyPassword as verifyLegacyPassword } from './db.js';

export const MIN_ADMIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

export function isValidAdminPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= MIN_ADMIN_PASSWORD_LENGTH;
}

export function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyStoredAdminPassword(password: string, passwordHash: string): Promise<boolean> {
  if (passwordHash.startsWith('$2')) return bcrypt.compare(password, passwordHash);
  return Promise.resolve(verifyLegacyPassword(password, passwordHash));
}
