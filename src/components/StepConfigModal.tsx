import React, { useState } from 'react';
import { StepDefinition, ChecklistItem } from '../types';
import { X, Plus, Trash2, Edit2, Layers, CheckSquare, Save, GripVertical } from 'lucide-react';

interface StepConfigModalProps {
  steps: StepDefinition[];
  onClose: () => void;
  onSaveSteps: (updatedSteps: StepDefinition[]) => void;
  scopeLabel?: string;
}

export const StepConfigModal: React.FC<StepConfigModalProps> = ({ steps, onClose, onSaveSteps, scopeLabel }) => {
  const [stepList, setStepList] = useState<StepDefinition[]>([...steps].sort((a, b) => a.order - b.order));
  const [newStepName, setNewStepName] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dragStepIndex, setDragStepIndex] = useState<number | null>(null);
  const [dragOverStepIndex, setDragOverStepIndex] = useState<number | null>(null);

  // Drag & drop: place a step at any rank in the personalized list.
  const moveStep = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= stepList.length || toIndex >= stepList.length) return;
    const updated = [...stepList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setStepList(updated.map((step, idx) => ({ ...step, order: idx + 1 })));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragStepIndex(index);
    setDragOverStepIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStepIndex !== index) setDragOverStepIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragStepIndex !== null) {
      moveStep(dragStepIndex, index);
    }
    setDragStepIndex(null);
    setDragOverStepIndex(null);
  };

  const handleDragEnd = () => {
    setDragStepIndex(null);
    setDragOverStepIndex(null);
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepName.trim()) return;

    const newStep: StepDefinition = {
      id: `step-${Date.now()}`,
      name: newStepName.trim(),
      code: newStepName.trim().toLowerCase().replace(/\s+/g, '_'),
      order: stepList.length + 1,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      description: newStepDesc.trim() || 'Étape personnalisée',
      defaultChecklists: [
        {
          id: `chk-init-${Date.now()}`,
          title: `Validation initiale ${newStepName.trim()}`,
          completed: false,
          subItems: [],
        },
      ],
    };

    setStepList([...stepList, newStep]);
    setNewStepName('');
    setNewStepDesc('');
  };

  const handleRenameStep = (stepId: string) => {
    if (!editingName.trim()) return;

    const updated = stepList.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          name: editingName.trim(),
        };
      }
      return step;
    });

    setStepList(updated);
    setEditingStepId(null);
    setEditingName('');
  };

  const handleDeleteStep = (stepId: string) => {
    if (stepList.length <= 1) {
      alert('Il doit y avoir au moins une étape dans le pipeline.');
      return;
    }

    const filtered = stepList.filter((s) => s.id !== stepId);
    const reordered = filtered.map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    setStepList(reordered);
  };

  const handleSave = () => {
    onSaveSteps(stepList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold">
            {scopeLabel ? `Ajuster les Étapes — ${scopeLabel}` : 'Ajuster les Étapes du Pipeline (Steps)'}
          </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Add Step Form */}
          <form onSubmit={handleAddStep} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" /> Ajouter une nouvelle étape
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                placeholder="Nom de l'étape (ex: Contrôle Extra)"
                className="col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newStepName.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
              >
                + Ajouter étape
              </button>
            </div>
          </form>

          {/* List of Steps */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ordre des Steps ({stepList.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Glissez-déposer une étape pour la placer à n'importe quel rang
              </span>
            </div>

            <div className="space-y-2">
              {stepList.map((step, index) => (
                <div
                  key={step.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 bg-slate-50 border rounded-xl flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing transition-colors ${
                    dragOverStepIndex === index && dragStepIndex !== null && dragStepIndex !== index
                      ? 'border-indigo-400 ring-1 ring-indigo-200 bg-indigo-50/60'
                      : 'border-slate-200 hover:border-slate-300'
                  } ${dragStepIndex === index ? 'opacity-40 ring-1 ring-dashed ring-indigo-300' : ''}`}
                  title="Glisser-déposer pour placer l'étape à n'importe quel rang"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-300 shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {step.order}
                    </span>

                    {editingStepId === step.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-none bg-white font-bold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameStep(step.id)}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded font-semibold"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStepId(null)}
                          className="px-2 py-1 text-xs text-slate-500"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{step.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{step.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStepId(step.id);
                        setEditingName(step.name);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                      title="Renommer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {scopeLabel
              ? `Les modifications mettront à jour les étapes de ${scopeLabel}.`
              : "Les modifications mettront à jour le pipeline global de l'application."}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Enregistrer la séquence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
