import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { UserProfile } from '../../src/types';
import { signToken, authenticateToken, optionalAuthenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { hashPassword, verifyPassword, needsRehash } from '../utils/security';

export const authRouter = Router();

// GET /auth/me - Get current verified user profile from JWT token
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  const tokenUser = (req as AuthenticatedRequest).user;
  if (!tokenUser) {
    return res.status(401).json({ detail: 'Non authentifié.' });
  }

  let user: any = null;

  if (memoryDb.isConnected()) {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [tokenUser.id]);
      if (result && result.rows.length > 0) {
        const row = result.rows[0];
        user = {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          posteLabel: row.poste_label,
          avatar: row.avatar,
          phone: row.phone,
          address: row.address,
          notes: row.notes,
          brandColor: row.brand_color,
          invitedBy: row.invited_by,
          invitedCardIds: typeof row.invited_card_ids === 'string' ? JSON.parse(row.invited_card_ids) : row.invited_card_ids || [],
        };
      }
    } catch {
      // fallback
    }
  }

  if (!user) {
    user = memoryDb.getUsers().find((u) => u.id === tokenUser.id || u.email.toLowerCase() === tokenUser.email);
  }

  if (!user) {
    return res.json({
      status: 'success',
      user: {
        id: tokenUser.id,
        name: tokenUser.name,
        email: tokenUser.email,
        role: tokenUser.role,
        posteLabel: tokenUser.posteLabel,
      },
    });
  }

  // Do not expose password
  const { password: _, password_hash: __, ...safeUser } = user;
  return res.json({ status: 'success', user: safeUser });
});

// POST /auth/token - Obtain or refresh a signed JWT token for an authenticated user
authRouter.post('/token', optionalAuthenticateToken, async (req: Request, res: Response) => {
  const { email, password, userId } = req.body || {};
  const caller = (req as AuthenticatedRequest).user;
  let user: any = null;

  // If caller already has a valid token, allow refresh for that same user
  if (caller && (!userId || caller.id === userId) && (!email || caller.email.toLowerCase() === String(email).toLowerCase().trim())) {
    user = caller;
  } else {
    // Otherwise, credentials (password) are strictly mandatory
    if (!password || typeof password !== 'string' || password.trim() === '') {
      return res.status(401).json({ error: 'Mot de passe requis pour générer un jeton de session.' });
    }

    if (userId) {
      if (memoryDb.isConnected()) {
        try {
          const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
          if (result && result.rows.length > 0) {
            const row = result.rows[0];
            user = {
              id: row.id,
              name: row.name,
              email: row.email,
              role: row.role,
              posteLabel: row.poste_label,
              password: row.password_hash || '123456',
            };
          }
        } catch {
          // fallback
        }
      }
      if (!user) {
        user = memoryDb.getUsers().find((u) => u.id === userId);
      }
    } else if (email) {
      const cleanEmail = String(email).toLowerCase().trim();
      if (memoryDb.isConnected()) {
        try {
          const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
          if (result && result.rows.length > 0) {
            const row = result.rows[0];
            user = {
              id: row.id,
              name: row.name,
              email: row.email,
              role: row.role,
              posteLabel: row.poste_label,
              password: row.password_hash || '123456',
            };
          }
        } catch {
          // fallback
        }
      }
      if (!user) {
        user = memoryDb.getUsers().find((u) => u.email.toLowerCase().trim() === cleanEmail);
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const expectedPassword = user.password || '123456';
    if (!verifyPassword(password, expectedPassword)) {
      return res.status(401).json({ error: 'Mot de passe incorrect.' });
    }

    // Transparently upgrade legacy plain-text password to PBKDF2 hash
    if (needsRehash(expectedPassword)) {
      const newHash = hashPassword(password);
      user.password = newHash;
      const pool = getPool();
      if (pool && memoryDb.isConnected()) {
        query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]).catch(() => {});
      }
    }
  }

  const token = signToken(user);
  const { password: _, password_hash: __, ...safeUser } = user;
  return res.json({ status: 'success', token, user: safeUser });
});

// POST /auth/login or /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ detail: 'E-mail requis.' });
  }
  if (!password || typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({ detail: 'Mot de passe requis.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const cleanEmail = email.toLowerCase().trim();

    let user: any = null;

    if (memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (result && result.rows.length > 0) {
          const row = result.rows[0];
          user = {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            posteLabel: row.poste_label,
            password: row.password_hash || '123456',
            avatar: row.avatar,
            phone: row.phone,
            address: row.address,
            notes: row.notes,
            brandColor: row.brand_color,
            invitedBy: row.invited_by,
            invitedCardIds: typeof row.invited_card_ids === 'string' ? JSON.parse(row.invited_card_ids) : row.invited_card_ids || [],
          };
        }
      } catch (dbErr: any) {
        console.warn('[API /auth/login] SQLite lookup notice (falling back to memory):', dbErr?.message);
      }
    }

    if (!user) {
      user = memoryDb.getUsers().find((u) => u.email.toLowerCase().trim() === cleanEmail);
    }

    if (!user) {
      return res.status(404).json({ detail: 'Aucun compte trouvé avec cet e-mail.' });
    }

    const expectedPassword = user.password || '123456';
    if (!verifyPassword(password, expectedPassword)) {
      return res.status(401).json({ detail: 'Mot de passe incorrect.' });
    }

    // Transparently upgrade legacy plain-text password to PBKDF2 hash
    if (needsRehash(expectedPassword)) {
      const newHash = hashPassword(password);
      user.password = newHash;
      const pool = getPool();
      if (pool && memoryDb.isConnected()) {
        query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]).catch(() => {});
      }
    }

    const token = signToken(user);
    const { password: _, password_hash: __, ...safeUser } = user;

    return res.json({
      status: 'success',
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error('[API /auth/login] Server Error:', err);
    res.status(500).json({ detail: err.message || 'Erreur lors de la connexion' });
  }
});

// POST /auth/register or /api/v1/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const { name, email, role, password, avatar, posteLabel } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ detail: 'Nom et e-mail sont requis.' });
  }

  const cleanEmail = String(email).toLowerCase().trim();

  try {
    const existingUsers = memoryDb.getUsers();
    const requestedRole = (role || 'commercial').toLowerCase().trim();
    const isAdmin = requestedRole === 'admin';
    const isDirectionRole = ['directeur', 'directeur général', 'directeur general'].includes(requestedRole);
    let assignedRole: any = requestedRole;
    let assignedPoste = posteLabel || 'Collaborateur';
    const pool = getPool();

    // Duplicate email pre-check against the database too (the in-memory mirror
    // may be stale when the server was started while SQLite was down).
    if (memoryDb.isConnected()) {
      try {
        const dup = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (dup.rows.length > 0) {
          return res.status(400).json({ detail: 'Un compte existe déjà avec cette adresse email.' });
        }
      } catch (dupErr: any) {
        console.warn('[API /auth/register] SQLite email lookup notice:', dupErr?.message);
      }
    }

    if (isDirectionRole) {
      // The Direction secret lives ONLY on the server (DIRECTION_SECRET_CODE).
      // No hardcoded fallback codes: a missing secret blocks Direction signups.
      const DIRECTION_SECRET_CODE = (process.env.DIRECTION_SECRET_CODE || '').trim();
      if (!DIRECTION_SECRET_CODE) {
        return res.status(500).json({
          detail: "Mot de passe secret Direction non configuré sur le serveur.",
        });
      }

      const submittedCode = String(req.body?.directionCode || '').trim().toLowerCase();
      if (!submittedCode || submittedCode !== DIRECTION_SECRET_CODE.toLowerCase()) {
        return res.status(403).json({
          detail: "Mot de passe secret Direction incorrect ou absent. Seuls les directeurs détenant ce code secret commun peuvent valider un profil Direction.",
        });
      }

      assignedRole = requestedRole === 'directeur general' ? 'directeur général' : requestedRole;
      assignedPoste = posteLabel || (requestedRole.includes('général') || requestedRole.includes('general') ? 'Directeur Général' : 'Directeur de Production');
    } else if (isAdmin) {
      // Direct Admin registration not allowed publicly
      assignedRole = 'commercial';
      assignedPoste = posteLabel || 'Commercial';
    }

    const hashedPassword = hashPassword(password || '123456');

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: String(name).trim(),
      email: cleanEmail,
      role: assignedRole,
      posteLabel: assignedPoste,
      password: hashedPassword,
      avatar: avatar || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}&eyes=variant08&hair=variant14`,
      invitedCardIds: [],
    };

    // Duplicate email pre-check against the database too (the in-memory mirror
    // may be stale when the server was started while SQLite was down).
    if (pool && memoryDb.isConnected()) {
      try {
        const dup = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (dup.rows.length > 0) {
          return res.status(400).json({ detail: 'Un compte existe déjà avec cette adresse email.' });
        }
      } catch (dupErr: any) {
        console.warn('[API /auth/register] SQLite email lookup notice:', dupErr?.message);
      }
    }

    // Persist FIRST, then mutate memory: a failed insert must never leave an
    // account visible in memory without being persisted.
    if (pool && memoryDb.isConnected()) {
      try {
        const result = await query(
          `INSERT INTO users (id, name, email, role, poste_label, password_hash, avatar, invited_card_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO NOTHING`,
          [
            newUser.id,
            newUser.name,
            newUser.email,
            newUser.role,
            newUser.posteLabel || null,
            hashedPassword,
            newUser.avatar || null,
            JSON.stringify([]),
          ]
        );
        if (result.rowCount === 0) {
          return res.status(400).json({ detail: 'Un compte existe déjà avec cette adresse email.' });
        }
      } catch (dbErr: any) {
        if (dbErr.code === '23505' || dbErr.message?.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ detail: 'Un compte existe déjà avec cette adresse email.' });
        }
        console.error('[API /auth/register] SQLite insert error:', dbErr?.message);
        return res.status(500).json({ detail: "Erreur lors de l'enregistrement du compte en base de données." });
      }
    }

    memoryDb.setUsers([...existingUsers, newUser]);

    const token = signToken(newUser);
    const { password: _, ...safeNewUser } = newUser;

    return res.status(201).json({
      status: 'success',
      user: safeNewUser,
      token,
    });
  } catch (err: any) {
    console.error('[API /auth/register] Server Error:', err);
    res.status(500).json({ detail: err.message || "Erreur lors de l'inscription" });
  }
});

// POST /api/v1/auth/change-password (Protected: Authenticated user)
authRouter.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  const caller = (req as AuthenticatedRequest).user;

  if (!caller) {
    return res.status(401).json({ detail: 'Non autorisé.' });
  }
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ detail: 'Mot de passe actuel et nouveau mot de passe requis.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ detail: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
  }

  try {
    let user: any = null;

    if (memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM users WHERE id = $1', [caller.id]);
        if (result && result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch {}
    }

    if (!user) {
      user = memoryDb.getUsers().find((u) => u.id === caller.id);
    }

    if (!user) {
      return res.status(404).json({ detail: 'Utilisateur non trouvé.' });
    }

    const storedHash = user.password_hash || user.password || '123456';
    if (!verifyPassword(currentPassword, storedHash)) {
      return res.status(401).json({ detail: 'Mot de passe actuel incorrect.' });
    }

    const newHash = hashPassword(newPassword);
    user.password = newHash;
    const pool = getPool();

    if (pool && memoryDb.isConnected()) {
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, caller.id]);
    }

    const currentUsers = memoryDb.getUsers();
    const idx = currentUsers.findIndex((u) => u.id === caller.id);
    if (idx !== -1) {
      currentUsers[idx].password = newHash;
      memoryDb.setUsers([...currentUsers]);
    }

    return res.json({ status: 'success', message: 'Mot de passe mis à jour avec succès.' });
  } catch (err: any) {
    console.error('[API /auth/change-password] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});
