import React from 'react';
import { Card, StepDefinition, UserProfile, CustomBoard } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import { Archive, RotateCcw, Trash2, X, Layers } from 'lucide-react';

interface ArchivesModalProps {
  cards: Card[];
  steps: StepDefinition[];
  currentUser: UserProfile;
  activeBoard: CustomBoard | null;
  onClose: () => void;
  onCardClick: (card: Card) => void;
  onToggleArchive: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
}

export const ArchivesModal: React.FC<ArchivesModalProps> = ({
  cards,
  steps,
  currentUser,
  activeBoard,
  onClose,
  onCardClick,
  onToggleArchive,
  onDeleteCard,
}) => {
  const canEdit = canUserCreateOrEditCards(currentUser);
  const stepName = (stepId: string) => steps.find((s) => s.id === stepId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-900 text-white border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Archive className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black truncate">
                Archives {activeBoard ? `— ${activeBoard.title}` : 'globales'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {cards.length} fiche{cards.length > 1 ? 's' : ''} archivée{cards.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {cards.length === 0 ? (
            <div className="text-center py-14 space-y-2">
              <Archive className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Aucune fiche archivée</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Les fiches archivées (via le bouton "Archiver la fiche" dans la fiche identitaire) apparaîtront ici et
                seront retirées des colonnes de ce board.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((card) => {
                const step = stepName(card.currentStepId);
                return (
                  <div
                    key={card.id}
                    data-link-entity="card"
                    data-link-id={card.id}
                    data-link-label={`Carte — ${card.reference}`}
                    className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-amber-50/40 hover:bg-white hover:border-amber-300 transition-all cursor-pointer"
                    onClick={() => onCardClick(card)}
                    title="Ouvrir la fiche"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="p-2 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                        <Archive className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-black text-slate-800 font-mono truncate">{card.reference}</span>
                          {step && (
                            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${step.color}`}>
                              {step.code || step.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 truncate">{card.modele}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {card.clientName} • Livraison : {card.dateLivraison ? card.dateLivraison.slice(0, 10) : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onToggleArchive(card)}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Restaurer la fiche (la remettre dans les colonnes)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer définitivement la fiche archivée "${card.modele || card.reference}" ?`)) {
                              onDeleteCard(card.id);
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <span className="p-2 text-slate-400 group-hover:text-indigo-600" title="Ouvrir la fiche">
                        <Layers className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            Cliquez sur une fiche pour la consulter. Restaurer la remet dans son étape d'origine.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};