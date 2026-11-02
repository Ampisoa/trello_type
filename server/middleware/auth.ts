import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * JWT secret resolution:
 * - Production: JWT_SECRET is strictly required (fail-fast startup, no insecure fallback).
 * - Development: generates a random per-process secret so the signing key is never
 *   a publicly-known hardcoded value. Sessions do not survive a restart, which is
 *   an acceptable trade-off for local development security.
 */
const resolveJwtSecret = (): string => {
  const configured = (process.env.JWT_SECRET || '').trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET est obligatoire en production. Veuillez définir une clé secrète forte dans les variables d\'environnement.'
    );
  }

  console.warn(
    '[Auth] ATTENTION: JWT_SECRET non défini. Génération d\'un secret de développement aléatoire — les sessions ne survivront pas au redémarrage du serveur.'
  );
  return crypto.randomBytes(48).toString('hex');
};

const DEV_JWT_SECRET = resolveJwtSecret();

export const JWT_SECRET = DEV_JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  posteLabel?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Sign a secure JSON Web Token for an authenticated user.
 */
export function signToken(user: { id: string; email: string; name: string; role: string; posteLabel?: string }): string {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email.toLowerCase().trim(),
    name: user.name,
    role: (user.role || 'visiteur').toLowerCase().trim(),
    posteLabel: user.posteLabel,
  };

  const expConfig = (JWT_EXPIRES_IN || '').toLowerCase().trim();
  const isUnlimited = !expConfig || ['never', 'none', 'infinite', 'illimite', 'illimité', '0'].includes(expConfig);

  // If unlimited, do not set an expiration timestamp (token never expires)
  if (isUnlimited) {
    return jwt.sign(payload, JWT_SECRET);
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export interface VisitorTokenPayload {
  email: string;
  name?: string;
  cardId?: string;
  boardId?: string;
  poleId?: string;
  role: 'visiteur';
  iat?: number;
  exp?: number;
}

/**
 * Sign a dedicated secure token for an invited external visitor.
 */
export function signVisitorToken(params: {
  email: string;
  name?: string;
  cardId?: string;
  boardId?: string;
  poleId?: string;
}): string {
  const payload: VisitorTokenPayload = {
    email: params.email.toLowerCase().trim(),
    name: params.name,
    cardId: params.cardId,
    boardId: params.boardId,
    poleId: params.poleId,
    role: 'visiteur',
  };

  // Visitor links default to 30 days valid access
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify and decode an invited visitor token.
 */
export function verifyVisitorToken(token: string): VisitorTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.role === 'visiteur' && decoded.email) {
      return decoded as VisitorTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verify and extract JWT payload from an incoming token string.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Express Middleware: Requires a valid JWT token in Authorization: Bearer <token>
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      error: 'Accès refusé: Aucun jeton d\'authentification fourni (Authorization: Bearer <token> requis).',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    return res.status(401).json({ error: 'Jeton d\'authentification invalide.' });
  }
}

/**
 * Express Middleware: Soft authentication. Populates req.user if a valid token is present,
 * but allows the request to continue if no token is provided.
 */
export function optionalAuthenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      (req as AuthenticatedRequest).user = decoded;
    } catch {
      // Ignore invalid token on optional routes
    }
  }
  next();
}

/**
 * Express Middleware: Requires the user to have internal atelier staff privileges.
 * (Commercial, Merchandiser, Direction, Planning, Admin, Magasinier).
 * Blocks external roles (Visiteur / Observateur, Client).
 */
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  const role = (user.role || '').toLowerCase();
  const poste = (user.posteLabel || '').toLowerCase();

  const isInternal =
    role === 'commercial' ||
    role === 'directeur' ||
    role === 'directeur général' ||
    role === 'directeur general' ||
    role === 'admin' ||
    role === 'resp_planning' ||
    role === 'planning' ||
    role === 'magasinier' ||
    role === 'fournisseur' ||
    poste.includes('commercial') ||
    poste.includes('direct') ||
    poste.includes('planning') ||
    poste.includes('admin');

  if (!isInternal) {
    return res.status(403).json({
      error: 'Accès interdit: Cette action est réservée au personnel interne de l\'atelier (Commercial, Direction, Planning).',
    });
  }

  next();
}

/**
 * Express Middleware: Requires specific roles.
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    const normalizedUserRole = (user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === normalizedUserRole);

    if (!isAllowed) {
      return res.status(403).json({
        error: `Accès interdit: Rôle requis parmi [${allowedRoles.join(', ')}]. Votre rôle: ${user.role}.`,
      });
    }

    next();
  };
}
