import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

function adapterConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use the mysql:// protocol.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!url.hostname || !url.username || !database) {
    throw new Error('DATABASE_URL must include a host, username, and database name.');
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

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required before the Prisma repository can be used.');
  }

  const adapter = new PrismaMariaDb(adapterConfig(databaseUrl));
  return new PrismaClient({
    adapter,
    // Production request errors are redacted by the Express error boundary.
    // Avoid Prisma's detailed error logger because it may include query values.
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : [],
  });
}

const globalForPrisma = globalThis as unknown as {
  konjoPrisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.konjoPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.konjoPrisma = prisma;
}

export type KonjoPrismaClient = typeof prisma;
