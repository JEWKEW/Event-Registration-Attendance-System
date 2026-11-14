import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('SR-01 Health Check API', () => {
  const app = createApp();

  it('GET /api/health returns 200 with ok status and version information anonymously', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      version: '0.1.0',
      commit: expect.any(String)
    });
  });
});
