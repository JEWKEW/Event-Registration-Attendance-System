import dotenv from 'dotenv';
import path from 'path';
import { beforeAll } from 'vitest';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// Force test environment and test database URL
process.env.NODE_ENV = 'test';
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

beforeAll(async () => {
  // Global test setup runs here
});
