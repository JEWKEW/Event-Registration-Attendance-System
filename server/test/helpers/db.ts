import bcrypt from 'bcrypt';
import { prisma } from '../../src/lib/prisma.js';
import { UserRole, EventCategory, EventStatus, RegistrationStatus } from '@prisma/client';

export const TEST_SEED_PASSWORD = 'local-demo-only';

export const TEST_USERS = {
  org1: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'org1@demo.kmutt.test',
    displayName: 'Organizer One',
    role: UserRole.ORGANIZER,
    studentNo: null
  },
  org2: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'org2@demo.kmutt.test',
    displayName: 'Organizer Two',
    role: UserRole.ORGANIZER,
    studentNo: null
  },
  stu1: {
    id: '33333333-3333-4333-8333-333333333331',
    email: 'stu1@demo.kmutt.test',
    displayName: 'Student One',
    role: UserRole.STUDENT,
    studentNo: '65000001'
  },
  stu2: {
    id: '33333333-3333-4333-8333-333333333332',
    email: 'stu2@demo.kmutt.test',
    displayName: 'Student Two',
    role: UserRole.STUDENT,
    studentNo: '65000002'
  }
};

export const TEST_EVENTS = {
  e01: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000001',
    title: 'Intro to Git Workshop',
    organizerId: TEST_USERS.org1.id
  },
  e05: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000005',
    title: 'Badminton Night',
    organizerId: TEST_USERS.org2.id
  }
};

export const TEST_REGISTRATIONS = {
  r01: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    eventId: TEST_EVENTS.e05.id,
    studentId: TEST_USERS.stu2.id
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
 * Seeds minimal users and events for authorization testing.
 */
export async function seedTestFixtures(): Promise<void> {
  const hash = await bcrypt.hash(TEST_SEED_PASSWORD, 12);

  // 1. Users
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

  // 2. Events
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  await prisma.event.upsert({
    where: { id: TEST_EVENTS.e01.id },
    create: {
      id: TEST_EVENTS.e01.id,
      organizer_id: TEST_USERS.org1.id,
      title: TEST_EVENTS.e01.title,
      description: 'Git workshop description',
      category: EventCategory.WORKSHOP,
      location: 'CB2-301',
      capacity: 30,
      status: EventStatus.PUBLISHED,
      start_at: new Date(now.getTime() + 8 * dayMs),
      end_at: new Date(now.getTime() + 8 * dayMs + 3 * 3600 * 1000),
      registration_deadline: new Date(now.getTime() + 7 * dayMs),
      published_at: now
    },
    update: {}
  });

  await prisma.event.upsert({
    where: { id: TEST_EVENTS.e05.id },
    create: {
      id: TEST_EVENTS.e05.id,
      organizer_id: TEST_USERS.org2.id,
      title: TEST_EVENTS.e05.title,
      description: 'Badminton description',
      category: EventCategory.SPORTS,
      location: 'Gymnasium',
      capacity: 20,
      status: EventStatus.PUBLISHED,
      start_at: new Date(now.getTime() + 6 * dayMs),
      end_at: new Date(now.getTime() + 6 * dayMs + 2 * 3600 * 1000),
      registration_deadline: new Date(now.getTime() + 5 * dayMs),
      published_at: now
    },
    update: {}
  });

  // 3. Registrations
  await prisma.registration.upsert({
    where: { id: TEST_REGISTRATIONS.r01.id },
    create: {
      id: TEST_REGISTRATIONS.r01.id,
      event_id: TEST_REGISTRATIONS.r01.eventId,
      student_id: TEST_REGISTRATIONS.r01.studentId,
      status: RegistrationStatus.ACTIVE,
      registered_at: now
    },
    update: {}
  });
}

export const seedTestUsers = seedTestFixtures;

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
