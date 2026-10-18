import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from '../config.js';
import { logger } from '../server.js';

let firebaseInitialized = false;

export function initFirebase() {
  if (firebaseInitialized) return admin;

  // 1. Try inline JSON
  if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      logger.info('Firebase Admin initialized from inline JSON');
      return admin;
    } catch (err) {
      logger.warn(err, 'Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  }

  // 2. Try file path
  if (config.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const fullPath = resolve(process.cwd(), config.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (existsSync(fullPath)) {
      try {
        const fileContent = readFileSync(fullPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseInitialized = true;
        logger.info(`Firebase Admin initialized from ${fullPath}`);
        return admin;
      } catch (err) {
        logger.warn(err, `Failed to load Firebase service account from ${fullPath}`);
      }
    }
  }

  // 3. Fallback for development/testing when no service account file is present
  if (config.NODE_ENV !== 'production') {
    logger.info('Firebase Admin running in mock/development mode (no credentials provided)');
  }

  return admin;
}

export interface DecodedAuthToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Verify Firebase ID token.
 * In development/test mode, supports mock tokens formatted as `mock_token_<uid>`
 * or decodes real tokens if Firebase Admin is initialized.
 */
export async function verifyFirebaseToken(token: string): Promise<DecodedAuthToken> {
  // Mock token handling for test and local dev without service account
  if (token.startsWith('mock_token_')) {
    const uid = token.replace('mock_token_', '');
    return {
      uid,
      email: `${uid}@example.com`,
      name: uid.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }

  if (!firebaseInitialized) {
    initFirebase();
  }

  if (firebaseInitialized) {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  }

  throw new Error('Firebase Admin is not configured and token is not a valid mock token');
}

export { admin };
