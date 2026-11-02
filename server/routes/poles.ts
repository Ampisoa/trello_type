import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { MerchPole } from '../../src/types';
import { rowToPole } from '../utils/mappers';
import { authenticateToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

export const polesRouter = Router();

// GET /api/v1/poles - List all poles (Authenticated users)
// Visitors (invited observers) only see poles they are invited to.
polesRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  const tokenUser = (req as AuthenticatedRequest).user;
  try {
    const pool = getPool();
    let poles: MerchPole[] = [];
    if (pool && memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM poles ORDER BY created_at ASC');
        poles = result.rows.length > 0 ? result.rows.map(rowToPole) : memoryDb.getPoles();
      } catch (dbErr: any) {
        console.warn('[API /poles GET] SQLite notice:', dbErr.message);
        poles = memoryDb.getPoles();
      }
    } else {
      poles = memoryDb.getPoles();
    }

    // Role-based visibility: invited visitors only see poles they can access.
    if (tokenUser && tokenUser.role === 'visiteur') {
      const userEmail = (tokenUser.email || '').toLowerCase().trim();
      const boards = memoryDb.getBoards();
      poles = poles.filter((p) => {
        if (p.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail)) return true;
        const linked = boards.filter((b) => b.poleId === p.id || (p.boardIds || []).includes(b.id));
        return linked.some((b) => b.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail));
      });
    }

    return res.json(poles);
  } catch (err: any) {
    console.error('[API /poles GET] Error:', err);
    res.json(memoryDb.getPoles());
  }
});

// POST /api/v1/poles - Create Pole (Protected: Staff only)
polesRouter.post('/', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const p: MerchPole = req.body;
    const poleId = p.id || `pole-${Date.now()}`;
    const newPole: MerchPole = {
      ...p,
      id: poleId,
      name: p.name || 'Nouveau Pôle',
      leaderIds: p.leaderIds || [],
      leaderNames: p.leaderNames || [],
      boardIds: p.boardIds || [],
      invitedVisitors: p.invitedVisitors || [],
      createdAt: p.createdAt || new Date().toISOString(),
    };

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query(
          `INSERT INTO poles (id, name, leader_ids, leader_names, description, color, phone, email, board_ids, invited_visitors, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            leader_ids = EXCLUDED.leader_ids,
            leader_names = EXCLUDED.leader_names,
            description = EXCLUDED.description,
            color = EXCLUDED.color,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            board_ids = EXCLUDED.board_ids,
            invited_visitors = EXCLUDED.invited_visitors,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP`,
          [
            newPole.id,
            newPole.name,
            JSON.stringify(newPole.leaderIds),
            JSON.stringify(newPole.leaderNames),
            newPole.description || '',
            newPole.color || 'indigo',
            newPole.phone || '',
            newPole.email || '',
            JSON.stringify(newPole.boardIds),
            JSON.stringify(newPole.invitedVisitors),
            newPole.notes || '',
          ]
        );
      } catch (dbErr: any) {
        console.warn('[API /poles POST] PostgreSQL insert notice:', dbErr.message);
      }
    }

    memoryDb.setPoles([...memoryDb.getPoles(), newPole]);
    res.status(201).json(newPole);
  } catch (err: any) {
    console.error('[API /poles POST] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/v1/poles/:id - Update Pole (Protected: Staff only)
polesRouter.put('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates: Partial<MerchPole> = req.body;

  try {
    const currentPoles = memoryDb.getPoles();
    const idx = currentPoles.findIndex((p) => p.id === id);

    if (idx === -1) {
      return res.status(404).json({ detail: 'Pôle non trouvé' });
    }

    const updatedPole: MerchPole = {
      ...currentPoles[idx],
      ...updates,
      id,
    };

    currentPoles[idx] = updatedPole;
    memoryDb.setPoles([...currentPoles]);

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query(
          `UPDATE poles SET
            name = COALESCE($1, name),
            leader_ids = COALESCE($2, leader_ids),
            leader_names = COALESCE($3, leader_names),
            description = COALESCE($4, description),
            color = COALESCE($5, color),
            phone = COALESCE($6, phone),
            email = COALESCE($7, email),
            board_ids = COALESCE($8, board_ids),
            invited_visitors = COALESCE($9, invited_visitors),
            notes = COALESCE($10, notes),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $11`,
          [
            updates.name || null,
            updates.leaderIds ? JSON.stringify(updates.leaderIds) : null,
            updates.leaderNames ? JSON.stringify(updates.leaderNames) : null,
            updates.description !== undefined ? updates.description : null,
            updates.color || null,
            updates.phone !== undefined ? updates.phone : null,
            updates.email !== undefined ? updates.email : null,
            updates.boardIds ? JSON.stringify(updates.boardIds) : null,
            updates.invitedVisitors ? JSON.stringify(updates.invitedVisitors) : null,
            updates.notes !== undefined ? updates.notes : null,
            id,
          ]
        );
      } catch (dbErr: any) {
        console.warn('[API /poles PUT] SQLite update notice:', dbErr.message);
      }
    }

    res.json(updatedPole);
  } catch (err: any) {
    console.error('[API /poles PUT] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/v1/poles/:id - Delete Pole (Protected: Staff only)
polesRouter.delete('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const currentPoles = memoryDb.getPoles();
    memoryDb.setPoles(currentPoles.filter((p) => p.id !== id));

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query('DELETE FROM poles WHERE id = $1', [id]);
      } catch (dbErr: any) {
        console.warn('[API /poles DELETE] SQLite notice:', dbErr.message);
      }
    }

    res.json({ status: 'success', deletedId: id });
  } catch (err: any) {
    console.error('[API /poles DELETE] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});
