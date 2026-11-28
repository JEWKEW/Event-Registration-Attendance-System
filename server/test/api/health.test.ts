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

  it('GET /api/health reflects APP_VERSION and GIT_COMMIT release metadata when configured (OBS-01)', async () => {
    const prevVersion = process.env.APP_VERSION;
    const prevCommit = process.env.GIT_COMMIT;
    process.env.APP_VERSION = 'v0.2.0';
    process.env.GIT_COMMIT = '0123456789abcdef0123456789abcdef01234567';

    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        version: 'v0.2.0',
        commit: '0123456789abcdef0123456789abcdef01234567'
      });
    } finally {
      if (prevVersion === undefined) delete process.env.APP_VERSION;
      else process.env.APP_VERSION = prevVersion;
      if (prevCommit === undefined) delete process.env.GIT_COMMIT;
      else process.env.GIT_COMMIT = prevCommit;
    }
  });
});
