export function getClientDefaultInitials(name: string): string {
  if (!name) return 'CL';
  // Remove (client) or special tags
  const clean = name.replace(/\(client\)/gi, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // 3 or more words (e.g., Maison Haute Couture -> MHC)
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const CLIENT_COLOR_PALETTES = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600', text: 'text-white', ring: 'ring-indigo-300' },
  { id: 'slate', name: 'Ébène', bg: 'bg-slate-900', text: 'text-white', ring: 'ring-slate-400' },
  { id: 'emerald', name: 'Émeraude', bg: 'bg-emerald-600', text: 'text-white', ring: 'ring-emerald-300' },
  { id: 'purple', name: 'Pourpre', bg: 'bg-purple-600', text: 'text-white', ring: 'ring-purple-300' },
  { id: 'rose', name: 'Rose Rubis', bg: 'bg-rose-600', text: 'text-white', ring: 'ring-rose-300' },
  { id: 'amber', name: 'Ambre Doré', bg: 'bg-amber-600', text: 'text-white', ring: 'ring-amber-300' },
  { id: 'teal', name: 'Bleu Canard', bg: 'bg-teal-600', text: 'text-white', ring: 'ring-teal-300' },
  { id: 'blue', name: 'Bleu Royal', bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-300' },
];
