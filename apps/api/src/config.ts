import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from current directory, parent or monorepo root
dotenv.config();
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config({ path: resolve(process.cwd(), '../.env') });

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  // Database
  DATABASE_URL: isTest
    ? z.string().url().default('postgresql://nearhelp:nearhelp_test@localhost:5432/nearhelp_test')
    : z.string().url(),

  // Server
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().default(3001),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),

  // Security
  JWT_SECRET: isTest
    ? z.string().min(32).default('test-jwt-secret-at-least-32-characters-long')
    : z.string().min(32),
  TRACKING_TOKEN_SECRET: isTest
    ? z.string().min(32).default('test-tracking-secret-at-least-32-chars-long')
    : z.string().min(32),

  // Rate limits
  SOS_RATE_LIMIT_PER_HOUR: z.coerce.number().int().default(3),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().default(100),

  // SOS
  SOS_CANCEL_WINDOW_SECONDS: z.coerce.number().int().default(5),
  SOS_DEFAULT_RADIUS_METERS: z.coerce.number().int().default(1000),
  SOS_EXPAND_RADIUS_METERS: z.coerce.number().int().default(2000),
  SOS_EXPAND_DELAY_SECONDS: z.coerce.number().int().default(90),
  LOCATION_STALENESS_MINUTES: z.coerce.number().int().default(5),
  AVAILABILITY_PURGE_MINUTES: z.coerce.number().int().default(30),

  // Privacy
  INCIDENT_LOCATION_RETENTION_DAYS: z.coerce.number().int().default(30),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
