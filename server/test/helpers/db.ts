import bcrypt from 'bcrypt';
import { prisma } from '../../src/lib/prisma.js';
import { UserRole } from '@prisma/client';

export const TEST_SEED_PASSWORD = 'local-demo-only';

export const TEST_USERS = {
  org1: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'org1@demo.kmutt.test',
    displayName: 'Organizer One',
    role: UserRole.ORGANIZER,
    studentNo: null
  },
  stu1: {
    id: '33333333-3333-4333-8333-333333333331',
    email: 'stu1@demo.kmutt.test',
    displayName: 'Student One',
    role: UserRole.STUDENT,
    studentNo: '65000001'
  }
};

/**
 * Truncates all application tables between tests to ensure a clean state.
 */
export async function truncateTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE registrations, events, session, users CASCADE;
  `);
}

/**
 * Seeds minimal users for auth testing.
 */
export async function seedTestUsers(): Promise<void> {
  const hash = await bcrypt.hash(TEST_SEED_PASSWORD, 12);

  for (const user of Object.values(TEST_USERS)) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.toLowerCase(),
        password_hash: hash,
        display_name: user.displayName,
        role: user.role,
        student_no: user.studentNo
      },
      update: {
        email: user.email.toLowerCase(),
        password_hash: hash,
        display_name: user.displayName,
        role: user.role,
        student_no: user.studentNo
      }
    });
  }
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
