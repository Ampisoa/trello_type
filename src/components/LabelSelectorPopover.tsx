import React, { useState } from 'react';
import { CardLabel } from '../types';
import { DEFAULT_LABELS, LABEL_COLOR_PRESETS } from '../data/defaultLabels';
import { Tag, Check, Plus, Edit2, Trash2, X, Search, ChevronLeft } from 'lucide-react';

interface LabelSelectorPopoverProps {
  cardLabels: CardLabel[];
  onToggleLabel: (label: CardLabel) => void;
  onClose: () => void;
  availableLabels?: CardLabel[];
  onUpdateAvailableLabels?: (labels: CardLabel[]) => void;
}

export const LabelSelectorPopover: React.FC<LabelSelectorPopoverProps> = ({
  cardLabels,
  onToggleLabel,
  onClose,
  availableLabels = DEFAULT_LABELS,
  onUpdateAvailableLabels,
}) => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingLabel, setEditingLabel] = useState<CardLabel | null>(null);

  // New label form state
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const activeLabelIds = new Set(cardLabels.map((l) => l.id));

  const filteredLabels = availableLabels.filter((lbl) =>
    lbl.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    const colorPreset = LABEL_COLOR_PRESETS[selectedColorIndex];
    const createdLabel: CardLabel = {
      id: `lbl-${Date.now()}`,
      name: newLabelName.trim(),
      color: colorPreset.color,
      bgClass: colorPreset.bgClass,
      badgeClass: colorPreset.badgeClass,
    };

    const updated = [...availableLabels, createdLabel];
    if (onUpdateAvailableLabels) {
      onUpdateAvailableLabels(updated);
    }

    // Also toggle it on for current card
    onToggleLabel(createdLabel);

    setNewLabelName('');
    setView('list');
  };

  const handleSaveEditLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabel || !newLabelName.trim()) return;

    const colorPreset = LABEL_COLOR_PRESETS[selectedColorIndex];
    const updatedLabel: CardLabel = {
      ...editingLabel,
      name: newLabelName.trim(),
      color: colorPreset.color,
      bgClass: colorPreset.bgClass,
      badgeClass: colorPreset.badgeClass,
    };

    const updated = availableLabels.map((l) => (l.id === updatedLabel.id ? updatedLabel : l));
    if (onUpdateAvailableLabels) {
      onUpdateAvailableLabels(updated);
    }

    setEditingLabel(null);
    setNewLabelName('');
    setView('list');
  };

  const handleDeleteLabel = (labelId: string) => {
    const updated = availableLabels.filter((l) => l.id !== labelId);
    if (onUpdateAvailableLabels) {
      onUpdateAvailableLabels(updated);
    }
  };

  const openEditView = (lbl: CardLabel) => {
    setEditingLabel(lbl);
    setNewLabelName(lbl.name);
    const presetIdx = LABEL_COLOR_PRESETS.findIndex((p) => p.color === lbl.color);
    setSelectedColorIndex(presetIdx >= 0 ? presetIdx : 0);
    setView('edit');
  };

  return (
    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-slate-800 p-3 animate-in fade-in zoom-in-95 duration-150">
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
        {view !== 'list' ? (
          <button
            onClick={() => {
              setView('list');
              setEditingLabel(null);
            }}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>Étiquettes / Labels</span>
          </div>
        )}

        <span className="text-xs font-bold text-slate-700">
          {view === 'list' && 'Gérer les étiquettes'}
          {view === 'create' && 'Créer une étiquette'}
          {view === 'edit' && 'Modifier l\'étiquette'}
        </span>

        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* VIEW 1: LIST LABELS */}
      {view === 'list' && (
        <div className="space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher une étiquette..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Labels list */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {filteredLabels.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic text-center py-3">Aucune étiquette trouvée</p>
            ) : (
              filteredLabels.map((lbl) => {
                const isSelected = activeLabelIds.has(lbl.id);
                return (
                  <div key={lbl.id} className="flex items-center gap-1.5 group">
                    <button
                      type="button"
                      onClick={() => onToggleLabel(lbl)}
                      className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${lbl.bgClass} hover:opacity-90`}
                    >
                      <span className="truncate">{lbl.name}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditView(lbl)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Create label button */}
          <button
            type="button"
            onClick={() => {
              setNewLabelName('');
              setSelectedColorIndex(0);
              setView('create');
            }}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Créer une nouvelle étiquette
          </button>
        </div>
      )}

      {/* VIEW 2: CREATE LABEL FORM */}
      {view === 'create' && (
        <form onSubmit={handleCreateLabel} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Titre de l'étiquette</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="ex: Validation Atelier"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Couleur</label>
            <div className="grid grid-cols-6 gap-1.5">
              {LABEL_COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  className={`h-7 rounded-md transition-all flex items-center justify-center ${preset.bgClass} ${
                    selectedColorIndex === idx ? 'ring-2 ring-slate-900 ring-offset-1 scale-105' : 'hover:scale-105'
                  }`}
                  title={preset.name}
                >
                  {selectedColorIndex === idx && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors"
          >
            Créer et appliquer
          </button>
        </form>
      )}

      {/* VIEW 3: EDIT LABEL FORM */}
      {view === 'edit' && editingLabel && (
        <form onSubmit={handleSaveEditLabel} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Titre de l'étiquette</label>
            <input
              type="text"
              required
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Couleur</label>
            <div className="grid grid-cols-6 gap-1.5">
              {LABEL_COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  className={`h-7 rounded-md transition-all flex items-center justify-center ${preset.bgClass} ${
                    selectedColorIndex === idx ? 'ring-2 ring-slate-900 ring-offset-1 scale-105' : 'hover:scale-105'
                  }`}
                  title={preset.name}
                >
                  {selectedColorIndex === idx && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleDeleteLabel(editingLabel.id)}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              title="Supprimer définitivement cette étiquette"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
