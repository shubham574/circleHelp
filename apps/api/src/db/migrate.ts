import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { resolve } from 'path';
import { config } from '../config.js';
import { logger } from '../server.js';

export async function runMigrations() {
  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: 1,
  });

  const db = drizzle(pool);

  logger.info('Running database migrations...');
  const migrationsFolder = resolve(process.cwd(), './drizzle');

  try {
    await migrate(db, { migrationsFolder });
    logger.info('Database migrations applied successfully!');
  } catch (err) {
    logger.error(err, 'Failed to apply migrations');
    throw err;
  } finally {
    await pool.end();
  }
}

if (process.env.NODE_ENV !== 'test') {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
