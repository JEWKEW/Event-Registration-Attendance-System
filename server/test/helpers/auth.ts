import request from 'supertest';
import { app } from '../../src/app.js';
import { TEST_SEED_PASSWORD } from './db.js';

export async function loginAs(email: string): Promise<string[]> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: TEST_SEED_PASSWORD });
  return res.headers['set-cookie'] as string[];
}
