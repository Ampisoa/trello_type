import { Router, Request, Response } from 'express';
import { getPool, query, memoryDb } from '../db';
import { InvitedVisitor, UserProfile } from '../../src/types';
import { authenticateToken, requireStaff, AuthenticatedRequest, signVisitorToken, verifyVisitorToken } from '../middleware/auth';

export const visitorsRouter = Router();

// GET /api/v1/visitors/verify?token=... (Public: verifies a signed visitor link)
visitorsRouter.get('/verify', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ valid: false, detail: 'Jeton de visiteur manquant.' });
  }

  const payload = verifyVisitorToken(token);
  if (!payload || !payload.email) {
    return res.status(401).json({ valid: false, detail: 'Jeton de visiteur invalide ou expiré.' });
  }

  const cleanEmail = payload.email.toLowerCase().trim();

  // Verify that the visitor is still present on the target card (not revoked)
  if (payload.cardId) {
    const cards = memoryDb.getCards();
    const card = cards.find((c) => c.id === payload.cardId);
    if (card && card.invitedVisitors) {
      const isInvited = card.invitedVisitors.some((v) => v.email.toLowerCase() === cleanEmail);
      if (!isInvited) {
        return res.status(403).json({
          valid: false,
          detail: "Cet accès observateur a été révoqué par l'équipe d'atelier.",
        });
      }
    }
  }

  const visitorUser: UserProfile = {
    id: `vis-session-${encodeURIComponent(cleanEmail)}`,
    name: payload.name || cleanEmail.split('@')[0],
    email: cleanEmail,
    role: 'visiteur',
    posteLabel: 'Visiteur Invité (Accès Sécurisé par Jeton)',
    avatar: `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(cleanEmail)}&eyes=variant08&hair=variant14`,
    invitedCardIds: payload.cardId ? [payload.cardId] : [],
    invitedBoardIds: payload.boardId ? [payload.boardId] : [],
    invitedPoleIds: payload.poleId ? [payload.poleId] : [],
  };

  return res.json({
    valid: true,
    user: visitorUser,
    cardId: payload.cardId || null,
    boardId: payload.boardId || null,
    poleId: payload.poleId || null,
  });
});

// GET /api/v1/visitors/token (Protected: Staff only - generate signed token for any visitor)
visitorsRouter.get('/token', authenticateToken, requireStaff, (req: Request, res: Response) => {
  const { email, name, card_id, board_id, pole_id } = req.query as Record<string, string>;
  if (!email) {
    return res.status(400).json({ detail: 'Email requis.' });
  }

  const token = signVisitorToken({
    email,
    name,
    cardId: card_id,
    boardId: board_id,
    poleId: pole_id,
  });

  res.json({ token, email, cardId: card_id, boardId: board_id, poleId: pole_id });
});

// POST /api/v1/visitors/invite (Protected: Staff only)
visitorsRouter.post('/invite', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const tokenUser = (req as AuthenticatedRequest).user;
  const { card_id, email, name, notes, invited_by } = req.body;
  const inviter_name = tokenUser?.name || req.query.inviter_name || 'Responsable Point Clients';
  const inviter_role = tokenUser?.role || req.query.inviter_role || 'resp_point_clients';

  if (!card_id || !email) {
    return res.status(400).json({ detail: 'card_id et email sont obligatoires.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const visitorName = name || cleanEmail.split('@')[0];
  const avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(visitorName)}&eyes=variant08&hair=variant14`;

  try {
    const cards = memoryDb.getCards();
    const card = cards.find((c) => c.id === card_id);
    if (!card) {
      return res.status(404).json({ detail: 'Carte introuvable' });
    }

    // Check if visitor is already invited on this card
    if (card.invitedVisitors?.some((v) => v.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ detail: 'Ce visiteur est déjà invité sur cette fiche.' });
    }

    const visitorToken = signVisitorToken({
      email: cleanEmail,
      name: visitorName,
      cardId: card_id,
    });

    const newVisitor: InvitedVisitor = {
      id: `vis-${Date.now()}`,
      email: cleanEmail,
      name: visitorName,
      avatar: avatarUrl,
      invitedAt: new Date().toLocaleDateString('fr-FR'),
      invitedBy: `${inviter_name} (${inviter_role})`,
      notes: notes || '',
      token: visitorToken,
    };

    const updatedVisitors = [...(card.invitedVisitors || []), newVisitor];
    const updatedHistory = [
      {
        id: `log-${Date.now()}`,
        cardId: card.id,
        authorName: String(inviter_name),
        authorRole: String(inviter_role) as any,
        action: 'Invitation Visiteur Observateur',
        details: `Visiteur '${visitorName}' (${cleanEmail}) invité en observation exclusive`,
        timestamp: new Date().toISOString(),
      },
      ...(card.historyLogs || []),
    ];

    card.invitedVisitors = updatedVisitors;
    card.historyLogs = updatedHistory;
    memoryDb.setCards([...cards]);

    // Update in SQLite if connected
    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      await query(
        `UPDATE cards SET
          invited_visitors = $1,
          history_logs = $2
         WHERE id = $3`,
        [JSON.stringify(updatedVisitors), JSON.stringify(updatedHistory), card_id]
      );
    }

    res.status(201).json(newVisitor);
  } catch (err: any) {
    console.error('[API /visitors/invite] Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/v1/visitors/:card_id/:email (Protected: Staff only)
visitorsRouter.delete('/:card_id/:email', authenticateToken, requireStaff, async (req: Request, res: Response) => {
  const { card_id, email } = req.params;
  const tokenUser = (req as AuthenticatedRequest).user;
  const revoker_name = tokenUser?.name || req.query.revoker_name || 'Responsable Point Clients';
  const revoker_role = tokenUser?.role || req.query.revoker_role || 'resp_point_clients';

  const cleanEmail = decodeURIComponent(email).toLowerCase().trim();

  try {
    const cards = memoryDb.getCards();
    const card = cards.find((c) => c.id === card_id);
    if (!card) {
      return res.status(404).json({ detail: 'Carte introuvable' });
    }

    card.invitedVisitors = (card.invitedVisitors || []).filter((v) => v.email.toLowerCase() !== cleanEmail);
    card.historyLogs = [
      {
        id: `log-${Date.now()}`,
        cardId: card.id,
        authorName: String(revoker_name),
        authorRole: String(revoker_role) as any,
        action: 'Révocation Visiteur Observateur',
        details: `Accès observateur de ${cleanEmail} révoqué par ${revoker_name}`,
        timestamp: new Date().toISOString(),
      },
      ...(card.historyLogs || []),
    ];
    memoryDb.setCards([...cards]);

    const pool = getPool();
    if (pool && memoryDb.isConnected()) {
      await query(
        `UPDATE cards SET invited_visitors = $1, history_logs = $2 WHERE id = $3`,
        [JSON.stringify(card.invitedVisitors), JSON.stringify(card.historyLogs), card_id]
      );
    }

    res.json({ status: 'success', message: `Visiteur ${cleanEmail} révoqué avec succès.` });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});
