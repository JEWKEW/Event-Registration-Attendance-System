import { PrismaClient, UserRole, EventCategory, EventStatus, RegistrationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const prisma = new PrismaClient();

export const SEED_USERS = {
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
  }
};

export const SEED_EVENTS = {
  e01: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000001',
    title: 'Intro to Git Workshop',
    description: 'Learn modern Git workflows, branching and team collaboration.',
    category: EventCategory.WORKSHOP,
    location: 'CB2-301 Computer Lab',
    capacity: 30
  },
  e02: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000002',
    title: 'Robotics Lab Tour',
    description: 'Exclusive tour of FIBO advanced robotics laboratory.',
    category: EventCategory.OTHER,
    location: 'FIBO Building 4th Floor',
    capacity: 1
  },
  e03: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000003',
    title: 'Volunteer Day',
    description: 'Campus tree planting and green space enhancement.',
    category: EventCategory.VOLUNTEER,
    location: 'Learning Garden',
    capacity: 50
  },
  e04: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000004',
    title: 'Past Seminar',
    description: 'Tech trends and engineering career navigation.',
    category: EventCategory.SEMINAR,
    location: 'Auditorium Hall',
    capacity: 40
  },
  e05: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000005',
    title: 'Badminton Night',
    description: 'Evening sports session for physical wellness.',
    category: EventCategory.SPORTS,
    location: 'KMUTT Sports Complex',
    capacity: 20
  },
  // Sprint 2 deterministic seed additions (SR-01)
  e06: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000006',
    title: 'AI Design Draft Meetup',
    description: 'Unpublished draft workshop for Sprint 2 lifecycle testing.',
    category: EventCategory.WORKSHOP,
    location: 'LX Building 11th Floor',
    capacity: 25
  },
  e07: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000007',
    title: 'Cloud Check-In Clinic',
    description: 'Live session inside the check-in window for F-13 testing.',
    category: EventCategory.WORKSHOP,
    location: 'SIT Auditorium',
    capacity: 30
  },
  e08: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000008',
    title: 'Outdoor Movie Night',
    description: 'Cancelled campus activity for F-10 verification.',
    category: EventCategory.OTHER,
    location: 'KMUTT Lawn',
    capacity: 60
  },
  e09: {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000009',
    title: 'Completed DevOps Talk',
    description: 'Ended event with mixed attendance outcomes for F-14 summary testing.',
    category: EventCategory.SEMINAR,
    location: 'CB2-201',
    capacity: 40
  }
};

async function main() {
  console.log('🌱 Starting deterministic database seed...');

  const rawPassword = process.env.SEED_DEMO_PASSWORD || process.env.DEMO_USER_PASSWORD || 'local-demo-only';
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(rawPassword, bcryptRounds);

  // In production, do not truncate existing user data; only seed if the database is empty
  if (process.env.NODE_ENV === 'production') {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log(`✓ Database already contains ${existingUsers} users; skipping destructive seed in production.`);
      return;
    }
  } else {
    // Clean existing data in reverse dependency order for deterministic local/test seeds
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE registrations, events, session, users CASCADE;
    `);
  }

  // 1. Seed Users
  for (const user of Object.values(SEED_USERS)) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        password_hash: passwordHash,
        display_name: user.displayName,
        role: user.role,
        student_no: user.studentNo
      }
    });
  }
  console.log(`✓ Seeded ${Object.keys(SEED_USERS).length} users`);

  // Fixed anchor reference time
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  // 2. Seed Events (SDS C.2.3)
  // E-01: org1, capacity 30, deadline +7d, start +8d, end +8d +3h
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e01.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e01.title,
      description: SEED_EVENTS.e01.description,
      category: SEED_EVENTS.e01.category,
      location: SEED_EVENTS.e01.location,
      capacity: SEED_EVENTS.e01.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - dayMs),
      registration_deadline: new Date(now.getTime() + 7 * dayMs),
      start_at: new Date(now.getTime() + 8 * dayMs),
      end_at: new Date(now.getTime() + 8 * dayMs + 3 * hourMs)
    }
  });

  // E-02: org1, capacity 1, 0 registrations (last seat / full test)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e02.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e02.title,
      description: SEED_EVENTS.e02.description,
      category: SEED_EVENTS.e02.category,
      location: SEED_EVENTS.e02.location,
      capacity: SEED_EVENTS.e02.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - dayMs),
      registration_deadline: new Date(now.getTime() + 3 * dayMs),
      start_at: new Date(now.getTime() + 4 * dayMs),
      end_at: new Date(now.getTime() + 4 * dayMs + 2 * hourMs)
    }
  });

  // E-03: org1, capacity 50, deadline passed (-1d), start +1d (registration closed test)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e03.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e03.title,
      description: SEED_EVENTS.e03.description,
      category: SEED_EVENTS.e03.category,
      location: SEED_EVENTS.e03.location,
      capacity: SEED_EVENTS.e03.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - 3 * dayMs),
      registration_deadline: new Date(now.getTime() - dayMs),
      start_at: new Date(now.getTime() + dayMs),
      end_at: new Date(now.getTime() + dayMs + 4 * hourMs)
    }
  });

  // E-04: org1, capacity 40, ended yesterday (COMPLETED / excluded from upcoming)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e04.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e04.title,
      description: SEED_EVENTS.e04.description,
      category: SEED_EVENTS.e04.category,
      location: SEED_EVENTS.e04.location,
      capacity: SEED_EVENTS.e04.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - 5 * dayMs),
      registration_deadline: new Date(now.getTime() - 3 * dayMs),
      start_at: new Date(now.getTime() - 2 * dayMs),
      end_at: new Date(now.getTime() - dayMs)
    }
  });

  // E-05: org2, capacity 20, stu2 registered (cross-owner and cross-student test)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e05.id,
      organizer_id: SEED_USERS.org2.id,
      title: SEED_EVENTS.e05.title,
      description: SEED_EVENTS.e05.description,
      category: SEED_EVENTS.e05.category,
      location: SEED_EVENTS.e05.location,
      capacity: SEED_EVENTS.e05.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - dayMs),
      registration_deadline: new Date(now.getTime() + 5 * dayMs),
      start_at: new Date(now.getTime() + 6 * dayMs),
      end_at: new Date(now.getTime() + 6 * dayMs + 3 * hourMs)
    }
  });
  // E-06: org1, DRAFT, future start (F-08 draft visibility & publish testing)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e06.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e06.title,
      description: SEED_EVENTS.e06.description,
      category: SEED_EVENTS.e06.category,
      location: SEED_EVENTS.e06.location,
      capacity: SEED_EVENTS.e06.capacity,
      status: EventStatus.DRAFT,
      published_at: null,
      registration_deadline: new Date(now.getTime() + 9 * dayMs),
      start_at: new Date(now.getTime() + 10 * dayMs),
      end_at: new Date(now.getTime() + 10 * dayMs + 2 * hourMs)
    }
  });

  // E-07: org1, PUBLISHED, starts in +30 min (inside F-13 check-in window: start - 60m .. end)
  const minMs = 60 * 1000;
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e07.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e07.title,
      description: SEED_EVENTS.e07.description,
      category: SEED_EVENTS.e07.category,
      location: SEED_EVENTS.e07.location,
      capacity: SEED_EVENTS.e07.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - 2 * dayMs),
      registration_deadline: new Date(now.getTime() + 30 * minMs),
      start_at: new Date(now.getTime() + 30 * minMs),
      end_at: new Date(now.getTime() + 3 * hourMs)
    }
  });

  // E-08: org1, CANCELLED with reason (F-10 verification)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e08.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e08.title,
      description: SEED_EVENTS.e08.description,
      category: SEED_EVENTS.e08.category,
      location: SEED_EVENTS.e08.location,
      capacity: SEED_EVENTS.e08.capacity,
      status: EventStatus.CANCELLED,
      published_at: new Date(now.getTime() - 4 * dayMs),
      cancel_reason: 'Venue unavailable due to heavy rain forecast.',
      cancelled_at: new Date(now.getTime() - 6 * hourMs),
      registration_deadline: new Date(now.getTime() + 2 * dayMs),
      start_at: new Date(now.getTime() + 3 * dayMs),
      end_at: new Date(now.getTime() + 3 * dayMs + 2 * hourMs)
    }
  });

  // E-09: org1, PUBLISHED & ended (F-14 summary: 1 attended, 1 absent, 1 self-cancelled -> 50.0%)
  await prisma.event.create({
    data: {
      id: SEED_EVENTS.e09.id,
      organizer_id: SEED_USERS.org1.id,
      title: SEED_EVENTS.e09.title,
      description: SEED_EVENTS.e09.description,
      category: SEED_EVENTS.e09.category,
      location: SEED_EVENTS.e09.location,
      capacity: SEED_EVENTS.e09.capacity,
      status: EventStatus.PUBLISHED,
      published_at: new Date(now.getTime() - 10 * dayMs),
      registration_deadline: new Date(now.getTime() - 4 * dayMs),
      start_at: new Date(now.getTime() - 3 * dayMs),
      end_at: new Date(now.getTime() - 3 * dayMs + 2 * hourMs)
    }
  });
  console.log(`✓ Seeded ${Object.keys(SEED_EVENTS).length} events`);

  // 3. Seed Registrations
  // R-01: E-05 active registration (stu2) — preserved from Sprint 1
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
      event_id: SEED_EVENTS.e05.id,
      student_id: SEED_USERS.stu2.id,
      status: RegistrationStatus.ACTIVE,
      registered_at: new Date(now.getTime() - 12 * hourMs)
    }
  });

  // R-02 & R-03: E-07 active registrations inside check-in window (stu1, stu2)
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002',
      event_id: SEED_EVENTS.e07.id,
      student_id: SEED_USERS.stu1.id,
      status: RegistrationStatus.ACTIVE,
      registered_at: new Date(now.getTime() - 24 * hourMs)
    }
  });
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003',
      event_id: SEED_EVENTS.e07.id,
      student_id: SEED_USERS.stu2.id,
      status: RegistrationStatus.ACTIVE,
      registered_at: new Date(now.getTime() - 20 * hourMs)
    }
  });

  // R-04: E-08 cancelled-by-event registration (stu3)
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004',
      event_id: SEED_EVENTS.e08.id,
      student_id: SEED_USERS.stu3.id,
      status: RegistrationStatus.CANCELLED_BY_EVENT,
      registered_at: new Date(now.getTime() - 2 * dayMs),
      cancelled_at: new Date(now.getTime() - 6 * hourMs)
    }
  });

  // R-05..R-07: E-09 ended event (stu1 ATTENDED, stu2 ABSENT, stu3 CANCELLED)
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000005',
      event_id: SEED_EVENTS.e09.id,
      student_id: SEED_USERS.stu1.id,
      status: RegistrationStatus.ACTIVE,
      registered_at: new Date(now.getTime() - 6 * dayMs),
      checked_in_at: new Date(now.getTime() - 3 * dayMs + 10 * minMs),
      checked_in_by: SEED_USERS.org1.id
    }
  });
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000006',
      event_id: SEED_EVENTS.e09.id,
      student_id: SEED_USERS.stu2.id,
      status: RegistrationStatus.ACTIVE,
      registered_at: new Date(now.getTime() - 5 * dayMs)
    }
  });
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000007',
      event_id: SEED_EVENTS.e09.id,
      student_id: SEED_USERS.stu3.id,
      status: RegistrationStatus.CANCELLED,
      registered_at: new Date(now.getTime() - 5 * dayMs),
      cancelled_at: new Date(now.getTime() - 4 * dayMs - hourMs)
    }
  });
  console.log('✓ Seeded Sprint 1 + Sprint 2 deterministic registrations (R-01..R-07)');

  console.log('✅ Deterministic seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
