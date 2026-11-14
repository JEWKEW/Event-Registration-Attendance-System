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
  }
};

async function main() {
  console.log('🌱 Starting deterministic database seed...');

  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'local-demo-only';
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(rawPassword, bcryptRounds);

  // Clean existing data in reverse dependency order
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE registrations, events, session, users CASCADE;
  `);

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
  console.log(`✓ Seeded ${Object.keys(SEED_EVENTS).length} events`);

  // 3. Seed Registration for E-05
  await prisma.registration.create({
    data: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
      event_id: SEED_EVENTS.e05.id,
      student_id: SEED_USERS.stu2.id,
      status: RegistrationStatus.ACTIVE,
      registered_at: new Date(now.getTime() - 12 * hourMs)
    }
  });
  console.log(`✓ Seeded initial active registration for E-05 (stu2)`);

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
