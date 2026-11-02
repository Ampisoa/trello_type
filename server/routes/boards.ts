import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { CustomBoard } from '../../src/types';
import { rowToBoard } from '../utils/mappers';
import { authenticateToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

export const boardsRouter = Router();

// GET /api/v1/boards - List all boards (Authenticated users)
// Visitors (invited observers) only see boards they are invited to.
boardsRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  const tokenUser = (req as AuthenticatedRequest).user;
  try {
    const pool = getPool();
    let boards: CustomBoard[] = [];
    if (pool && memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM boards ORDER BY created_at ASC');
        boards = result.rows.length > 0 ? result.rows.map(rowToBoard) : memoryDb.getBoards();
      } catch (dbErr: any) {
        console.warn('[API /boards GET] SQLite notice:', dbErr.message);
        boards = memoryDb.getBoards();
      }
    } else {
      boards = memoryDb.getBoards();
    }

    // Role-based visibility: invited visitors only see boards they can access.
    if (tokenUser && tokenUser.role === 'visiteur') {
      const userEmail = (tokenUser.email || '').toLowerCase().trim();
      const cards = memoryDb.getCards();
      const poles = memoryDb.getPoles();
      boards = boards.filter((b) => {
        if (b.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail)) return true;
        if (b.poleId) {
          const parentPole = poles.find((p) => p.id === b.poleId);
          if (parentPole?.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail)) return true;
        }
        return (b.cardIds || []).some((cid) => {
          const c = cards.find((x) => x.id === cid);
          return c?.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail);
        });
      });
    }

    return res.json(boards);
  } catch (err: any) {
    console.error('[API /boards GET] Error:', err);
    res.json(memoryDb.getBoards());
  }
});

// POST /api/v1/boards - Create Board (Protected: Staff only)
boardsRouter.post('/', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const b: CustomBoard = req.body;
    const boardId = b.id || `board-${Date.now()}`;
    const newBoard: CustomBoard = {
      ...b,
      id: boardId,
      title: b.title || 'Nouveau Tableau',
      cardIds: b.cardIds || [],
      steps: b.steps && b.steps.length > 0 ? b.steps : [],
      invitedVisitors: b.invitedVisitors || [],
      createdAt: b.createdAt || new Date().toISOString(),
    };

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query(
          `INSERT INTO boards (id, title, description, color, background_image, card_ids, steps, pole_id, invited_visitors)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            color = EXCLUDED.color,
            background_image = EXCLUDED.background_image,
            card_ids = EXCLUDED.card_ids,
            steps = EXCLUDED.steps,
            pole_id = EXCLUDED.pole_id,
            invited_visitors = EXCLUDED.invited_visitors,
            updated_at = CURRENT_TIMESTAMP`,
          [
            newBoard.id,
            newBoard.title,
            newBoard.description || '',
            newBoard.color || 'indigo',
            newBoard.backgroundImage || null,
            JSON.stringify(newBoard.cardIds),
            JSON.stringify(newBoard.steps),
            newBoard.poleId || null,
            JSON.stringify(newBoard.invitedVisitors),
          ]
        );
      } catch (dbErr: any) {
        console.warn('[API /boards POST] PostgreSQL insert notice:', dbErr.message);
      }
    }

    memoryDb.setBoards([...memoryDb.getBoards(), newBoard]);
    res.status(201).json(newBoard);
  } catch (err: any) {
    console.error('[API /boards POST] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/v1/boards/:id - Update Board (Protected: Staff only)
boardsRouter.put('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates: Partial<CustomBoard> = req.body;

  try {
    const currentBoards = memoryDb.getBoards();
    const idx = currentBoards.findIndex((b) => b.id === id);

    if (idx === -1) {
      return res.status(404).json({ detail: 'Tableau non trouvé' });
    }

    const updatedBoard: CustomBoard = {
      ...currentBoards[idx],
      ...updates,
      id,
    };

    currentBoards[idx] = updatedBoard;
    memoryDb.setBoards([...currentBoards]);

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query(
          `UPDATE boards SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            color = COALESCE($3, color),
            background_image = COALESCE($4, background_image),
            card_ids = COALESCE($5, card_ids),
            pole_id = COALESCE($6, pole_id),
            invited_visitors = COALESCE($7, invited_visitors),
            steps = COALESCE($8, steps),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $9`,
          [
            updates.title || null,
            updates.description !== undefined ? updates.description : null,
            updates.color || null,
            updates.backgroundImage !== undefined ? updates.backgroundImage : null,
            updates.cardIds ? JSON.stringify(updates.cardIds) : null,
            updates.poleId !== undefined ? updates.poleId : null,
            updates.invitedVisitors ? JSON.stringify(updates.invitedVisitors) : null,
            updates.steps && updates.steps.length > 0 ? JSON.stringify(updates.steps) : null,
            id,
          ]
        );
      } catch (dbErr: any) {
        console.warn('[API /boards PUT] SQLite update notice:', dbErr.message);
      }
    }

    res.json(updatedBoard);
  } catch (err: any) {
    console.error('[API /boards PUT] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/v1/boards/:id - Delete Board (Protected: Staff only)
boardsRouter.delete('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const currentBoards = memoryDb.getBoards();
    memoryDb.setBoards(currentBoards.filter((b) => b.id !== id));

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query('DELETE FROM boards WHERE id = $1', [id]);
      } catch (dbErr: any) {
        console.warn('[API /boards DELETE] SQLite notice:', dbErr.message);
      }
    }

    res.json({ status: 'success', deletedId: id });
  } catch (err: any) {
    console.error('[API /boards DELETE] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});
