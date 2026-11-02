import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { StepDefinition } from '../../src/types';
import { rowToStep } from '../utils/mappers';
import { authenticateToken, requireStaff } from '../middleware/auth';

export const stepsRouter = Router();

// GET /api/v1/steps (Authenticated users only)
stepsRouter.get('/', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // GET /api/v1/steps (Authenticated users only)
    if (memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM steps ORDER BY order_index ASC');
        if (result && result.rows.length > 0) {
          return res.json(result.rows.map(rowToStep));
        }
      } catch (dbErr: any) {
        console.warn('[API /steps GET] SQLite lookup notice:', dbErr.message);
      }
    }
    return res.json(memoryDb.getSteps());
  } catch (err: any) {
    console.error('[API /steps GET] Error:', err);
    res.json(memoryDb.getSteps());
  }
});

// POST /api/v1/steps (Protected: Staff only)
stepsRouter.post('/', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const step: StepDefinition = req.body;
    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        await query(
          `INSERT INTO steps (id, name, code, order_index, color, description, default_checklists)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            color = EXCLUDED.color,
            description = EXCLUDED.description,
            default_checklists = EXCLUDED.default_checklists`,
          [step.id, step.name, step.code, step.order, step.color, step.description || '', JSON.stringify(step.defaultChecklists || [])]
        );
      } catch (dbErr: any) {
        console.warn('[API /steps POST] PostgreSQL insert notice:', dbErr.message);
      }
    }
    const current = memoryDb.getSteps();
    memoryDb.setSteps([...current, step]);
    res.status(201).json(step);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /api/v1/steps/:id (Protected: Staff only)
stepsRouter.put('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates: Partial<StepDefinition> = req.body;

  try {
    const pool = getPool();
    const currentSteps = memoryDb.getSteps();
    const stepIdx = currentSteps.findIndex((s) => s.id === id);

    if (stepIdx === -1) {
      const newStep: StepDefinition = {
        id,
        name: updates.name || 'Nouvelle Étape',
        code: updates.code || id.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
        order: updates.order ?? currentSteps.length + 1,
        color: updates.color || '#4f46e5',
        description: updates.description || '',
        defaultChecklists: updates.defaultChecklists || [],
      };
      memoryDb.setSteps([...currentSteps, newStep]);

      if (pool && memoryDb.isConnected()) {
        try {
          await query(
            `INSERT INTO steps (id, name, code, order_index, color, description, default_checklists)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              color = EXCLUDED.color,
              description = EXCLUDED.description,
              default_checklists = EXCLUDED.default_checklists`,
            [
              newStep.id,
              newStep.name,
              newStep.code,
              newStep.order,
              newStep.color,
              newStep.description,
              JSON.stringify(newStep.defaultChecklists),
            ]
          );
        } catch (dbErr: any) {
          console.warn('[API /steps PUT upsert] SQLite notice:', dbErr.message);
        }
      }
      return res.status(201).json(newStep);
    }

    const updated = { ...currentSteps[stepIdx], ...updates };
    currentSteps[stepIdx] = updated;
    memoryDb.setSteps([...currentSteps]);

    if (pool && memoryDb.isConnected()) {
      try {
        await query(
          `UPDATE steps SET
            name = COALESCE($1, name),
            color = COALESCE($2, color),
            description = COALESCE($3, description),
            default_checklists = COALESCE($4, default_checklists),
            order_index = COALESCE($5, order_index)
           WHERE id = $6`,
          [
            updates.name || null,
            updates.color || null,
            updates.description || null,
            updates.defaultChecklists ? JSON.stringify(updates.defaultChecklists) : null,
            updates.order !== undefined ? updates.order : null,
            id,
          ]
        );
      } catch (dbErr: any) {
        console.warn('[API /steps PUT] PostgreSQL update notice:', dbErr.message);
      }
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/v1/steps/:id (Protected: Staff only)
stepsRouter.delete('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const currentSteps = memoryDb.getSteps();
    const remainingSteps = currentSteps.filter((s) => s.id !== id);

    if (currentSteps.length === remainingSteps.length) {
      return res.status(404).json({ detail: 'Étape non trouvée' });
    }

    if (remainingSteps.length === 0) {
      return res.status(400).json({ detail: 'Impossible de supprimer la dernière étape du pipeline.' });
    }

    const fallbackStepId = remainingSteps[0].id;

    // 1. Update in-memory state
    memoryDb.setSteps(remainingSteps);

    const currentCards = memoryDb.getCards();
    let orphanCardsCount = 0;
    const updatedCards = currentCards.map((c) => {
      if (c.currentStepId === id) {
        orphanCardsCount++;
        return { ...c, currentStepId: fallbackStepId };
      }
      return c;
    });
    if (orphanCardsCount > 0) {
      memoryDb.setCards(updatedCards);
    }

    // 2. Persist to SQLite database
    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      try {
        // First reassign existing cards to the fallback step
        await query('UPDATE cards SET current_step_id = $1 WHERE current_step_id = $2', [
          fallbackStepId,
          id,
        ]);
        // Then delete the step
        await query('DELETE FROM steps WHERE id = $1', [id]);
      } catch (dbErr: any) {
        console.warn('[API /steps DELETE] SQLite delete notice:', dbErr.message);
      }
    }

    res.json({
      status: 'success',
      deletedId: id,
      reassignedStepId: fallbackStepId,
      reassignedCardsCount: orphanCardsCount,
    });
  } catch (err: any) {
    console.error('[API /steps DELETE] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});
