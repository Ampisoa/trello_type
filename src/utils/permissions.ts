import { Card, UserProfile, VisitorSession, MerchPole, CustomBoard } from '../types';

/**
 * Normalizes role / poste strings that may contain mojibake from legacy data
 * migrations (e.g. "directeur g??n??ral" instead of "directeur général").
 */
function cleanAuthString(value: string | undefined | null): string {
  return (value || '').replace(/\?\?/g, 'é').toLowerCase();
}

/**
 * Checks if the user has the "responsable point client" posteLabel (main or temporary).
 */
export function isResponsablePointClient(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const poste = cleanAuthString(user.posteLabel);
  return poste === 'responsable point client';
}

/**
 * Checks if the user has an active temporary "responsable point client temporaire" designation.
 */
export function isTempResponsablePointClient(user: UserProfile | null | undefined): boolean {
  if (!user?.tempResponsablePointClient) return false;
  const temp = user.tempResponsablePointClient;
  if (!temp.isActive) return false;
  const now = new Date();
  const expiresAt = new Date(temp.expiresAt);
  return now < expiresAt;
}

/**
 * Checks if the user is in Visiteur (Observateur) mode.
 */
export function isVisiteur(
  user?: UserProfile | null,
  visitorSession?: VisitorSession | null
): boolean {
  if (visitorSession && visitorSession.email) return true;
  if (!user) return false;
  const role = cleanAuthString(user.role);
  const poste = cleanAuthString(user.posteLabel);

  return role === 'visiteur' || poste.includes('visiteur') || poste.includes('observateur');
}

/**
 * Clients are business identifiers for cards/models, not user accounts.
 */
export function isClient(_user?: UserProfile | null): boolean {
  return false;
}

/**
 * Checks if the user has a commercial/merchandiser role (for VIEW access to assigned items).
 */
function isCommercialOrMerch(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isVisiteur(user) || isClient(user)) return false;

  const role = cleanAuthString(user.role);
  const poste = cleanAuthString(user.posteLabel);

  return (
    role === 'commercial' ||
    role === 'resp_planning' ||
    role === 'planning' ||
    role === 'magasinier' ||
    role === 'fournisseur' ||
    poste.includes('commercial') ||
    poste.includes('merchandiser') ||
    poste.includes('planning')
  );
}

/**
 * Checks if the user is Direction/Admin (full view access).
 */
function isDirectionOrAdmin(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isVisiteur(user) || isClient(user)) return false;

  const role = cleanAuthString(user.role);
  return role === 'directeur' || role === 'directeur général' || role === 'directeur general' || role === 'admin';
}

/**
 * Returns true if the user is verified internal staff (can EDIT).
 * Only "responsable point client" (main or temporary) can edit.
 */
export function isInternalStaff(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (isVisiteur(user) || isClient(user)) return false;

  return isResponsablePointClient(user) || isTempResponsablePointClient(user);
}

/**
 * Returns true if the user can VIEW cards/boards/poles they are assigned to.
 * Includes: responsable point client (edit), temporary responsable (edit), 
 * commercial/merchandiser (view assigned), direction/admin (view all).
 */
export function canUserViewCards(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isVisiteur(user) || isClient(user)) return false;
  
  // Can view if: responsable point client, temp responsable, commercial/merch, or direction/admin
  return isResponsablePointClient(user) 
    || isTempResponsablePointClient(user) 
    || isCommercialOrMerch(user) 
    || isDirectionOrAdmin(user);
}

/**
 * Returns true if the user has permission to create or edit cards, boards, or poles.
 * - Direction (directeur, directeur général, admin): FULL EDIT + Direction environment access
 * - Responsable Point Client (main or temporary): FULL EDIT but NO Direction environment access
 * - Others (commercial, merch, planning, etc.): VIEW ONLY assigned items
 * - Visiteurs: STRICTLY read-only (only explicitly invited)
 */
export function canUserCreateOrEditCards(
  user: UserProfile | null | undefined,
  isVisitorMode: boolean = false
): boolean {
  if (isVisitorMode) return false;
  if (!user) return false;
  if (isVisiteur(user) || isClient(user)) return false;

  // Direction (directeur, directeur général, admin) OR Responsable Point Client (main/temp) can edit
  return isDirectionOrAdmin(user) || isResponsablePointClient(user) || isTempResponsablePointClient(user);
}

/**
 * Returns true if the user is part of General Management / Direction / Admin.
 * Only Direction has the authority to promote users, change system roles, or access Direction views.
 */
export function isDirection(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (isVisiteur(user) || isClient(user)) return false;

  const role = cleanAuthString(user.role);

  // Strict check: only verified system roles are granted Direction authority
  return (
    role === 'directeur' ||
    role === 'directeur général' ||
    role === 'directeur general' ||
    role === 'admin'
  );
}

/**
 * Anti-self-promotion rule: Only Direction/Admin users can change system roles of users.
 * Regular users (Merchandisers, Planning, etc.) cannot modify roles or self-promote.
 */
export function canManageUserRoles(user?: UserProfile | null): boolean {
  return isDirection(user);
}

/**
 * Returns true if the user can assign merchandisers to a card.
 * Only main responsable point client can assign.
 */
export function canAssignMerchandisers(
  user: UserProfile | null | undefined,
  isVisitorMode: boolean = false
): boolean {
  if (isVisitorMode) return false;
  if (!user) return false;
  return isResponsablePointClient(user);
}

/**
 * Returns true if the user can invite visitors by email.
 * Only main responsable point client can invite.
 */
export function canInviteVisitors(
  user: UserProfile | null | undefined,
  isVisitorMode: boolean = false
): boolean {
  if (isVisitorMode) return false;
  if (!user) return false;
  return isResponsablePointClient(user);
}

/**
 * Returns true if the user can remove / revoke visitors from a card, board, or pole.
 * Only main responsable point client can remove.
 */
export function canRemoveVisitors(
  user: UserProfile | null | undefined,
  isVisitorMode: boolean = false
): boolean {
  if (isVisitorMode) return false;
  if (!user) return false;
  return isResponsablePointClient(user);
}

/**
 * Returns true if the user can designate temporary responsable point client.
 * Only main responsable point client can designate.
 */
export function canDesignateTempResponsable(
  user: UserProfile | null | undefined
): boolean {
  if (!user) return false;
  return isResponsablePointClient(user);
}

/**
 * Designates a user as temporary responsable point client.
 * Returns the updated user profile with temp designation.
 */
export function designateTempResponsablePointClient(
  targetUser: UserProfile,
  designatedByUserId: string,
  durationHours: number
): UserProfile {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  return {
    ...targetUser,
    tempResponsablePointClient: {
      designatedBy: designatedByUserId,
      designatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
    },
  };
}

/**
 * Removes temporary responsable point client designation.
 */
export function removeTempResponsablePointClient(targetUser: UserProfile): UserProfile {
  return {
    ...targetUser,
    tempResponsablePointClient: {
      ...(targetUser.tempResponsablePointClient || {
        designatedBy: '',
        designatedAt: '',
        expiresAt: '',
        isActive: false,
      }),
      isActive: false,
    },
  };
}

/**
 * Checks if a user has an active temporary designation and returns info about it.
 */
export function getTempResponsableInfo(user: UserProfile | null | undefined): {
  isActive: boolean;
  designatedBy?: string;
  expiresAt?: string;
  remainingHours?: number;
} | null {
  if (!user?.tempResponsablePointClient?.isActive) return null;
  const now = new Date();
  const expiresAt = new Date(user.tempResponsablePointClient.expiresAt);
  if (now >= expiresAt) return null;
  const remainingMs = expiresAt.getTime() - now.getTime();
  return {
    isActive: true,
    designatedBy: user.tempResponsablePointClient.designatedBy,
    expiresAt: user.tempResponsablePointClient.expiresAt,
    remainingHours: Math.ceil(remainingMs / (1000 * 60 * 60)),
  };
}

/**
 * Checks if a visitor is explicitly invited to a Pole.
 */
export function isVisitorInvitedToPole(
  pole: MerchPole,
  visitorEmail?: string | null,
  user?: UserProfile | null
): boolean {
  const cleanEmail = (visitorEmail || user?.email || '').toLowerCase().trim();
  if (user?.invitedPoleIds && user.invitedPoleIds.includes(pole.id)) return true;
  if (!cleanEmail) return false;

  return Boolean(
    pole.invitedVisitors &&
      pole.invitedVisitors.some(
        (v) => v.email && v.email.toLowerCase().trim() === cleanEmail
      )
  );
}

/**
 * Checks if a visitor is explicitly invited to a Board (directly or via parent Pole).
 */
export function isVisitorInvitedToBoard(
  board: CustomBoard,
  visitorEmail?: string | null,
  user?: UserProfile | null,
  poles?: MerchPole[]
): boolean {
  const cleanEmail = (visitorEmail || user?.email || '').toLowerCase().trim();
  if (user?.invitedBoardIds && user.invitedBoardIds.includes(board.id)) return true;

  // Direct board invite
  if (
    cleanEmail &&
    board.invitedVisitors &&
    board.invitedVisitors.some((v) => v.email && v.email.toLowerCase().trim() === cleanEmail)
  ) {
    return true;
  }

  // Inherited via parent pole invite
  if (board.poleId && poles && poles.length > 0) {
    const parentPole = poles.find((p) => p.id === board.poleId);
    if (parentPole && isVisitorInvitedToPole(parentPole, cleanEmail, user)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a specific card is accessible to an invited visitor by email.
 */
export function isCardVisibleToVisitor(
  card: Card,
  visitorEmail?: string | null,
  user?: UserProfile | null,
  boards?: CustomBoard[],
  poles?: MerchPole[]
): boolean {
  const cleanEmail = (visitorEmail || user?.email || '').toLowerCase().trim();

  // 1. Direct card invitation
  if (user?.invitedCardIds && user.invitedCardIds.includes(card.id)) return true;
  if (
    cleanEmail &&
    card.invitedVisitors &&
    card.invitedVisitors.some((v) => v.email && v.email.toLowerCase().trim() === cleanEmail)
  ) {
    return true;
  }

  // 2. Inherited via Board invitation
  if (boards && boards.length > 0) {
    const boardsWithCard = boards.filter((b) => b.cardIds.includes(card.id));
    for (const b of boardsWithCard) {
      if (isVisitorInvitedToBoard(b, cleanEmail, user, poles)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates whether a card should be visible to a specific user.
 * - Visiteur (Observateur): STRICTLY only cards where invited (directly, via Board, or via Pôle).
 * - Client: STRICTLY only cards matching their clientName or where they are members/invited.
 * - Internal staff (Merchandisers, Direction, Planning): see all cards.
 * - Unknown/unverified accounts: DENY ALL.
 */
export function isCardVisibleToUser(
  card: Card,
  user: UserProfile | null | undefined,
  visitorSession?: VisitorSession | null,
  boards?: CustomBoard[],
  poles?: MerchPole[]
): boolean {
  if (visitorSession && visitorSession.email) {
    return isCardVisibleToVisitor(card, visitorSession.email, user, boards, poles);
  }

  if (!user) return false;

  // If user profile is a visitor (Observateur)
  if (isVisiteur(user)) {
    return isCardVisibleToVisitor(card, user.email, user, boards, poles);
  }

  // If user profile is a Client account: STRICTLY restricted to cards of their clientName or assigned
  if (isClient(user)) {
    const cleanName = (user.name || '')
      .toLowerCase()
      .replace(/\(client\)/gi, '')
      .trim();
    const userEmail = (user.email || '').toLowerCase().trim();

    // Security: If client identity is unknown or empty, DENY ALL cards
    if (!cleanName && !userEmail) {
      return false;
    }

    const matchesClientName = Boolean(
      cleanName &&
      cleanName.length > 1 &&
      card.clientName &&
      card.clientName.toLowerCase().includes(cleanName)
    );

    const matchesEmail = Boolean(
      userEmail &&
      (card.members?.some((m) => m.email?.toLowerCase() === userEmail) ||
       card.invitedVisitors?.some((v) => v.email?.toLowerCase() === userEmail))
    );

    return matchesClientName || matchesEmail;
  }

  // Users with view permissions (responsable point client, temp responsable, commercial/merch, direction/admin)
  if (canUserViewCards(user)) {
    // Responsable point client (main/temp) and Direction/Admin: full access
    if (isResponsablePointClient(user) || isTempResponsablePointClient(user) || isDirectionOrAdmin(user)) {
      return true;
    }

    // Commercial/Merchandiser: only cards they're assigned to
    if (isCommercialOrMerch(user)) {
      const userEmail = (user.email || '').toLowerCase().trim();
      const userId = user.id;

      // Check if user is a member of the card
      const isMember = card.members?.some((m) => 
        (m.id && m.id === userId) || (m.email && m.email.toLowerCase().trim() === userEmail)
      );
      if (isMember) return true;

      // Check if user is a merchandiser on the card
      const isMerchandiser = card.merchandisers?.some((m) => 
        (m.id && m.id === userId) || (m.email && m.email.toLowerCase().trim() === userEmail)
      );
      if (isMerchandiser) return true;

      // Legacy: check merchandiserName/merchandiserId
      if (card.merchandiserId && card.merchandiserId === userId) return true;
      if (card.merchandiserName && userEmail && card.merchandiserName.toLowerCase().includes(userEmail.split('@')[0])) return true;

      // Check if user is invited as visitor on this card
      const isInvitedVisitor = card.invitedVisitors?.some((v) => 
        v.email && v.email.toLowerCase().trim() === userEmail
      );
      if (isInvitedVisitor) return true;

      return false;
    }

    return true;
  }

  // Default DENY: Unknown or untrusted role cannot see any cards
  return false;
}

/**
 * Evaluates whether a Board should be visible to a user.
 */
export function isBoardVisibleToUser(
  board: CustomBoard,
  user: UserProfile | null | undefined,
  visitorSession?: VisitorSession | null,
  poles?: MerchPole[],
  cards?: Card[]
): boolean {
  if (!user) return false;

  // Visiteur: only explicitly invited
  if (isVisiteur(user)) {
    const email = (visitorSession?.email || user.email || '').toLowerCase().trim();
    return isVisitorInvitedToBoard(board, email, user, poles);
  }

  if (isClient(user)) {
    // Clients don't typically access boards directly
    return false;
  }

  // Users with view permissions
  if (canUserViewCards(user)) {
    // Responsable point client (main/temp) and Direction/Admin: full access
    if (isResponsablePointClient(user) || isTempResponsablePointClient(user) || isDirectionOrAdmin(user)) {
      return true;
    }

    // Commercial/Merchandiser: only boards containing cards they're assigned to
    if (isCommercialOrMerch(user) && cards && cards.length > 0) {
      const hasVisibleCard = board.cardIds.some((cId) => {
        const c = cards.find((x) => x.id === cId);
        return c && isCardVisibleToUser(c, user, visitorSession, [board], poles);
      });
      if (hasVisibleCard) return true;
    }

    return false;
  }

  return false;
}

/**
 * Evaluates whether a Pole should be visible to a user.
 */
export function isPoleVisibleToUser(
  pole: MerchPole,
  user: UserProfile | null | undefined,
  visitorSession?: VisitorSession | null,
  boards?: CustomBoard[],
  cards?: Card[]
): boolean {
  if (!user) return false;

  // Visiteur: only explicitly invited
  if (isVisiteur(user)) {
    const email = (visitorSession?.email || user.email || '').toLowerCase().trim();
    return isVisitorInvitedToPole(pole, email, user);
  }

  if (isClient(user)) {
    return false;
  }

  // Users with view permissions
  if (canUserViewCards(user)) {
    // Responsable point client (main/temp) and Direction/Admin: full access
    if (isResponsablePointClient(user) || isTempResponsablePointClient(user) || isDirectionOrAdmin(user)) {
      return true;
    }

    // Commercial/Merchandiser: only poles containing boards with cards they're assigned to
    if (isCommercialOrMerch(user) && boards && boards.length > 0) {
      const poleBoards = boards.filter(
        (b) => b.poleId === pole.id || (pole.boardIds && pole.boardIds.includes(b.id))
      );
      const hasVisibleBoard = poleBoards.some((b) =>
        isBoardVisibleToUser(b, user, visitorSession, [pole], cards)
      );
      if (hasVisibleBoard) return true;
    }

    return false;
  }

  return false;
}
