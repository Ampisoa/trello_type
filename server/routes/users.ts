import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { UserProfile } from '../../src/types';
import { rowToUser } from '../utils/mappers';
import { authenticateToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';
import { hashPassword } from '../utils/security';

export const usersRouter = Router();

function sanitizeUser(u: UserProfile): UserProfile {
  const { password, ...safe } = u;
  return safe as UserProfile;
}

// Privileged roles that only Direction/Admin may grant to other users.
const PRIVILEGED_ROLES = ['admin', 'directeur', 'directeur général', 'directeur general'];

function isDirectionRole(role?: string): boolean {
  return PRIVILEGED_ROLES.includes((role || '').toLowerCase().trim());
}

// Remove every reference to a deleted user from the cards (members,
// merchandisers, merchandiser identity) in both memory and SQLite.
async function removeUserCardReferences(userId: string, dbConnected: boolean): Promise<number> {
  const cards = memoryDb.getCards();
  let changedCount = 0;
  const nextCards = cards.map((card) => {
    const members = (card.members || []).filter((m) => m.id !== userId);
    const merchandisers = (card.merchandisers || []).filter((m) => (m as any).id !== userId);
    const clearedMerchId = card.merchandiserId === userId;
    const changed =
      members.length !== (card.members || []).length ||
      merchandisers.length !== (card.merchandisers || []).length ||
      clearedMerchId;
    if (!changed) return card;
    changedCount++;
    return {
      ...card,
      members,
      merchandisers,
      ...(clearedMerchId
        ? { merchandiserId: undefined, merchandiserName: undefined, merchandiserAvatar: undefined }
        : {}),
    };
  });

  if (changedCount > 0) {
    if (dbConnected) {
      for (const card of nextCards) {
        const original = cards.find((c) => c.id === card.id);
        if (original === card) continue;
        await query(
          `UPDATE cards SET
            members = $1,
            merchandisers = $2,
            merchandiser_id = $3,
            merchandiser_name = $4,
            merchandiser_avatar = $5,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [
            JSON.stringify(card.members || []),
            JSON.stringify(card.merchandisers || []),
            card.merchandiserId || null,
            card.merchandiserName || null,
            card.merchandiserAvatar || null,
            card.id,
          ]
        );
      }
    }
    memoryDb.setCards(nextCards);
  }
  return changedCount;
}

// Remove every reference to a deleted user from the poles leaders in both
// memory and PostgreSQL.
async function removeUserPoleReferences(userId: string, userName: string, dbConnected: boolean): Promise<number> {
  const poles = memoryDb.getPoles();
  let changedCount = 0;
  const nextPoles = poles.map((pole) => {
    const leaderIds = (pole.leaderIds || []).filter((id) => id !== userId);
    const leaderNames = (pole.leaderNames || []).filter((n) => n !== userName);
    const changed = leaderIds.length !== (pole.leaderIds || []).length || leaderNames.length !== (pole.leaderNames || []).length;
    if (!changed) return pole;
    changedCount++;
    return { ...pole, leaderIds, leaderNames };
  });

  if (changedCount > 0) {
    if (dbConnected) {
      for (const pole of nextPoles) {
        const original = poles.find((p) => p.id === pole.id);
        if (original === pole) continue;
        await query(
          'UPDATE poles SET leader_ids = $1, leader_names = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [JSON.stringify(pole.leaderIds || []), JSON.stringify(pole.leaderNames || []), pole.id]
        );
      }
    }
    memoryDb.setPoles(nextPoles);
  }
  return changedCount;
}

// GET /api/v1/users (Public: requis par la page de connexion pour afficher les
// comptes réels de l'équipe — sans jeton, l'app ne peut pas lister les vrais
// utilisateurs et retomberait sur les comptes démo codés en dur).
// `rowToUser` n'expose jamais `password_hash`/`password`.
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // GET /api/v1/users - List all users (Public)
    if (memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM users ORDER BY name ASC');
        if (result && result.rows.length > 0) {
          return res.json(result.rows.map(rowToUser));
        }
      } catch (dbErr: any) {
        console.warn('[API /users GET] SQLite query notice:', dbErr.message);
      }
    }
    return res.json(memoryDb.getUsers().map(sanitizeUser));
  } catch (err: any) {
    console.error('[API /users GET] Error:', err);
    res.json(memoryDb.getUsers().map(sanitizeUser));
  }
});

// POST /api/v1/users (Protected: Staff only)
usersRouter.post('/', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const u: UserProfile = req.body;
    const cleanEmail = String(u.email || '').toLowerCase().trim();
    if (!u.name || !cleanEmail) {
      return res.status(400).json({ detail: 'Le nom et l\'e-mail sont obligatoires.' });
    }

    // Anti-privilege-escalation: only Direction/Admin can create accounts with
    // Direction or Admin roles. Regular staff can only create basic internal
    // accounts (commercial, planning, magasinier, fournisseur).
    const caller = (req as AuthenticatedRequest).user;
    const requestedRole = String(u.role || 'commercial').toLowerCase().trim();
    if (PRIVILEGED_ROLES.includes(requestedRole) && !isDirectionRole(caller?.role)) {
      return res.status(403).json({
        error: "Accès refusé: Seule la Direction est habilitée à créer un compte avec le rôle demandé (Directeur, Admin).",
      });
    }

    const userId = u.id || `usr-${Date.now()}`;
    const rawPass = u.password || '123456';
    const isAlreadyHashed = rawPass.startsWith('pbkdf2:') || rawPass.startsWith('pbkdf2$');
    const hashedPassword = isAlreadyHashed ? rawPass : hashPassword(rawPass);

    const pool = getPool();
    const dbConnected = Boolean(pool && memoryDb.isConnected());

    // Duplicate email pre-check (memory mirror first, then the database).
    if (memoryDb.getUsers().some((x) => x.email.toLowerCase().trim() === cleanEmail)) {
      return res.status(409).json({ detail: `Un utilisateur existe déjà avec l'e-mail "${cleanEmail}".` });
    }
    if (dbConnected) {
      const dup = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ detail: `Un utilisateur existe déjà avec l'e-mail "${cleanEmail}".` });
      }
    }

    const newUser: UserProfile = {
      ...u,
      id: userId,
      email: cleanEmail,
      password: hashedPassword,
      avatar: u.avatar || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(u.name)}&eyes=variant08&hair=variant14`,
      invitedCardIds: u.invitedCardIds || [],
    };

    // Persist FIRST: a failed insert must never leave an account visible in
    // memory without being persisted.
    if (dbConnected) {
      try {
        await query(
          `INSERT INTO users (id, name, email, role, poste_label, password_hash, avatar, phone, address, notes, brand_color, invited_by, invited_card_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          [
            newUser.id,
            newUser.name,
            newUser.email,
            newUser.role,
            newUser.posteLabel || null,
            hashedPassword,
            newUser.avatar || null,
            newUser.phone || null,
            newUser.address || null,
            newUser.notes || null,
            newUser.brandColor || null,
            newUser.invitedBy || null,
            JSON.stringify(newUser.invitedCardIds || []),
          ]
        );
      } catch (dbErr: any) {
        if (dbErr.code === '23505') {
          return res.status(409).json({ detail: `Un utilisateur existe déjà avec l'e-mail "${cleanEmail}".` });
        }
        console.error('[API /users POST] PostgreSQL insert error:', dbErr.message);
        return res.status(500).json({ detail: 'Erreur lors de la création du compte en base de données.' });
      }
    }

    memoryDb.setUsers([...memoryDb.getUsers(), newUser]);
    res.status(201).json(sanitizeUser(newUser));
  } catch (err: any) {
    console.error('[API /users POST] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/v1/users/:id (Protected: Self or Direction)
usersRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const tokenUser = (req as AuthenticatedRequest).user;
  const updates: Partial<UserProfile> = req.body;

  const isCallerDirection = isDirectionRole(tokenUser?.role);

  // Verify permission: user can update own profile; only Direction can edit other users
  if (tokenUser && tokenUser.id !== id && !isCallerDirection) {
    return res.status(403).json({ error: "Accès refusé: Seule la Direction peut modifier le profil d'un autre collaborateur." });
  }

  try {
    const currentUsers = memoryDb.getUsers();
    let targetUser = currentUsers.find((u) => u.id === id);

    const pool = getPool();
    const dbConnected = Boolean(pool && memoryDb.isConnected());

    // Resolve the current profile: memory first, then database (covers the
    // case where the server restarted and memory is not fully in sync).
    if (!targetUser && dbConnected) {
      try {
        const dbRes = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (dbRes.rows.length > 0) {
          targetUser = rowToUser(dbRes.rows[0]);
        }
      } catch (dbErr: any) {
        console.warn('[API /users PUT] SQLite lookup notice:', dbErr.message);
      }
    }

    if (!targetUser) {
      return res.status(404).json({ detail: 'Utilisateur non trouvé' });
    }

    // Anti-self-promotion: only Direction can update role
    if (updates.role && updates.role !== targetUser.role && !isCallerDirection) {
      return res.status(403).json({
        error: "Interdiction: Seule la Direction est habilitée à modifier les rôles système et promotions.",
      });
    }

    const finalRole = isCallerDirection && updates.role ? updates.role : targetUser.role;

    let hashedPassword = targetUser.password;
    if (updates.password && updates.password.trim() && updates.password !== targetUser.password) {
      const isAlreadyHashed = updates.password.startsWith('pbkdf2:') || updates.password.startsWith('pbkdf2$');
      hashedPassword = isAlreadyHashed
        ? updates.password
        : hashPassword(updates.password.trim());
    }

    const updated: UserProfile = {
      ...targetUser,
      ...updates,
      email: updates.email ? String(updates.email).toLowerCase().trim() : targetUser.email,
      password: hashedPassword,
      role: finalRole,
    };

    // Persist FIRST, then mutate memory, so a database failure never leaves
    // the cache out of sync with the source of truth.
    if (dbConnected) {
      try {
        const result = await query(
          `UPDATE users SET
            email = COALESCE($1, email),
            name = COALESCE($2, name),
            role = $3,
            poste_label = COALESCE($4, poste_label),
            avatar = COALESCE($5, avatar),
            phone = COALESCE($6, phone),
            address = COALESCE($7, address),
            notes = COALESCE($8, notes),
            brand_color = COALESCE($9, brand_color),
            invited_card_ids = COALESCE($10, invited_card_ids),
            password_hash = COALESCE($11, password_hash),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $12`,
          [
            updated.email !== targetUser.email ? updated.email : null,
            updates.name ? updates.name.trim() : null,
            finalRole,
            updates.posteLabel !== undefined ? updates.posteLabel : null,
            updates.avatar !== undefined ? updates.avatar : null,
            updates.phone !== undefined ? updates.phone : null,
            updates.address !== undefined ? updates.address : null,
            updates.notes !== undefined ? updates.notes : null,
            updates.brandColor !== undefined ? updates.brandColor : null,
            updates.invitedCardIds !== undefined ? JSON.stringify(updates.invitedCardIds) : null,
            hashedPassword || null,
            id,
          ]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ detail: 'Utilisateur non trouvé' });
        }
      } catch (dbErr: any) {
        if (dbErr.code === '23505') {
          return res.status(409).json({ detail: `L'e-mail "${updated.email}" est déjà utilisé par un autre compte.` });
        }
        console.error('[API /users PUT] PostgreSQL update error:', dbErr.message);
        return res.status(500).json({ detail: 'Erreur lors de la mise à jour du profil en base de données.' });
      }
    }

    // Commit to memory only after successful persistence (or in memory-only mode).
    const idx = currentUsers.findIndex((u) => u.id === id);
    if (idx !== -1) {
      currentUsers[idx] = updated;
      memoryDb.setUsers([...currentUsers]);
    } else {
      memoryDb.setUsers([...currentUsers, updated]);
    }

    res.json(sanitizeUser(updated));
  } catch (err: any) {
    console.error('[API /users PUT] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/v1/users/:id (Protected: Direction only - cannot delete own account)
usersRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const tokenUser = (req as AuthenticatedRequest).user;

  const isCallerDirection = isDirectionRole(tokenUser?.role);
  if (!isCallerDirection) {
    return res.status(403).json({ error: "Accès refusé: Seule la Direction peut supprimer un collaborateur." });
  }

  if (tokenUser && tokenUser.id === id) {
    return res.status(400).json({ error: "Suppression interdite: Vous ne pouvez pas supprimer votre propre compte." });
  }

  try {
    const currentUsers = memoryDb.getUsers();
    let userExists = currentUsers.some((u) => u.id === id);

    const pool = getPool();
    const dbConnected = Boolean(pool && memoryDb.isConnected());

    if (!userExists && dbConnected) {
      try {
        const dbRes = await query('SELECT id FROM users WHERE id = $1', [id]);
        userExists = dbRes.rows.length > 0;
      } catch (dbErr: any) {
        console.warn('[API /users DELETE] SQLite lookup notice:', dbErr.message);
      }
    }

    if (!userExists) {
      return res.status(404).json({ detail: 'Utilisateur non trouvé' });
    }

    const targetUser = currentUsers.find((u) => u.id === id);

    // Persist the deletion FIRST: only remove from memory when the database
    // has confirmed it, so no "ghost resurrection" can occur on restart.
    if (dbConnected) {
      try {
        const result = await query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ detail: 'Utilisateur non trouvé' });
        }
      } catch (dbErr: any) {
        console.error('[API /users DELETE] PostgreSQL delete error:', dbErr.message);
        return res.status(500).json({ detail: 'Erreur lors de la suppression du profil en base de données.' });
      }
    }

    // Clean up references (best effort: a cleanup failure must not block the
    // deletion that has already been accepted by the database).
    let updatedCards = 0;
    let updatedPoles = 0;
    try {
      updatedCards = await removeUserCardReferences(id, dbConnected);
    } catch (dbErr: any) {
      console.warn('[API /users DELETE] Card references cleanup notice:', dbErr.message);
    }
    try {
      updatedPoles = await removeUserPoleReferences(id, targetUser?.name || '', dbConnected);
    } catch (dbErr: any) {
      console.warn('[API /users DELETE] Pole references cleanup notice:', dbErr.message);
    }

    memoryDb.setUsers(currentUsers.filter((u) => u.id !== id));

    res.json({
      status: 'success',
      deletedId: id,
      cleanedCards: updatedCards,
      cleanedPoles: updatedPoles,
    });
  } catch (err: any) {
    console.error('[API /users DELETE] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});