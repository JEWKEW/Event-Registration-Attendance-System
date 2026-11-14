import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { RequestHandler } from 'express';
import { config } from '../lib/config.js';

const PgStore = connectPgSimple(session);

export function createSessionMiddleware(): RequestHandler {
  const connectionString = process.env.DATABASE_URL || config.DATABASE_URL;

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
      secure: config.NODE_ENV === 'production',
      maxAge: config.SESSION_IDLE_MINUTES * 60 * 1000
    }
  });
}
