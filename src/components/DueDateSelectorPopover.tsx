import React, { useState } from 'react';
import { Calendar, Clock, X, Check, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { getDueDateStatus } from '../utils/dueDate';

interface DueDateSelectorPopoverProps {
  currentDueDate?: string;
  currentDueDateNotes?: string;
  onSaveDueDate: (newDueDate: string | undefined, notes?: string) => void;
  onClose: () => void;
}

export const DueDateSelectorPopover: React.FC<DueDateSelectorPopoverProps> = ({
  currentDueDate,
  currentDueDateNotes = '',
  onSaveDueDate,
  onClose,
}) => {
  // Convert current ISO or date string to YYYY-MM-DD
  const formatForDateInput = (val?: string) => {
    if (!val) return '';
    if (val.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateValue, setDateValue] = useState<string>(formatForDateInput(currentDueDate));
  const [notes, setNotes] = useState<string>(currentDueDateNotes);

  const currentStatus = getDueDateStatus(currentDueDate);
  const previewStatus = getDueDateStatus(dateValue ? new Date(`${dateValue}T12:00:00`).toISOString() : undefined);

  // Helper to set relative days from today
  const setRelativeDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateValue(`${year}-${month}-${day}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateValue) {
      onSaveDueDate(undefined, undefined);
    } else {
      // Save as ISO string with midday to avoid timezone edge shifts
      const isoDate = new Date(`${dateValue}T12:00:00.000Z`).toISOString();
      onSaveDueDate(isoDate, notes.trim() || undefined);
    }
    onClose();
  };

  const handleClear = () => {
    onSaveDueDate(undefined, undefined);
    onClose();
  };

  return (
    <div
      className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Due Date Commerciale</h4>
            <p className="text-[10px] text-slate-500">
              Prochaine date de relance / mise à jour
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5">
        {/* Quick Presets */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
            Raccourcis rapides
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setRelativeDays(0)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-semibold text-[11px] transition-colors text-center"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setRelativeDays(1)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-semibold text-[11px] transition-colors text-center"
            >
              Demain (+1j)
            </button>
            <button
              type="button"
              onClick={() => setRelativeDays(3)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-semibold text-[11px] transition-colors text-center"
            >
              Dans 3 jours
            </button>
            <button
              type="button"
              onClick={() => setRelativeDays(7)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-semibold text-[11px] transition-colors text-center"
            >
              Dans 1 semaine
            </button>
            <button
              type="button"
              onClick={() => setRelativeDays(14)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-semibold text-[11px] transition-colors text-center"
            >
              Dans 2 semaines
            </button>
            <button
              type="button"
              onClick={() => setRelativeDays(30)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 font-semibold text-[11px] transition-colors text-center"
            >
              Dans 1 mois
            </button>
          </div>
        </div>

        {/* Date Input */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
            Date précise d'échéance
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          {dateValue && (
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Statut prévisionnel :</span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${previewStatus.bgClass} ${previewStatus.textClass} ${previewStatus.borderClass}`}
              >
                {previewStatus.badgeLabel} ({previewStatus.formattedDate})
              </span>
            </div>
          )}
        </div>

        {/* Note / Objective for the next update */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
            Objectif de la mise à jour (optionnel)
          </label>
          <input
            type="text"
            placeholder="Ex: Vérifier validation client, contrôler prototype..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {currentDueDate ? (
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Retirer</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
