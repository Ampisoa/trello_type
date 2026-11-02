import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { Card } from '../../src/types';
import { rowToCard, rowToUser } from '../utils/mappers';
import {
  authenticateToken,
  requireStaff,
  AuthenticatedRequest,
} from '../middleware/auth';

export const cardsRouter = Router();

// GET /api/v1/cards - List cards with role/search filtering (Authenticated users)
cardsRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
  const tokenUser = (req as AuthenticatedRequest).user;
  const user_id = tokenUser?.id || (req.query.user_id as string | undefined);
  const role = tokenUser?.role || (req.query.role as string | undefined);
  const search = req.query.search as string | undefined;
  const step_id = req.query.step_id as string | undefined;

  try {
    const pool = getPool();
    let cards: Card[] = [];

    if (memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM cards ORDER BY created_at DESC');
        cards = result.rows.map(rowToCard);
      } catch (dbErr: any) {
        console.warn('[API /cards] SQLite query notice (using fallback):', dbErr.message);
        cards = memoryDb.getCards();
      }
    } else {
      cards = memoryDb.getCards();
    }

    // Role-based visibility filtering (only for invited visitor / observer accounts)
    if (role === 'visiteur') {
      const dbConnected = Boolean(pool && memoryDb.isConnected());
      // Resolve the visitor's invited cards from the database first (source of
      // truth), falling back to the in-memory mirror for memory-only mode.
      let uRes;
      if (memoryDb.isConnected()) {
      try {
        const result = await query(
          'SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($2)',
          [user_id || '', tokenUser?.email || '']
        );
        uRes = result.rows.length > 0 ? rowToUser(result.rows[0]) : undefined;
      } catch {
        uRes = memoryDb.getUsers().find((u) => u.id === user_id || u.email.toLowerCase() === tokenUser?.email);
      }
    } else {
      uRes = memoryDb.getUsers().find((u) => u.id === user_id || u.email.toLowerCase() === tokenUser?.email);
    }
      const allowedIds = new Set(uRes?.invitedCardIds || []);
      const userEmail = (tokenUser?.email || uRes?.email || '').toLowerCase().trim();
      cards = cards.filter(
        (c) =>
          allowedIds.has(c.id) ||
          (userEmail && c.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail))
      );
    }

    // Step filtering
    if (step_id) {
      cards = cards.filter((c) => c.currentStepId === step_id);
    }

    // Keyword search
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.reference.toLowerCase().includes(q) ||
          c.modele.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q)
      );
    }

    res.json(cards);
  } catch (err: any) {
    console.error('[API /cards GET] Error:', err);
    res.json(memoryDb.getCards());
  }
});

// Helper to generate the next unique sequential reference (e.g. REF-2026-004)
function generateNextServerReference(existingCards: Card[]): string {
  const currentYear = new Date().getFullYear();
  let maxSeq = 0;
  const regex = new RegExp(`^REF-${currentYear}-(\\d+)$`, 'i');

  existingCards.forEach((c) => {
    if (!c.reference) return;
    const match = c.reference.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  let candidate = `REF-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  let attempt = 1;
  while (existingCards.some((c) => c.reference && c.reference.trim().toLowerCase() === candidate.toLowerCase())) {
    candidate = `REF-${currentYear}-${String(nextSeq + attempt).padStart(3, '0')}`;
    attempt++;
  }
  return candidate;
}

// Alphabetic comparison (reference) used as the default card order inside a step.
function compareCardReferences(a: Card, b: Card): number {
  const cmp = a.reference.localeCompare(b.reference, 'fr', { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return a.id.localeCompare(b.id);
}

// Recompute the alphabetical sort_order of every card belonging to the given
// steps. Returns a map of cardId -> index. Only the provided steps are touched,
// so a manually re-ordered step is never reset by an unrelated edit.
function recomputeStepOrders(cards: Card[], affectedSteps: Set<string>): Map<string, number> {
  const orders = new Map<string, number>();
  for (const stepId of affectedSteps) {
    const members = cards.filter((c) => c.currentStepId === stepId);
    const sorted = [...members].sort(compareCardReferences);
    sorted.forEach((c, i) => orders.set(c.id, i));
  }
  return orders;
}

// GET /api/v1/cards/next-reference - Generate next available unique reference
cardsRouter.get('/next-reference', authenticateToken, (req: Request, res: Response) => {
  const currentCards = memoryDb.getCards();
  const nextReference = generateNextServerReference(currentCards);
  res.json({ nextReference });
});

// GET /api/v1/cards/:id (Authenticated users; visitors get access checks below)
cardsRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const tokenUser = (req as AuthenticatedRequest).user;

  try {
    let card: Card | undefined;

    if (memoryDb.isConnected()) {
      try {
        const result = await query('SELECT * FROM cards WHERE id = $1', [id]);
        if (result.rows.length > 0) {
          card = rowToCard(result.rows[0]);
        }
      } catch (dbErr) {
        card = memoryDb.getCards().find((c) => c.id === id);
      }
    }

    if (!card) {
      card = memoryDb.getCards().find((c) => c.id === id);
    }

    if (!card) {
      return res.status(404).json({ detail: 'Fiche non trouvée' });
    }

    if (tokenUser && tokenUser.role === 'visiteur') {
      const userEmail = (tokenUser.email || '').toLowerCase().trim();
      // Resolve the visitor's invited cards from the database first (source of
      // truth), falling back to the in-memory mirror for memory-only mode.
      let uRes;
      if (memoryDb.isConnected()) {
        try {
          const uDb = await query(
            'SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($2)',
            [tokenUser.id, tokenUser.email || '']
          );
          uRes = uDb.rows.length > 0 ? rowToUser(uDb.rows[0]) : undefined;
        } catch {
          uRes = memoryDb.getUsers().find((u) => u.id === tokenUser.id || u.email.toLowerCase() === userEmail);
        }
      } else {
        uRes = memoryDb.getUsers().find((u) => u.id === tokenUser.id || u.email.toLowerCase() === userEmail);
      }
      const allowedIds = new Set(uRes?.invitedCardIds || []);
      const isInvited = allowedIds.has(card.id) || (userEmail && card.invitedVisitors?.some((v) => v.email.toLowerCase() === userEmail));
      if (!isInvited) {
        return res.status(403).json({ error: 'Accès refusé: Vous n\'avez pas la permission de consulter cette fiche.' });
      }
    }

    res.json(card);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/v1/cards - Create Card (Protected: Staff only)
cardsRouter.post('/', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const cardData: Card = req.body;
    const cardId = cardData.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const currentCards = memoryDb.getCards();

    // Generate the next sequential reference when none is provided.
    let finalReference = cardData.reference ? cardData.reference.trim() : '';
    if (!finalReference) {
      finalReference = generateNextServerReference(currentCards);
    }

    const newCard: Card = {
      ...cardData,
      id: cardId,
      reference: finalReference,
      modele: cardData.modele || 'Nouveau Modèle',
      clientName: cardData.clientName || 'Client',
      currentStepId: cardData.currentStepId || memoryDb.getSteps()[0]?.id || 'step-1',
      status: cardData.status || 'en_cours',
      archived: Boolean(cardData.archived),
      dateCreation: cardData.dateCreation || new Date().toISOString().split('T')[0],
      dateLivraison: cardData.dateLivraison || new Date().toISOString().split('T')[0],
      dueDate: cardData.dueDate,
      dueDateNotes: cardData.dueDateNotes,
      merchandiserName: cardData.merchandiserName,
      merchandiserId: cardData.merchandiserId,
      merchandiserAvatar: cardData.merchandiserAvatar,
      attachments: cardData.attachments || [],
      members: cardData.members || [],
      merchandisers: cardData.merchandisers || [],
      stepChecklists: cardData.stepChecklists || {},
      labels: cardData.labels || [],
      historyLogs: cardData.historyLogs || [],
      invitedVisitors: cardData.invitedVisitors || [],
      comments: cardData.comments || [],
    };

    const dbConnected = memoryDb.isConnected();

    // Default placement: the new card is inserted at its alphabetical position
    // among the other cards of its step (sort_order recomputed for the whole step).
    const othersInStep = memoryDb.getCards().filter(
      (c) => c.currentStepId === newCard.currentStepId && c.id !== newCard.id
    );
    const stepOrderMap = recomputeStepOrders([...othersInStep, newCard], new Set([newCard.currentStepId]));
    newCard.sortOrder = stepOrderMap.get(newCard.id);

    // When PostgreSQL is connected it is the source of truth: the card is only
    // added to memory AFTER a successful insert. This avoids ghost cards that
    // would silently disappear on the next restart.
    if (dbConnected) {
      try {
        await query(
          `INSERT INTO cards (
            id, reference, modele, client_name, current_step_id, status,
            date_creation, date_livraison, due_date, due_date_notes,
            merchandiser_name, merchandiser_id, merchandiser_avatar,
            matiere, prix, quantites, vagues, historique_note,
            dossier_technique, frame, attachments, members, merchandisers,
            step_checklists, labels, history_logs, invited_visitors, comments,
            sort_order, archived
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
          ON CONFLICT (id) DO UPDATE SET
            reference = EXCLUDED.reference,
            modele = EXCLUDED.modele,
            client_name = EXCLUDED.client_name,
            current_step_id = EXCLUDED.current_step_id,
            status = EXCLUDED.status,
            date_livraison = EXCLUDED.date_livraison,
            due_date = EXCLUDED.due_date,
            due_date_notes = EXCLUDED.due_date_notes,
            merchandiser_name = EXCLUDED.merchandiser_name,
            merchandiser_id = EXCLUDED.merchandiser_id,
            merchandiser_avatar = EXCLUDED.merchandiser_avatar,
            sort_order = EXCLUDED.sort_order,
            archived = EXCLUDED.archived,
            updated_at = CURRENT_TIMESTAMP`,
          [
            newCard.id,
            newCard.reference,
            newCard.modele,
            newCard.clientName,
            newCard.currentStepId,
            newCard.status,
            newCard.dateCreation,
            newCard.dateLivraison,
            newCard.dueDate || null,
            newCard.dueDateNotes || null,
            newCard.merchandiserName || null,
            newCard.merchandiserId || null,
            newCard.merchandiserAvatar || null,
            newCard.descriptionSpec?.matiere || '',
            String(newCard.descriptionSpec?.prix || 0),
            String(newCard.descriptionSpec?.quantites || 0),
            JSON.stringify(newCard.descriptionSpec?.vagues || []),
            newCard.descriptionSpec?.historiqueNote || '',
            JSON.stringify(newCard.dossierTechnique || null),
            JSON.stringify(newCard.frame || null),
            JSON.stringify(newCard.attachments || []),
            JSON.stringify(newCard.members || []),
            JSON.stringify(newCard.merchandisers || []),
            JSON.stringify(newCard.stepChecklists || {}),
            JSON.stringify(newCard.labels || []),
            JSON.stringify(newCard.historyLogs || []),
            JSON.stringify(newCard.invitedVisitors || []),
            JSON.stringify(newCard.comments || []),
            newCard.sortOrder ?? null,
            newCard.archived ? true : false,
          ]
        );

        // Persist the recomputed alphabetical order of the other cards of the step.
        for (const [cid, idx] of stepOrderMap) {
          if (cid !== newCard.id) {
            await query('UPDATE cards SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [idx, cid]);
          }
        }
      } catch (dbErr: any) {
        console.warn('[API /cards POST] PostgreSQL insert notice:', dbErr.message);
        return res.status(500).json({ detail: 'Erreur lors de la création de la carte en base de données.' });
      }
    }

    memoryDb.setCards(
      [...memoryDb.getCards(), newCard].map((c) =>
        stepOrderMap.has(c.id) ? { ...c, sortOrder: stepOrderMap.get(c.id) } : c
      )
    );
    res.status(201).json(newCard);
  } catch (err: any) {
    console.error('[API /cards POST] Error:', err);
    res.status(500).json({ detail: err.message || 'Erreur lors de la création de la carte' });
  }
});

// PUT /api/v1/cards/:id - Update Card (Protected: Staff only)
cardsRouter.put('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates: Partial<Card> = req.body;
  const dbConnected = Boolean(getPool() && memoryDb.isConnected());

  try {
    // Resolve the current card: memory first, then the database (covers the
    // case where the server restarted and memory is not fully in sync).
    let currentCard = memoryDb.getCards().find((c) => c.id === id);
    if (!currentCard && memoryDb.isConnected()) {
      try {
        const dbRes = await query('SELECT * FROM cards WHERE id = $1', [id]);
        if (dbRes.rows.length > 0) {
          currentCard = rowToCard(dbRes.rows[0]);
        }
      } catch (dbErr: any) {
        console.warn('[API /cards PUT] SQLite lookup notice:', dbErr.message);
      }
    }

    if (!currentCard) {
      return res.status(404).json({ detail: 'Fiche non trouvée' });
    }

    const updatedCard: Card = {
      ...currentCard,
      ...updates,
      id,
    };

    // When the card changes step or its reference is edited, re-compute the
    // alphabetical sort_order of every card in the affected step(s). Manually
    // re-ordered steps are only touched when they are the target of this move.
    let stepOrderMap: Map<string, number> | null = null;
    const stepChanged = updatedCard.currentStepId !== currentCard.currentStepId;
    const refChanged = updatedCard.reference !== currentCard.reference;
    const archivedChanged = updatedCard.archived !== currentCard.archived;
    if (stepChanged || refChanged || archivedChanged) {
      const affectedSteps = new Set<string>();
      if (stepChanged) {
        affectedSteps.add(currentCard.currentStepId);
        affectedSteps.add(updatedCard.currentStepId);
      } else {
        affectedSteps.add(updatedCard.currentStepId);
      }
      const others = memoryDb.getCards().filter((c) => c.id !== id);
      stepOrderMap = recomputeStepOrders([...others, updatedCard], affectedSteps);
      updatedCard.sortOrder = stepOrderMap.get(id);
    }

    // Persist FIRST, then mutate memory, so a database failure never leaves
    // the cache out of sync with the source of truth.
    if (dbConnected) {
      try {
        await query(
          `UPDATE cards SET
            reference = COALESCE($1, reference),
            modele = COALESCE($2, modele),
            client_name = COALESCE($3, client_name),
            current_step_id = COALESCE($4, current_step_id),
            status = COALESCE($5, status),
            date_livraison = COALESCE($6, date_livraison),
            due_date = COALESCE($7, due_date),
            due_date_notes = COALESCE($8, due_date_notes),
            merchandiser_name = COALESCE($9, merchandiser_name),
            merchandiser_id = COALESCE($10, merchandiser_id),
            merchandiser_avatar = COALESCE($11, merchandiser_avatar),
            matiere = COALESCE($12, matiere),
            prix = COALESCE($13, prix),
            quantites = COALESCE($14, quantites),
            vagues = COALESCE($28, vagues),
            historique_note = COALESCE($15, historique_note),
            dossier_technique = COALESCE($16, dossier_technique),
            frame = COALESCE($17, frame),
            attachments = COALESCE($18, attachments),
            members = COALESCE($19, members),
            merchandisers = COALESCE($20, merchandisers),
            step_checklists = COALESCE($21, step_checklists),
            labels = COALESCE($22, labels),
            history_logs = COALESCE($23, history_logs),
            invited_visitors = COALESCE($24, invited_visitors),
            comments = COALESCE($25, comments),
            sort_order = COALESCE($26, sort_order),
            archived = COALESCE($27, archived),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $29`,
          [
            updates.reference ? updates.reference.trim() : null,
            updates.modele || null,
            updates.clientName || null,
            updates.currentStepId || null,
            updates.status || null,
            updates.dateLivraison || null,
            updates.dueDate !== undefined ? updates.dueDate : null,
            updates.dueDateNotes !== undefined ? updates.dueDateNotes : null,
            updates.merchandiserName !== undefined ? updates.merchandiserName : null,
            updates.merchandiserId !== undefined ? updates.merchandiserId : null,
            updates.merchandiserAvatar !== undefined ? updates.merchandiserAvatar : null,
            updates.descriptionSpec?.matiere !== undefined ? String(updates.descriptionSpec.matiere) : null,
            updates.descriptionSpec?.prix !== undefined ? String(updates.descriptionSpec.prix) : null,
            updates.descriptionSpec?.quantites !== undefined ? String(updates.descriptionSpec.quantites) : null,
            updates.descriptionSpec?.historiqueNote !== undefined ? updates.descriptionSpec.historiqueNote : null,
            // Colonnes JSON : `undefined` = "champ non envoyé, conserver la valeur
            // en base", alors que `null` doit VIDER la colonne. JSON.stringify(null)
            // vaut la chaîne 'null' (et non SQL NULL), COALESCE ne rétablit donc
            // plus l'ancienne valeur quand on supprime une photo, un PDF ou une liste.
            updates.dossierTechnique !== undefined ? JSON.stringify(updates.dossierTechnique) : null,
            updates.frame !== undefined ? JSON.stringify(updates.frame) : null,
            updates.attachments !== undefined ? JSON.stringify(updates.attachments) : null,
            updates.members !== undefined ? JSON.stringify(updates.members) : null,
            updates.merchandisers !== undefined ? JSON.stringify(updates.merchandisers) : null,
            updates.stepChecklists !== undefined ? JSON.stringify(updates.stepChecklists) : null,
            updates.labels !== undefined ? JSON.stringify(updates.labels) : null,
            updates.historyLogs !== undefined ? JSON.stringify(updates.historyLogs) : null,
            updates.invitedVisitors !== undefined ? JSON.stringify(updates.invitedVisitors) : null,
            updates.comments !== undefined ? JSON.stringify(updates.comments) : null,
            updatedCard.sortOrder ?? null,
            updates.archived !== undefined ? (updates.archived ? true : false) : null,
            updates.descriptionSpec?.vagues !== undefined ? JSON.stringify(updates.descriptionSpec.vagues || []) : null,
            id,
          ]
        );

        // Persist the recomputed sort_order of the other affected cards.
        if (stepOrderMap) {
          for (const [cid, idx] of stepOrderMap) {
            if (cid !== id) {
              await query('UPDATE cards SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [idx, cid]);
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('[API /cards PUT] SQLite update notice:', dbErr.message);
        return res.status(500).json({ detail: 'Erreur lors de la mise à jour de la fiche en base de données.' });
      }
    }

    // Update memory only after successful persistence (or in memory-only mode).
    let currentCards = memoryDb.getCards();
    if (stepOrderMap) {
      currentCards = currentCards.map((c) =>
        stepOrderMap.has(c.id) ? { ...c, sortOrder: stepOrderMap.get(c.id) } : c
      );
    }
    const cardIdx = currentCards.findIndex((c) => c.id === id);
    if (cardIdx !== -1) {
      currentCards[cardIdx] = updatedCard;
      memoryDb.setCards([...currentCards]);
    } else {
      // Card existed in the database but not in memory (server restart):
      // re-sync it into the cache instead of returning an empty list.
      memoryDb.setCards([updatedCard, ...currentCards]);
    }

    res.json(updatedCard);
  } catch (err: any) {
    console.error('[API /cards PUT] Error:', err);
    res.status(500).json({ detail: err.message || 'Erreur lors de la mise à jour' });
  }
});

// PATCH /api/v1/cards/reorder - Manually reorder cards inside a step (Protected: Staff only)
cardsRouter.patch('/reorder', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { stepId, orderedCardIds } = req.body as { stepId?: string; orderedCardIds?: string[] };

  if (!stepId || !Array.isArray(orderedCardIds) || orderedCardIds.length === 0) {
    return res.status(400).json({ detail: 'Paramètres invalides : stepId et orderedCardIds sont requis.' });
  }

  try {
    const currentCards = memoryDb.getCards();

    // Validate that every card belongs to the requested step.
    for (const cardId of orderedCardIds) {
      const card = currentCards.find((c) => c.id === cardId);
      if (!card || card.currentStepId !== stepId) {
        return res.status(400).json({ detail: `La carte "${cardId}" n'appartient pas à l'étape demandée.` });
      }
    }

    // Persist the new order for each card.
    if (memoryDb.isConnected()) {
      try {
        for (let i = 0; i < orderedCardIds.length; i++) {
          await query('UPDATE cards SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
            i,
            orderedCardIds[i],
          ]);
        }
      } catch (dbErr: any) {
        console.warn('[API /cards reorder] SQLite update notice:', dbErr.message);
        return res.status(500).json({ detail: 'Erreur lors de l\'enregistrement de l\'ordre des cartes.' });
      }
    }

    // Update the in-memory mirror only after successful persistence.
    const orderIndex = new Map(orderedCardIds.map((id, i) => [id, i]));
    memoryDb.setCards(
      currentCards.map((c) => (orderIndex.has(c.id) ? { ...c, sortOrder: orderIndex.get(c.id) } : c))
    );

    // Return the step's cards in their new order.
    const stepCards = memoryDb
      .getCards()
      .filter((c) => c.currentStepId === stepId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    res.json(stepCards);
  } catch (err: any) {
    console.error('[API /cards reorder] Error:', err);
    res.status(500).json({ detail: err.message || 'Erreur lors du réordonnancement des cartes.' });
  }
});

// DELETE /api/v1/cards/:id (Protected: Staff only)
cardsRouter.delete('/:id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const currentCards = memoryDb.getCards();
    memoryDb.setCards(currentCards.filter((c) => c.id !== id));

    if (memoryDb.isConnected()) {
      try {
        await query('DELETE FROM cards WHERE id = $1', [id]);
      } catch (dbErr: any) {
        console.warn('[API /cards DELETE] SQLite delete notice:', dbErr.message);
      }
    }

    res.json({ status: 'success', deletedId: id });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});
