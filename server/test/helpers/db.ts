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
  },
  stu3: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'stu3@demo.kmutt.test',
    displayName: 'Student Three',
    role: UserRole.STUDENT,
    studentNo: '65000003'
  },
  stu4: {
    id: '33333333-3333-4333-8333-333333333334',
    email: 'stu4@demo.kmutt.test',
    displayName: 'Student Four',
    role: UserRole.STUDENT,
    studentNo: '65000004'
  },
  stu5: {
    id: '33333333-3333-4333-8333-333333333335',
    email: 'stu5@demo.kmutt.test',
    displayName: 'Student Five',
    role: UserRole.STUDENT,
    studentNo: '65000005'
  },
  stu6: {
    id: '33333333-3333-4333-8333-333333333336',
    email: 'stu6@demo.kmutt.test',
    displayName: 'Student Six',
    role: UserRole.STUDENT,
    studentNo: '65000006'
  },
  stu7: {
    id: '33333333-3333-4333-8333-333333333337',
    email: 'stu7@demo.kmutt.test',
    displayName: 'Student Seven',
    role: UserRole.STUDENT,
    studentNo: '65000007'
  },
  stu8: {
    id: '33333333-3333-4333-8333-333333333338',
    email: 'stu8@demo.kmutt.test',
    displayName: 'Student Eight',
    role: UserRole.STUDENT,
    studentNo: '65000008'
  },
  stu9: {
    id: '33333333-3333-4333-8333-333333333339',
    email: 'stu9@demo.kmutt.test',
    displayName: 'Student Nine',
    role: UserRole.STUDENT,
    studentNo: '65000009'
  },
  stu10: {
    id: '33333333-3333-4333-8333-333333333310',
    email: 'stu10@demo.kmutt.test',
    displayName: 'Student Ten',
    role: UserRole.STUDENT,
    studentNo: '65000010'
  },
  stu11: {
    id: '33333333-3333-4333-8333-333333333311',
    email: 'stu11@demo.kmutt.test',
    displayName: 'Student Eleven',
    role: UserRole.STUDENT,
    studentNo: '65000011'
  },
  stu12: {
    id: '33333333-3333-4333-8333-333333333312',
    email: 'stu12@demo.kmutt.test',
    displayName: 'Student Twelve',
    role: UserRole.STUDENT,
    studentNo: '65000012'
  },
  stu13: {
    id: '33333333-3333-4333-8333-333333333313',
    email: 'stu13@demo.kmutt.test',
    displayName: 'Student Thirteen',
    role: UserRole.STUDENT,
    studentNo: '65000013'
  },
  stu14: {
    id: '33333333-3333-4333-8333-333333333314',
    email: 'stu14@demo.kmutt.test',
    displayName: 'Student Fourteen',
    role: UserRole.STUDENT,
    studentNo: '65000014'
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
