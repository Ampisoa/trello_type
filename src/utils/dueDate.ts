/**
 * Utilitaires pour le calcul et l'affichage de la Due Date (date prochaine de mise à jour Commercial)
 */

export interface DueDateStatus {
  status: 'none' | 'overdue' | 'today' | 'tomorrow' | 'upcoming';
  badgeLabel: string;
  formattedDate: string;
  daysDiff: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export function parseDateParts(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10) - 1,
      day: parseInt(m[3], 10),
    };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

export function toNoonIsoString(dateStr: string): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return new Date().toISOString();
  // Store as noon UTC to prevent any timezone shifts
  const d = new Date(Date.UTC(parts.year, parts.month, parts.day, 12, 0, 0));
  return d.toISOString();
}

export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getDueDateStatus(dueDateStr?: string): DueDateStatus {
  if (!dueDateStr) {
    return {
      status: 'none',
      badgeLabel: 'Aucune Due Date',
      formattedDate: '',
      daysDiff: 0,
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-500',
      borderClass: 'border-slate-200',
    };
  }

  const parts = parseDateParts(dueDateStr);
  if (!parts) {
    return {
      status: 'none',
      badgeLabel: 'Date invalide',
      formattedDate: '',
      daysDiff: 0,
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-500',
      borderClass: 'border-slate-200',
    };
  }

  const now = new Date();
  // Normalize both dates to midnight for day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(parts.year, parts.month, parts.day);

  const diffTime = target.getTime() - today.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = target.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });

  if (daysDiff < 0) {
    return {
      status: 'overdue',
      badgeLabel: `En retard (${Math.abs(daysDiff)}j)`,
      formattedDate,
      daysDiff,
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-700',
      borderClass: 'border-rose-300',
    };
  } else if (daysDiff === 0) {
    return {
      status: 'today',
      badgeLabel: "Aujourd'hui",
      formattedDate,
      daysDiff,
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800 font-extrabold',
      borderClass: 'border-amber-400',
    };
  } else if (daysDiff === 1) {
    return {
      status: 'tomorrow',
      badgeLabel: 'Demain',
      formattedDate,
      daysDiff,
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700 font-bold',
      borderClass: 'border-indigo-300',
    };
  } else if (daysDiff <= 5) {
    return {
      status: 'upcoming',
      badgeLabel: `Dans ${daysDiff}j`,
      formattedDate,
      daysDiff,
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-700 font-semibold',
      borderClass: 'border-sky-300',
    };
  } else {
    return {
      status: 'upcoming',
      badgeLabel: `Dans ${daysDiff}j`,
      formattedDate,
      daysDiff,
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-700 font-medium',
      borderClass: 'border-slate-200',
    };
  }
}
