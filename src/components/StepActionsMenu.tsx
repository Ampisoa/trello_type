import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Plus, ArrowDownWideNarrow, Check, Archive, ChevronDown } from 'lucide-react';

// Ordre d'affichage des fiches dans une colonne Kanban.
// 'reference' = ordre alphabétique (référence), 'newest'/'oldest' = date de création.
export type StepCardSortMode = 'reference' | 'newest' | 'oldest';

export const STEP_SORT_LABELS: Record<StepCardSortMode, string> = {
  reference: 'Référence (A→Z)',
  newest: 'Création (récent)',
  oldest: 'Création (ancien)',
};

const SORT_OPTIONS: { mode: StepCardSortMode; label: string; hint: string }[] = [
  { mode: 'newest', label: 'Date de création (récent)', hint: 'Les plus récentes en premier' },
  { mode: 'oldest', label: 'Date de création (ancien)', hint: 'Les plus anciennes en premier' },
  { mode: 'reference', label: 'Ordre alphabétique', hint: 'Référence de la carte (A→Z)' },
];

interface StepActionsMenuProps {
  stepName: string;
  cardCount: number;
  canEdit: boolean;
  sortMode: StepCardSortMode;
  isOpen: boolean;
  onToggle: () => void;
  onCreateCard: () => void;
  onSortChange: (mode: StepCardSortMode) => void;
  onArchiveAll: () => void;
  // Colonne survolée / cible de dépôt : le trigger passe sur fond clair
  inverted?: boolean;
}

export const StepActionsMenu: React.FC<StepActionsMenuProps> = ({
  stepName,
  cardCount,
  canEdit,
  sortMode,
  isOpen,
  onToggle,
  onCreateCard,
  onSortChange,
  onArchiveAll,
  inverted = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (!isOpen) setIsSortOpen(false);
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={`Actions de l'étape « ${stepName} »`}
        aria-label={`Actions de l'étape ${stepName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`w-5 h-5 flex items-center justify-center rounded-md border transition-all cursor-pointer ${
          isOpen
            ? 'bg-white text-indigo-700 border-white'
            : inverted
            ? 'bg-white/25 hover:bg-white text-slate-900 border-white/40'
            : 'bg-white/40 hover:bg-white text-slate-900 border-white/50'
        }`}
      >
        <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={3} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
            <span className="text-[11px] font-black text-slate-900 truncate" title={stepName}>
              {stepName}
            </span>
            <span className="text-[9.5px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0 ml-2">
              {cardCount} fiche{cardCount > 1 ? 's' : ''}
            </span>
          </div>

          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onCreateCard();
              }}
              title={`Créer une carte directement dans l'étape « ${stepName} »`}
              className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg text-left text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.8} />
              <span className="truncate">+ Nouvelle Carte</span>
            </button>
          )}

          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSortOpen((prev) => !prev);
              }}
              aria-expanded={isSortOpen}
              title="Trier les fiches de cette étape"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowDownWideNarrow className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Trier par</span>
              <span
                className="ml-auto text-[9px] font-semibold text-slate-500 truncate max-w-[92px]"
                title={STEP_SORT_LABELS[sortMode]}
              >
                {STEP_SORT_LABELS[sortMode]}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isSortOpen && (
              <div className="mt-0.5 space-y-0.5">
                {SORT_OPTIONS.map((opt) => {
                  const isActive = opt.mode === sortMode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSortChange(opt.mode);
                        setIsSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isActive ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-[10.5px] font-bold truncate">{opt.label}</span>
                        <span className="block text-[9px] text-slate-500 truncate">{opt.hint}</span>
                      </span>
                      {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" strokeWidth={2.8} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {canEdit && cardCount > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onArchiveAll();
              }}
              title={`Archiver les ${cardCount} fiche(s) de cette étape`}
              className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 border-t border-slate-100 rounded-lg text-left text-[11px] font-bold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Archiver</span>
              <span className="ml-auto text-[9px] font-semibold text-amber-600 shrink-0">{cardCount}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
