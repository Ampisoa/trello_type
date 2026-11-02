import React from 'react';
import { Card, StepDefinition, UserProfile } from '../types';
import { FileText, Image as ImageIcon, Eye, CheckSquare, Calendar, ChevronRight, MessageSquare, UserCheck, Clock } from 'lucide-react';
import { getCardMerchandisers } from '../utils/merchandiser';
import { getDueDateStatus } from '../utils/dueDate';

interface CardListViewProps {
  cards: Card[];
  steps: StepDefinition[];
  allUsers?: UserProfile[];
  onCardClick: (card: Card) => void;
}

export const CardListView: React.FC<CardListViewProps> = ({ cards, steps, allUsers = [], onCardClick }) => {
  const allSimple = cards.length > 0 && cards.every((c) => c.cardType === 'simple');

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Référence</th>
                <th className="py-3.5 px-4">Modèle</th>
                {!allSimple && (
                  <>
                    <th className="py-3.5 px-4">Commercial(e)s</th>
                    <th className="py-3.5 px-4">Client</th>
                  </>
                )}
                <th className="py-3.5 px-4">Étape Actuelle</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Dossier rattaché (PDF)</th>
                <th className="py-3.5 px-4">Frame</th>
                <th className="py-3.5 px-4">Livraison</th>
                <th className="py-3.5 px-4">Checklists</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 italic">
                    Aucune carte ne correspond à la recherche.
                  </td>
                </tr>
              ) : (
                cards.map((card) => {
                  const currentStep = steps.find((s) => s.id === card.currentStepId);
                  const stepId = currentStep?.id || card.currentStepId;
                  const items = (stepId && card.stepChecklists && card.stepChecklists[stepId]) || currentStep?.defaultChecklists || [];
                  const done = items.filter((i) => i.completed).length;
                  const merchandisers = getCardMerchandisers(card, allUsers);
                  const dueStatus = getDueDateStatus(card.dueDate);

                  return (
                    <tr
                      key={card.id}
                      data-link-entity="card"
                      data-link-id={card.id}
                      data-link-label={`Carte — ${card.reference} · ${card.modele}`}
                      onClick={() => onCardClick(card)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{card.reference}</span>
                          {card.comments && card.comments.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title={`${card.comments.length} message(s)`}>
                              <MessageSquare className="w-3 h-3 text-indigo-600" />
                              {card.comments.length}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-indigo-600">
                        <div className="flex flex-col gap-1">
                          <span>{card.modele}</span>
                          {card.labels && card.labels.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {card.labels.map((lbl) => (
                                <span
                                  key={lbl.id}
                                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${lbl.badgeClass}`}
                                >
                                  {lbl.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {!allSimple && (
                        <>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {card.cardType === 'simple' ? (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <div className="flex items-center -space-x-1.5 shrink-0">
                                  {merchandisers.slice(0, 3).map((m, idx) =>
                                    m.avatar ? (
                                      <img
                                        key={m.id || idx}
                                        src={m.avatar}
                                        alt={m.name}
                                        className="w-5 h-5 rounded-full object-cover border border-white shadow-2xs"
                                      />
                                    ) : (
                                      <div
                                        key={m.id || idx}
                                        className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[8px] flex items-center justify-center border border-white shadow-2xs"
                                      >
                                        {m.name.charAt(0)}
                                      </div>
                                    )
                                  )}
                                </div>
                                <span className="font-semibold text-slate-700 max-w-[140px] truncate" title={merchandisers.map((m) => m.name).join(', ')}>
                                  {merchandisers.map((m) => m.name.split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                            {card.cardType === 'simple' ? (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div
                                  style={{ borderRadius: '10%' }}
                                  className="w-5 h-5 bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0"
                                >
                                  {card.clientName
                                    .replace(/\(client\)/gi, '')
                                    .trim()
                                    .split(/\s+/)
                                    .map((w) => w[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </div>
                                <span className="font-semibold">{card.clientName}</span>
                              </div>
                            )}
                          </td>
                        </>
                      )}

                      <td className="py-3 px-4 whitespace-nowrap">
                        {currentStep ? (
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${currentStep.color || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                            Step {currentStep.order}: {currentStep.name}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-amber-50 text-amber-800 border-amber-300">
                            ⚠️ À reclasser
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {card.dueDate ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                              dueStatus.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : dueStatus.status === 'today'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {dueStatus.badgeLabel}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {card.dossierTechnique ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <FileText className="w-3.5 h-3.5" /> {card.dossierTechnique.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {card.frame ? (
                          <div className="w-10 h-8 rounded overflow-hidden border border-slate-200 bg-slate-50 p-0.5 flex items-center justify-center">
                            <img src={card.frame.fileUrl} alt="frame" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {card.dateLivraison
                          ? isNaN(new Date(card.dateLivraison).getTime())
                            ? card.dateLivraison
                            : new Date(card.dateLivraison).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          {done} / {items.length}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCardClick(card);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Fiche Identitaire
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
