import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { db } from '../server/db-adapter.js';
import { isSuperAdminRole } from '../server/auth.js';
import { passwordResetUrl, sendPasswordResetEmail } from '../server/mailer.js';

const REQUIRED_ENV = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
] as const;

type SafeSmtpError = Error & {
  code?: unknown;
  responseCode?: unknown;
};

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function safeSmtpError(error: unknown): string {
  const candidate = error as SafeSmtpError;
  const code = typeof candidate?.code === 'string'
    ? candidate.code.replace(/[^A-Z0-9_-]/gi, '')
    : 'UNKNOWN';
  const responseCode = typeof candidate?.responseCode === 'number'
    ? `, responseCode=${candidate.responseCode}`
    : '';
  const explanations: Record<string, string> = {
    EAUTH: 'The SMTP server rejected authentication.',
    ECONNECTION: 'A connection to the SMTP server could not be established.',
    ECONNREFUSED: 'The SMTP server refused the connection.',
    EDNS: 'The SMTP host could not be resolved.',
    ETIMEDOUT: 'The SMTP connection timed out.',
    ETLS: 'STARTTLS negotiation or certificate validation failed.',
    ESOCKET: 'The SMTP socket connection failed.',
  };
  return `SMTP verification failed (code=${code}${responseCode}). ${explanations[code] ?? 'The SMTP server did not accept the verification request.'}`;
}

async function main() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) throw new Error('Root .env check failed: .env was not found in the project root.');
  console.log('Root .env load: OK');

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Environment check failed: missing ${missing.join(', ')}.`);
  }

  const port = Number(process.env.SMTP_PORT);
  if (port !== 2525) throw new Error('SMTP configuration check failed: SMTP_PORT must be 2525.');

  const host = process.env.SMTP_HOST!.trim();
  if (host.toLowerCase() !== 'sandbox.smtp.mailtrap.io') {
    throw new Error('SMTP configuration check failed: SMTP_HOST is not the Mailtrap Sandbox SMTP host.');
  }
  console.log('Required SMTP values: present');
  console.log('SMTP target: Mailtrap Sandbox on port 2525 with secure=false');

  const requestedEmail = argumentValue('email')?.toLowerCase();
  const admin = requestedEmail
    ? await db.getAdminByEmail(requestedEmail)
    : (await db.getAdmins()).find((candidate) => Boolean(candidate.email) && isSuperAdminRole(candidate.role));

  if (!admin?.email || !isSuperAdminRole(admin.role)) {
    throw new Error('Eligibility check failed: the requested email is not registered to a Super Admin.');
  }
  console.log('Requested account eligibility: Super Admin');

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });

  try {
    await transport.verify();
  } catch (error) {
    throw new Error(safeSmtpError(error));
  } finally {
    transport.close();
  }
  console.log('SMTP STARTTLS verification: OK');

  if (!process.env.APP_URL?.trim()) {
    throw new Error('Environment check failed: missing APP_URL. Reset email was not sent.');
  }

  // This diagnostic token is deliberately not stored, so the test message cannot
  // reset an account or invalidate an existing recovery request.
  const diagnosticToken = crypto.randomBytes(32).toString('base64url');
  try {
    await sendPasswordResetEmail(admin.email, passwordResetUrl(diagnosticToken));
  } catch (error) {
    throw new Error(safeSmtpError(error));
  }

  console.log('APP_URL: present');
  console.log('Mailtrap Sandbox reset-email diagnostic: accepted');
  console.log('No SMTP credentials or reset tokens were printed.');
}

main().then(() => {
  process.exit(0);
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'SMTP diagnostic failed for an unknown reason.';
  console.error(message);
  process.exit(1);
});
