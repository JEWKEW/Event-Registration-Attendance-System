import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { RequestHandler } from 'express';
import { config } from '../lib/config.js';

const PgStore = connectPgSimple(session);

export function createSessionMiddleware(): RequestHandler {
  const rawUrl = process.env.DATABASE_URL || config.DATABASE_URL;
  // Strip Prisma-only query parameters (schema, connection_limit) for node-postgres / connect-pg-simple compatibility
  const connectionString = rawUrl
    .replace(/([?&])(schema|connection_limit)=[^&]*(&|$)/g, '$1')
    .replace(/[?&]$/, '');

  return session({
    name: 'sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PgStore({
      conString: connectionString,
      tableName: 'session',
      createTableIfMissing: false
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
      maxAge: config.SESSION_IDLE_MINUTES * 60 * 1000
    }
  });
}
