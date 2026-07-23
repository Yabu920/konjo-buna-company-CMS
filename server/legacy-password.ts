import crypto from 'node:crypto';

// Read-only compatibility for hashes imported from the original JSON database.
// New and bootstrap passwords always use bcrypt.
const LEGACY_SALT = 'konjo_coffee_salt_2026';

export function verifyLegacyPassword(password: string, hash: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(hash)) return false;
  const actual = crypto.pbkdf2Sync(password, LEGACY_SALT, 1000, 64, 'sha512');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
