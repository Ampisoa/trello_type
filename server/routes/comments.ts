import { Router, Request, Response } from 'express';
import { query, memoryDb, getPool } from '../db';
import { CardComment } from '../../src/types';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

export const commentsRouter = Router();

// POST /api/v1/comments/:card_id (Protected: Authenticated users except visitors)
commentsRouter.post('/:card_id', authenticateToken, async (req: Request, res: Response) => {
  const { card_id } = req.params;
  const tokenUser = (req as AuthenticatedRequest).user;
  const { content, authorAvatar } = req.body;

  if (tokenUser?.role === 'visiteur') {
    return res.status(403).json({ error: 'Action interdite: Les visiteurs observateurs sont en lecture seule.' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ detail: 'Le contenu du commentaire est requis.' });
  }

  try {
    const cards = memoryDb.getCards();
    const card = cards.find((c) => c.id === card_id);
    if (!card) {
      return res.status(404).json({ detail: 'Carte non trouvée' });
    }

    const newComment: CardComment = {
      id: `comment-${Date.now()}`,
      cardId: card_id,
      authorId: tokenUser?.id,
      authorName: tokenUser?.name || 'Utilisateur',
      authorRole: (tokenUser?.role || 'commercial') as any,
      authorPoste: tokenUser?.posteLabel,
      authorAvatar: authorAvatar || undefined,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(card.comments || []), newComment];
    card.comments = updatedComments;
    memoryDb.setCards([...cards]);

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      await query(`UPDATE cards SET comments = $1 WHERE id = $2`, [JSON.stringify(updatedComments), card_id]);
    }

    res.status(201).json(newComment);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});
