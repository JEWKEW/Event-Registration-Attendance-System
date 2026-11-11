import { prisma } from '../../src/lib/prisma.js';

/**
 * Truncates all application tables between tests to ensure a clean state.
 */
export async function truncateTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE registrations, events, session, users CASCADE;
  `);
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
