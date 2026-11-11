import express, { Express } from 'express';
import cors from 'cors';
import { config } from './lib/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createSessionMiddleware } from './middleware/session.js';
import { loadUser } from './middleware/loadUser.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { eventsRouter, organizerRouter } from './modules/events/events.routes.js';
import { meRouter, registrationsRouter, eventRegistrationsRouter } from './modules/registrations/registrations.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true
    })
  );

  app.use(express.json());

  // Session middleware backed by PostgreSQL (connect-pg-simple)
  app.use(createSessionMiddleware());

  // Load user and authoritative role from PostgreSQL database (F-02)
  app.use(loadUser);

  // SR-01 Health Check Endpoint (anonymous, no auth required)
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      version: '0.1.0',
      commit: process.env.GIT_COMMIT || 'v0.1.0-dev'
    });
  });

  // F-01 Authentication Routes
  app.use('/api/auth', authRouter);

  // F-02 / Sprint 1 Domain Routes
  app.use('/api/events', eventRegistrationsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/organizer', organizerRouter);
  app.use('/api/me', meRouter);
  app.use('/api/registrations', registrationsRouter);

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
