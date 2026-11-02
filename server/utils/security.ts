import crypto from 'crypto';
import type { CorsOptions } from 'cors';

const PBKDF2_ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * Strict CORS configuration. Origins are allow-listed via the ALLOWED_ORIGINS
 * environment variable (comma-separated). Falls back to local development
 * origins only — never reflects arbitrary origins.
 */
export function getCorsOptions(): CorsOptions {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins =
    process.env.NODE_ENV === 'production' && configured.length === 0
      ? [...DEFAULT_ALLOWED_ORIGINS]
      : configured.length > 0
        ? configured
        : [...DEFAULT_ALLOWED_ORIGINS];

  return {
    origin: allowedOrigins,
    credentials: true,
  };
}

/**
 * Hash a password using PBKDF2 with a random 16-byte salt.
 * Output format: pbkdf2:100000:saltHex:hashHex
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored hash (or plain text fallback for initial seeds).
 */
export function verifyPassword(password: string, storedHashOrPlain: string): boolean {
  if (!password || !storedHashOrPlain) return false;

  if (storedHashOrPlain.startsWith('pbkdf2:')) {
    const parts = storedHashOrPlain.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];

    const hashToVerify = crypto.pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST).toString('hex');
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(hashToVerify, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  // Backwards compatibility for plain text seed (e.g. '123456')
  return password === storedHashOrPlain;
}

/**
 * Check if the stored string is still plain text and should be upgraded.
 */
export function needsRehash(storedHashOrPlain: string): boolean {
  return !storedHashOrPlain || !storedHashOrPlain.startsWith('pbkdf2:');
}
