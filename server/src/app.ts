import express, { Express } from 'express';
import cors from 'cors';
import { config } from './lib/config.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: config.CORS_ORIGIN,
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

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
