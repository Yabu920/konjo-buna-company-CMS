import { db as jsonDb } from './db.js';
import type { PrismaDBManager } from './db-prisma.js';

const requestedSource = process.env.DATA_SOURCE?.trim().toLowerCase();

if (requestedSource && requestedSource !== 'json' && requestedSource !== 'mysql') {
  console.warn(`Unknown DATA_SOURCE="${requestedSource}"; falling back to JSON for safety.`);
}

export const activeDataSource: 'json' | 'mysql' = requestedSource === 'mysql' ? 'mysql' : 'json';

type Repository = typeof jsonDb | PrismaDBManager;
let repositoryPromise: Promise<Repository> | undefined;

const getRepository = (): Promise<Repository> => {
  if (!repositoryPromise) {
    repositoryPromise = activeDataSource === 'mysql'
      ? import('./db-prisma.js').then(({ dbPrisma }) => dbPrisma)
      : Promise.resolve(jsonDb);
  }
  return repositoryPromise;
};

// Every adapter method is asynchronous. This lets Express await both the existing
// synchronous JSON methods and the future Prisma methods through one interface.
export const db = new Proxy({} as PrismaDBManager, {
  get(_target, property: string) {
    return async (...args: unknown[]) => {
      const repository = await getRepository();
      const method = (repository as unknown as Record<string, (...values: unknown[]) => unknown>)[property];
      if (typeof method !== 'function') throw new Error(`Unknown database method: ${property}`);
      return method.apply(repository, args);
    };
  },
});

console.log(`Konjo Coffee data source: ${activeDataSource === 'mysql' ? 'MySQL (Prisma)' : 'JSON (database.json)'}`);
