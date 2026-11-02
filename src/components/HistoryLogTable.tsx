import React, { useEffect, useRef, useState } from 'react';
import { HistoryLog } from '../types';
import { Clock, ArrowRight, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface HistoryLogTableProps {
  logs: HistoryLog[];
}

const pad = (n: number) => String(n).padStart(2, '0');

const parseLogTimestamp = (ts: string): Date | null => {
  if (!ts) return null;
  const legacy = ts.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (legacy) {
    return new Date(
      Number(legacy[3]),
      Number(legacy[2]) - 1,
      Number(legacy[1]),
      Number(legacy[4]),
      Number(legacy[5]),
      Number(legacy[6] || 0)
    );
  }
  const iso = new Date(ts);
  return Number.isNaN(iso.getTime()) ? null : iso;
};

// Affiche jj/mm/aaaa hh:mm:ss dans le fuseau horaire local (pays de la modification).
const formatLogTimestamp = (ts: string): string => {
  const d = parseLogTimestamp(ts);
  if (!d) return ts;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const HistoryLogTable: React.FC<HistoryLogTableProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  // Zone masquable : la barre de titre (et donc le bouton) reste toujours
  // affichée, seule la table est repliée pour pouvoir être réaffichée.
  const [isHidden, setIsHidden] = useState(false);

  // Sort logs from newest to oldest
  const sortedLogs = [...logs].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  useEffect(() => {
    updateScrollState();
  }, [sortedLogs.length, isHidden]);

  const scrollByStep = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: direction * 170, behavior: 'smooth' });
  };

  // L'état vide est rendu sous l'en-tête (et non via un return anticipé) :
  // le bouton masquer/demasquer doit rester accessible même sans modification.
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          Historique des modifications ({sortedLogs.length})
        </h4>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isHidden && sortedLogs.length > 0 && (
            <>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Défiler pour voir les anciennes</span>
              <button
                type="button"
                onClick={() => scrollByStep(-1)}
                disabled={!canScrollUp}
                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600"
                title="Vers le haut (modifications récentes)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByStep(1)}
                disabled={!canScrollDown}
                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600"
                title="Vers le bas (anciennes modifications)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Masquer / démasquer la zone "Historique des modifications" */}
          <button
            type="button"
            onClick={() => setIsHidden((v) => !v)}
            aria-expanded={!isHidden}
            aria-label={
              isHidden
                ? "Afficher l'historique des modifications"
                : "Masquer l'historique des modifications"
            }
            title={
              isHidden
                ? "Afficher l'historique des modifications"
                : "Masquer l'historique des modifications"
            }
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors border ${
              isHidden
                ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-slate-900 hover:text-white hover:border-slate-900'
            }`}
          >
            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isHidden && sortedLogs.length === 0 && (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Aucun historique de modification</p>
          <p className="text-xs text-slate-400 mt-1">
            Les actions effectuées sur cette carte (changement d'étape, cocher une checklist, ajout de fichier) apparaîtront ici.
          </p>
        </div>
      )}

      {!isHidden && sortedLogs.length > 0 && (
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="overflow-x-auto overflow-y-auto h-72 rounded-lg border border-slate-200 bg-white shadow-2xs scrollbar-thin"
        >
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px] tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Date & Heure exacte</th>
                <th className="py-2.5 px-3">Auteur</th>
                <th className="py-2.5 px-3">Action / Modification</th>
                <th className="py-2.5 px-3">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {sortedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]" title={log.timestamp}>
                    {formatLogTimestamp(log.timestamp)}
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {log.authorName.charAt(0)}
                      </span>
                      <span className="font-medium text-slate-800">{log.authorName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          log.authorRole === 'commercial'
                            ? 'bg-indigo-100 text-indigo-800'
                            : log.authorRole === 'client'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.authorRole}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-indigo-500" />
                      {log.action}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-slate-600 whitespace-normal break-words min-w-[220px]">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};