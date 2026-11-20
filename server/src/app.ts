import express, { Express } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './lib/config.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createSessionMiddleware } from './middleware/session.js';
import { loadUser } from './middleware/loadUser.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { eventsRouter, organizerRouter } from './modules/events/events.routes.js';
import { meRouter, registrationsRouter, eventRegistrationsRouter } from './modules/registrations/registrations.routes.js';

export function createApp(): Express {
  const app = express();

  // Trust Cloud Run / reverse proxy so secure session cookies work behind HTTPS termination
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true
    })
  );

  app.use(express.json());

  // SR-01 Health Check Endpoint (anonymous, no auth required)
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      version: '0.1.0',
      commit: process.env.GIT_COMMIT || 'v0.1.0-dev'
    });
  });

  // Cloud Readiness Endpoint (checks PostgreSQL database reachability)
  app.get('/api/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready', db: 'connected' });
    } catch {
      res.status(503).json({ status: 'not_ready', db: 'disconnected' });
    }
  });

  // Session middleware backed by PostgreSQL (connect-pg-simple)
  app.use(createSessionMiddleware());

  // Load user and authoritative role from PostgreSQL database (F-02)
  app.use(loadUser);

  // F-01 Authentication Routes
  app.use('/api/auth', authRouter);

  // F-02 / Sprint 1 Domain Routes
  app.use('/api/events', eventRegistrationsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/organizer', organizerRouter);
  app.use('/api/me', meRouter);
  app.use('/api/registrations', registrationsRouter);

  // Serve built React SPA in production (Unified container on Cloud Run)
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
