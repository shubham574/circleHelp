import dotenv from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'drizzle-kit';

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config({ path: resolve(process.cwd(), '../.env') });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://nearhelp:nearhelp_dev@localhost:5432/nearhelp',
  },
  verbose: true,
  strict: true,
});
