export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  badge?: string;
}

/**
 * Exactement 10 choix d'avatars de style Dessin Animé (D.A) épurés, simples et vectoriels.
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'da-1',
    name: 'Maya',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maya&eyes=happy&mouth=smile&top=longCurly',
  },
  {
    id: 'da-2',
    name: 'Léo',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Leo&accessories=prescription02&accessoriesProbability=100&clothesColor=65c9ff&clothing=graphicShirt&top=shortFlat',
  },
  {
    id: 'da-3',
    name: 'Zoé',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Zoe&clothing=hoodie&top=hat',
  },
  {
    id: 'da-4',
    name: 'Sam',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Samuel&accessories=round&accessoriesProbability=100&facialHair=beardLight&top=frizzle',
  },
  {
    id: 'da-5',
    name: 'Chloé',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe&eyes=wink&mouth=smile&top=dreads01',
  },
  {
    id: 'da-6',
    name: 'Maxime',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maxime&clothesColor=ff5c5c&clothing=blazerAndShirt&top=curvy',
  },
  {
    id: 'da-7',
    name: 'Lola',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Lola&accessories=sunglasses&accessoriesProbability=100&top=straight02',
  },
  {
    id: 'da-8',
    name: 'Arthur',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arthur&facialHair=beardMajestic&top=shaggy',
  },
  {
    id: 'da-9',
    name: 'Emma',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma&eyes=happy&mouth=twinkle&top=bob',
  },
  {
    id: 'da-10',
    name: 'Lucas',
    badge: 'D.A',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Lucas&clothing=collarAndSweater&top=shortRound',
  },
];
