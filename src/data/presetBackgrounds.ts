export interface PresetBackground {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnail: string;
}

export const PRESET_BOARD_BACKGROUNDS: PresetBackground[] = [
  {
    id: 'atelier-couture',
    name: 'Atelier & Patronage',
    category: 'Atelier',
    url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'soie-marine',
    name: 'Soie Satinée Nuit',
    category: 'Textile',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'marbre-noir-dore',
    name: 'Marbre Sombre & Doré',
    category: 'Matières',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'lin-minimaliste',
    name: 'Lin Écru & Tissage',
    category: 'Textile',
    url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'soie-emeraude',
    name: 'Émeraude Haute Couture',
    category: 'Textile',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'cuir-ebene',
    name: 'Cuir & Maroquinerie',
    category: 'Matières',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'studio-defile',
    name: 'Studio Défilé & Lumière',
    category: 'Atelier',
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'velours-rubis',
    name: 'Velours Rubis Dégradé',
    category: 'Textile',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=300&q=70',
  },
];
