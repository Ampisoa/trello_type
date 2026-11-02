import { Card, UserProfile } from '../types';
import { isResponsablePointClient, isTempResponsablePointClient } from '../utils/permissions';

export interface CardMerchandiserInfo {
  name: string;
  id?: string;
  avatar?: string;
  email?: string;
  posteLabel?: string;
}

/**
 * Returns the list of responsable(s) point client for the card.
 * In the new system, this is determined by user's posteLabel, not card assignment.
 * Returns all users with posteLabel === 'responsable point client' or active temporary designation.
 */
export function getCardMerchandisers(card: Card, allUsers?: UserProfile[]): CardMerchandiserInfo[] {
  if (!allUsers || allUsers.length === 0) {
    return [{ name: 'Non assigné(e)', posteLabel: 'Responsable Point Client' }];
  }

  // Find all users with responsable point client role (main or temporary active)
  const responsables = allUsers.filter((u) => 
    isResponsablePointClient(u) || isTempResponsablePointClient(u)
  );

  if (responsables.length > 0) {
    return responsables.map((u) => ({
      name: u.name,
      id: u.id,
      avatar: u.avatar,
      email: u.email,
      posteLabel: u.posteLabel || (u.tempResponsablePointClient?.isActive ? 'Responsable Point Client Temporaire' : 'Responsable Point Client'),
    }));
  }

  // Fallback: check card.members for any commercial role (legacy)
  const merchMembers = card.members?.filter((m) => m.role === 'commercial');
  if (merchMembers && merchMembers.length > 0) {
    return merchMembers.map((m) => {
      const matchedUser = allUsers?.find((u) => u.id === m.id || u.name === m.name);
      return {
        name: m.name,
        id: m.id,
        avatar: m.avatar || matchedUser?.avatar,
        email: m.email || matchedUser?.email,
        posteLabel: matchedUser?.posteLabel || 'Commercial',
      };
    });
  }

  // Legacy: check card.merchandisers array
  if (card.merchandisers && Array.isArray(card.merchandisers) && card.merchandisers.length > 0) {
    return card.merchandisers.map((m) => {
      const matchedUser = allUsers?.find(
        (u) => (m.id && u.id === m.id) || u.name.toLowerCase().trim() === m.name.toLowerCase().trim()
      );
      return {
        name: m.name,
        id: m.id || matchedUser?.id,
        avatar: m.avatar || matchedUser?.avatar,
        email: m.email || matchedUser?.email,
        posteLabel: m.posteLabel || matchedUser?.posteLabel || 'Commercial',
      };
    });
  }

  return [
    {
      name: 'Non assigné(e)',
      posteLabel: 'Responsable Point Client',
    },
  ];
}

/**
 * Returns the primary commercial(e) / merchandiser responsible for the card.
 */
export function getCardMerchandiser(card: Card, allUsers?: UserProfile[]): CardMerchandiserInfo {
  const list = getCardMerchandisers(card, allUsers);
  return list[0] || { name: 'Non assigné(e)', posteLabel: 'Commercial' };
}
