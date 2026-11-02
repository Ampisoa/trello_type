import { Card, MerchPole, UserProfile, CustomBoard } from '../types';
import { getCardMerchandisers } from './merchandiser';

/**
 * Generates the clean display title for a pole.
 * Examples:
 * - Sophie Bertrand & Lucas Moreau -> "Pôle de Sophie et Lucas"
 * - Camille Dupuis & Alexandre Martin -> "Pôle de Camille et Alexandre"
 * - Sophie Bertrand -> "Pôle de Sophie"
 * - If custom name is explicitly provided, returns the custom name.
 */
export function getPoleTitle(pole: MerchPole, allUsers?: UserProfile[]): string {
  if (pole.name && pole.name.trim() !== '') {
    return pole.name;
  }

  // Resolve leader first names
  const firstNames: string[] = [];

  if (pole.leaderNames && pole.leaderNames.length > 0) {
    pole.leaderNames.forEach((fullName) => {
      const cleanFirst = fullName.trim().split(' ')[0];
      if (cleanFirst && !firstNames.includes(cleanFirst)) {
        firstNames.push(cleanFirst);
      }
    });
  } else if (pole.leaderIds && pole.leaderIds.length > 0 && allUsers) {
    pole.leaderIds.forEach((id) => {
      const user = allUsers.find((u) => u.id === id);
      if (user) {
        const cleanFirst = user.name.trim().split(' ')[0];
        if (cleanFirst && !firstNames.includes(cleanFirst)) {
          firstNames.push(cleanFirst);
        }
      }
    });
  }

  if (firstNames.length === 0) {
    return 'Pôle Commercial';
  }

  if (firstNames.length === 1) {
    return `Pôle de ${firstNames[0]}`;
  }

  if (firstNames.length === 2) {
    return `Pôle de ${firstNames[0]} et ${firstNames[1]}`;
  }

  const lastFirst = firstNames[firstNames.length - 1];
  const preceding = firstNames.slice(0, -1).join(', ');
  return `Pôle de ${preceding} et ${lastFirst}`;
}

/**
 * Returns all custom boards attributed to a pole.
 */
export function getBoardsForPole(pole: MerchPole, boards: CustomBoard[]): CustomBoard[] {
  const poleBoardIds = new Set(pole.boardIds || []);

  return boards.filter((board) => {
    if (poleBoardIds.has(board.id)) return true;
    if (board.poleId && board.poleId === pole.id) return true;
    return false;
  });
}

/**
 * Returns unique cards grouped in a list of boards.
 */
export function getCardsForBoards(boards: CustomBoard[], cards: Card[]): Card[] {
  const allCardIds = new Set<string>();
  boards.forEach((b) => b.cardIds.forEach((id) => allCardIds.add(id)));
  return cards.filter((c) => allCardIds.has(c.id));
}

/**
 * Returns unique cards grouped in the boards attributed to a pole.
 */
export function getCardsForPoleBoards(pole: MerchPole, boards: CustomBoard[], cards: Card[]): Card[] {
  const poleBoards = getBoardsForPole(pole, boards);
  return getCardsForBoards(poleBoards, cards);
}

/**
 * Returns all cards / models directly assigned to the merchandisers of a pole (legacy helper).
 */
export function getCardsForPole(pole: MerchPole, cards: Card[], allUsers?: UserProfile[]): Card[] {
  const leaderIdsSet = new Set(pole.leaderIds || []);
  const leaderNamesLower = (pole.leaderNames || []).map((n) => n.toLowerCase().trim());

  // Also gather names of leader users from allUsers if available
  if (allUsers && pole.leaderIds) {
    pole.leaderIds.forEach((id) => {
      const u = allUsers.find((user) => user.id === id);
      if (u) {
        leaderNamesLower.push(u.name.toLowerCase().trim());
      }
    });
  }

  return cards.filter((card) => {
    // 1. Check card merchandisers list
    const cardMerchs = getCardMerchandisers(card, allUsers);
    const hasMerchMatch = cardMerchs.some((m) => {
      if (m.id && leaderIdsSet.has(m.id)) return true;
      if (m.name && leaderNamesLower.includes(m.name.toLowerCase().trim())) return true;
      return false;
    });

    if (hasMerchMatch) return true;

    // 2. Check legacy merchandiser fields
    if (card.merchandiserId && leaderIdsSet.has(card.merchandiserId)) return true;
    if (card.merchandiserName && leaderNamesLower.includes(card.merchandiserName.toLowerCase().trim())) {
      return true;
    }

    // 3. Check card members
    const hasMemberMatch = card.members?.some(
      (mem) =>
        (mem.id && leaderIdsSet.has(mem.id)) ||
        (mem.name && leaderNamesLower.includes(mem.name.toLowerCase().trim()))
    );

    return Boolean(hasMemberMatch);
  });
}

/**
 * Returns leader user profiles from allUsers.
 */
export function getPoleLeaders(pole: MerchPole, allUsers: UserProfile[]): UserProfile[] {
  const leaders: UserProfile[] = [];

  pole.leaderIds.forEach((id) => {
    const user = allUsers.find((u) => u.id === id);
    if (user && !leaders.some((l) => l.id === user.id)) {
      leaders.push(user);
    }
  });

  // Also check by name
  pole.leaderNames.forEach((name) => {
    const user = allUsers.find((u) => u.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (user && !leaders.some((l) => l.id === user.id)) {
      leaders.push(user);
    }
  });

  return leaders;
}

/**
 * Color badge classes for pole themes.
 */
export const POLE_COLOR_STYLES: Record<string, { bg: string; text: string; border: string; ring: string; gradient: string; badge: string }> = {
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    ring: 'ring-indigo-500/20',
    gradient: 'from-indigo-600 to-violet-700',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500/20',
    gradient: 'from-emerald-600 to-teal-700',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'ring-rose-500/20',
    gradient: 'from-rose-600 to-pink-700',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-500/20',
    gradient: 'from-amber-600 to-orange-700',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    ring: 'ring-purple-500/20',
    gradient: 'from-purple-600 to-indigo-700',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  sky: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    ring: 'ring-sky-500/20',
    gradient: 'from-sky-600 to-cyan-700',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
  },
};
