import 'dotenv/config';
import { dbPrisma } from '../server/db-prisma.js';
import { prisma } from '../server/prisma.js';

async function main() {
  console.log('Verifying parallel Prisma repository (read-only)...');
  const [categories, products, settings] = await Promise.all([
    dbPrisma.getCategories(),
    dbPrisma.getProducts(),
    dbPrisma.getSettings(),
  ]);

  console.log(`Categories: ${categories.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Settings: ${settings.length}`);
  console.log('Prisma repository verification succeeded. No data was written.');
}

main()
  .catch((error: unknown) => {
    console.error('Prisma repository verification failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
