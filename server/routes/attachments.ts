import { Router, Request, Response } from 'express';
import { query, memoryDb } from '../db';
import { CardAttachment } from '../../src/types';
import { authenticateToken, requireStaff, AuthenticatedRequest } from '../middleware/auth';

export const attachmentsRouter = Router();

// POST /api/v1/attachments/:card_id (Protected: Staff only)
attachmentsRouter.post('/:card_id', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { card_id } = req.params;
  const tokenUser = (req as AuthenticatedRequest).user;
  const { name, fileUrl, mimeType, size, category = 'attachement' } = req.body;
  const uploadedBy = tokenUser?.name || req.body.uploadedBy || 'Utilisateur';

  if (!fileUrl || !name) {
    return res.status(400).json({ detail: 'name et fileUrl sont obligatoires.' });
  }

  try {
    const cards = memoryDb.getCards();
    const card = cards.find((c) => c.id === card_id);
    if (!card) {
      return res.status(404).json({ detail: 'Carte non trouvée' });
    }

    const newAttachment: CardAttachment = {
      id: `att-${Date.now()}`,
      name,
      fileUrl,
      mimeType: mimeType || 'application/octet-stream',
      size: size || '1.0 Mo',
      category,
      uploadedAt: new Date().toLocaleDateString('fr-FR'),
      uploadedBy,
    };

    if (category === 'dossier_technique') {
      card.dossierTechnique = newAttachment;
    } else if (category === 'frame') {
      card.frame = newAttachment;
    } else {
      card.attachments = [...(card.attachments || []), newAttachment];
    }

    memoryDb.setCards([...cards]);

    if (memoryDb.isConnected()) {
      await query(
        `UPDATE cards SET
          dossier_technique = $1,
          frame = $2,
          attachments = $3
         WHERE id = $4`,
        [JSON.stringify(card.dossierTechnique), JSON.stringify(card.frame), JSON.stringify(card.attachments), card_id]
      );
    }

    res.status(201).json(newAttachment);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});
