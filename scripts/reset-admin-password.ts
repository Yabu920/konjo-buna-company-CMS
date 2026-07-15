import 'dotenv/config';
import { activeDataSource, db } from '../server/db-adapter.js';
import { hashAdminPassword, isValidAdminPassword, MIN_ADMIN_PASSWORD_LENGTH } from '../server/password.js';

function readArgument(name: string): string | undefined {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex !== -1) return process.argv[exactIndex + 1];
  const prefix = `--${name}=`;
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
}

async function disconnect(): Promise<void> {
  if (activeDataSource !== 'mysql') return;
  const { prisma } = await import('../server/prisma.js');
  await prisma.$disconnect();
}

async function main(): Promise<void> {
  const username = readArgument('username')?.trim();
  const password = readArgument('password');

  if (!username || password === undefined) {
    throw new Error('Usage: npm run admin:reset-password -- --username <username> --password <new-password>');
  }
  if (!isValidAdminPassword(password)) {
    throw new Error(`Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
  }

  const admin = await db.getAdminByUsername(username);
  if (!admin) throw new Error(`Admin user "${username}" was not found.`);

  await db.updateAdminPassword(admin.id, await hashAdminPassword(password));
  await db.revokeAdminSessionsByAdminId(admin.id, new Date().toISOString());
  console.log(`Password reset completed for admin "${admin.username}" using ${activeDataSource.toUpperCase()} mode.`);
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Password reset failed.');
    process.exitCode = 1;
  })
  .finally(disconnect);
