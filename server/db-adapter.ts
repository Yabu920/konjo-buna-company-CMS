import { resolveDataSourceConfiguration } from './config.js';
import type { DBManager } from './db.js';
import type { PrismaDBManager } from './db-prisma.js';

const configuration = resolveDataSourceConfiguration(process.env);
export const activeDataSource = configuration.dataSource;

type Repository = DBManager | PrismaDBManager;
let repositoryPromise: Promise<Repository> | undefined;

const getRepository = (): Promise<Repository> => {
  if (!repositoryPromise) {
    repositoryPromise = activeDataSource === 'mysql'
      ? import('./db-prisma.js').then(({ dbPrisma }) => dbPrisma)
      : import('./db.js').then(({ db: jsonDb }) => jsonDb);
  }
  return repositoryPromise;
};

// Every adapter method is asynchronous so Express can use one interface for both
// the explicitly selected development JSON repository and production MySQL.
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

console.log(`Konjo Coffee data source: ${activeDataSource === 'mysql' ? 'MySQL (Prisma)' : 'JSON (explicit development mode)'}`);
