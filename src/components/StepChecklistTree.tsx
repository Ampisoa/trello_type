import React, { useState } from 'react';
import { ChecklistItem, UserRole } from '../types';
import { CheckSquare, Square, Plus, Trash2, Edit3, ChevronRight, ChevronDown, Check, GripVertical, Eye, EyeOff } from 'lucide-react';

interface StepChecklistTreeProps {
  checklists: ChecklistItem[];
  onChangeChecklists: (updated: ChecklistItem[], actionLog?: { action: string; details?: string }) => void;
  userRole: UserRole;
  currentUserName: string;
  onLogAction?: (action: string, details?: string) => void;
  isReadOnly?: boolean;
}

export const StepChecklistTree: React.FC<StepChecklistTreeProps> = ({
  checklists,
  onChangeChecklists,
  userRole,
  currentUserName,
  onLogAction,
  isReadOnly = false,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [hideCompleted, setHideCompleted] = useState(false);
  // Réordonnancement libre par glisser-déposer : un élément ne peut être déplacé
  // qu'au sein de sa propre liste (racine ou sous-checklists d'un même parent).
  const [dragItem, setDragItem] = useState<{ id: string; parentId: string | null } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const roleLower = (userRole || '').toLowerCase();
  const canEdit =
    !isReadOnly &&
    roleLower !== 'visiteur' &&
    roleLower !== 'client' &&
    (roleLower === 'commercial' ||
      roleLower === 'admin' ||
      roleLower === 'directeur' ||
      roleLower === 'directeur général' ||
      roleLower === 'directeur general' ||
      roleLower.includes('direct') ||
      roleLower.includes('commercial') ||
      roleLower.includes('planning') ||
      roleLower === 'resp_planning');

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper function to update item recursively
  const updateItemInList = (
    items: ChecklistItem[],
    targetId: string,
    updater: (item: ChecklistItem) => ChecklistItem
  ): ChecklistItem[] => {
    return items.map((item) => {
      if (item.id === targetId) {
        return updater(item);
      }
      if (item.subItems && item.subItems.length > 0) {
        return {
          ...item,
          subItems: updateItemInList(item.subItems, targetId, updater),
        };
      }
      return item;
    });
  };

  const findItemById = (items: ChecklistItem[], targetId: string): ChecklistItem | null => {
    for (const item of items) {
      if (item.id === targetId) return item;
      if (item.subItems && item.subItems.length > 0) {
        const found = findItemById(item.subItems, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Liste des frères/soeurs contenant l'élément : `parentId === null` = racine.
  const getSiblingList = (parentId: string | null): ChecklistItem[] | null => {
    if (parentId === null) return checklists;
    const parent = findItemById(checklists, parentId);
    return parent ? parent.subItems || [] : null;
  };

  // Déplace `movedId` juste avant/après `targetId` dans la liste de `parentId`.
  // Retourne l'arbre complet mis à jour, ou null si le déplacement est invalide
  // (éléments de niveaux différents, cible introuvable, déplacement sur soi-même).
  const buildReorderedTree = (
    parentId: string | null,
    movedId: string,
    targetId: string,
    position: 'before' | 'after'
  ): ChecklistItem[] | null => {
    const list = getSiblingList(parentId);
    if (!list) return null;

    const moved = list.find((i) => i.id === movedId);
    if (!moved || movedId === targetId) return null;

    const withoutMoved = list.filter((i) => i.id !== movedId);
    const targetIndex = withoutMoved.findIndex((i) => i.id === targetId);
    if (targetIndex === -1) return null;

    const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
    const reordered = [...withoutMoved.slice(0, insertAt), moved, ...withoutMoved.slice(insertAt)];

    if (parentId === null) return reordered;
    return updateItemInList(checklists, parentId, (parent) => ({ ...parent, subItems: reordered }));
  };

  const handleDragStart = (e: React.DragEvent, item: ChecklistItem, parentId: string | null) => {
    if (!canEdit) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    setDragItem({ id: item.id, parentId });
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, item: ChecklistItem, parentId: string | null) => {
    if (!canEdit || !dragItem) return;
    // Refus de tout dépôt hors de la propre liste de l'élément glissé.
    if (dragItem.parentId !== parentId || dragItem.id === item.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropTarget((prev) => (prev?.id === item.id && prev.position === position ? prev : { id: item.id, position }));
  };

  const handleDrop = (e: React.DragEvent, item: ChecklistItem, parentId: string | null) => {
    e.preventDefault();
    if (!canEdit || !dragItem) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

    const movedId = dragItem.id;
    const updated = buildReorderedTree(parentId, movedId, item.id, position);
    setDragItem(null);
    setDropTarget(null);
    if (!updated) return;

    const moved = findItemById(checklists, movedId);
    const actionLog = {
      action: 'Réordonnancement checklist',
      details: `"${moved?.title || movedId}" déplacé ${position === 'before' ? 'avant' : 'après'} "${item.title}"`,
    };
    onChangeChecklists(updated, actionLog);

    if (onLogAction) {
      onLogAction(actionLog.action, actionLog.details);
    }
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  // Helper function to check if all subitems are completed
  const checkAutoParentCompletion = (items: ChecklistItem[]): ChecklistItem[] => {
    return items.map((item) => {
      let updatedItem = { ...item };
      if (updatedItem.subItems && updatedItem.subItems.length > 0) {
        const updatedSubs = checkAutoParentCompletion(updatedItem.subItems);
        const allSubsDone = updatedSubs.every((sub) => sub.completed);
        updatedItem = {
          ...updatedItem,
          subItems: updatedSubs,
          completed: allSubsDone,
        };
      }
      return updatedItem;
    });
  };

  const handleToggleComplete = (item: ChecklistItem) => {
    if (!canEdit) return;

    const nextCompleted = !item.completed;
    const nowIso = new Date().toISOString();

    const updated = updateItemInList(checklists, item.id, (curr) => {
      // Toggle current item
      const newItem = {
        ...curr,
        completed: nextCompleted,
        completedAt: nextCompleted ? nowIso : undefined,
        completedBy: nextCompleted ? currentUserName : undefined,
      };

      // If toggling parent, optionally toggle subitems to same state
      if (newItem.subItems && newItem.subItems.length > 0) {
        newItem.subItems = newItem.subItems.map((sub) => ({
          ...sub,
          completed: nextCompleted,
          completedAt: nextCompleted ? nowIso : undefined,
          completedBy: nextCompleted ? currentUserName : undefined,
        }));
      }

      return newItem;
    });

    const finalChecklists = checkAutoParentCompletion(updated);
    const stateStr = nextCompleted ? 'Coché (fait)' : 'Décoché (à faire)';
    const actionLog = {
      action: `Checklist: ${stateStr}`,
      details: `Tâche "${item.title}" marquée par ${currentUserName}`,
    };
    onChangeChecklists(finalChecklists, actionLog);

    if (onLogAction) {
      onLogAction(actionLog.action, actionLog.details);
    }
  };

  const handleAddParentItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !canEdit) return;

    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newTitle.trim(),
      completed: false,
      subItems: [],
    };

    const updated = [...checklists, newItem];
    const actionLog = {
      action: 'Ajout checklist',
      details: `Nouvelle tâche: "${newItem.title}"`,
    };
    onChangeChecklists(updated, actionLog);
    setNewTitle('');

    if (onLogAction) {
      onLogAction(actionLog.action, actionLog.details);
    }
  };

  const handleAddSubItem = (parentId: string, parentTitle: string) => {
    if (!subTitle.trim() || !canEdit) return;

    const newSubItem: ChecklistItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: subTitle.trim(),
      completed: false,
    };

    const updated = updateItemInList(checklists, parentId, (parent) => ({
      ...parent,
      subItems: [...(parent.subItems || []), newSubItem],
      completed: false, // Reopen parent if new subitem added
    }));

    const actionLog = {
      action: 'Ajout sous-checklist',
      details: `Sous-tâche "${newSubItem.title}" ajoutée à "${parentTitle}"`,
    };
    onChangeChecklists(updated, actionLog);
    setAddingParentId(null);
    setSubTitle('');
    setExpandedItems((prev) => ({ ...prev, [parentId]: true }));

    if (onLogAction) {
      onLogAction(actionLog.action, actionLog.details);
    }
  };

  const handleRenameItem = (id: string, oldTitle: string) => {
    if (!editingTitle.trim() || !canEdit) return;

    const updated = updateItemInList(checklists, id, (item) => ({
      ...item,
      title: editingTitle.trim(),
    }));

    const actionLog = {
      action: 'Renommage checklist',
      details: `Tâche "${oldTitle}" renommée en "${editingTitle.trim()}"`,
    };
    onChangeChecklists(updated, actionLog);
    setEditingId(null);
    setEditingTitle('');

    if (onLogAction) {
      onLogAction(actionLog.action, actionLog.details);
    }
  };

  const removeItemFromList = (items: ChecklistItem[], targetId: string): ChecklistItem[] => {
    return items
      .filter((item) => item.id !== targetId)
      .map((item) => {
        if (item.subItems && item.subItems.length > 0) {
          return {
            ...item,
            subItems: removeItemFromList(item.subItems, targetId),
          };
        }
        return item;
      });
  };

  const handleDeleteItem = (id: string, title: string) => {
    if (!canEdit) return;
    const updated = removeItemFromList(checklists, id);
    const actionLog = {
      action: 'Suppression checklist',
      details: `Tâche "${title}" supprimée`,
    };
    onChangeChecklists(updated, actionLog);

    if (onLogAction) {
      onLogAction(actionLog.action, actionLog.details);
    }
  };

  // Un élément est considéré "entièrement fait" si lui et toute sa descendance sont cochés
  const isFullyDone = (item: ChecklistItem): boolean =>
    !!item.completed && (!item.subItems || item.subItems.length === 0 || item.subItems.every(isFullyDone));

  // Masque (ou réaffiche) les éléments cochés en un clic
  const applyHideCompleted = (items: ChecklistItem[]): ChecklistItem[] =>
    items
      .filter((item) => !hideCompleted || !isFullyDone(item))
      .map((item) =>
        item.subItems && item.subItems.length > 0 ? { ...item, subItems: applyHideCompleted(item.subItems) } : item
      );

  // Helper to count total tasks vs done tasks
  const countStats = (items: ChecklistItem[]): { total: number; done: number } => {
    let total = 0;
    let done = 0;

    items.forEach((item) => {
      total += 1;
      if (item.completed) done += 1;

      if (item.subItems && item.subItems.length > 0) {
        const subStat = countStats(item.subItems);
        total += subStat.total;
        done += subStat.done;
      }
    });

    return { total, done };
  };

  const { total, done } = countStats(checklists);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const renderItem = (item: ChecklistItem, depth = 0, parentId: string | null = null) => {
    const hasSub = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems[item.id] ?? true;
    const isEditing = editingId === item.id;
    const isDragged = dragItem?.id === item.id;
    const isDropTarget = dropTarget?.id === item.id;

    return (
      <div key={item.id} className="group relative">
        <div
          className={`relative flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
            item.completed
              ? 'bg-emerald-50/50 border-emerald-200/60'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          } ${depth > 0 ? 'ml-6 border-l-2 border-l-indigo-300 bg-slate-50/50' : ''} ${
            isDragged ? 'opacity-40' : ''
          } ${isDropTarget ? 'ring-2 ring-indigo-400' : ''}`}
          draggable={canEdit && !isEditing && addingParentId !== item.id}
          onDragStart={(e) => handleDragStart(e, item, parentId)}
          onDragOver={(e) => handleDragOver(e, item, parentId)}
          onDrop={(e) => handleDrop(e, item, parentId)}
          onDragEnd={handleDragEnd}
        >
          {isDropTarget && (
            <span
              className={`absolute left-1 right-1 h-0.5 bg-indigo-500 rounded-full pointer-events-none ${
                dropTarget!.position === 'before' ? '-top-1' : '-bottom-1'
              }`}
            />
          )}

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {canEdit && !isEditing && (
              <span
                title="Glisser pour réordonner"
                className="shrink-0 -ml-1 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4" />
              </span>
            )}

            {hasSub ? (
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : depth > 0 ? (
              <div className="w-4 h-4 flex items-center justify-center text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => handleToggleComplete(item)}
              disabled={!canEdit}
              className={`flex items-center justify-center shrink-0 w-5 h-5 rounded border transition-colors ${
                item.completed
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : canEdit
                  ? 'border-slate-300 text-transparent hover:border-indigo-500 bg-white'
                  : 'border-slate-200 bg-slate-100 cursor-not-allowed'
              }`}
            >
              {item.completed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3.5 h-3.5" />}
            </button>

            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameItem(item.id, item.title);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRenameItem(item.id, item.title)}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <span
                  onClick={() => {
                    if (canEdit && !item.completed) {
                      setEditingId(item.id);
                      setEditingTitle(item.title);
                    } else {
                      handleToggleComplete(item);
                    }
                  }}
                  title={canEdit && !item.completed ? 'Cliquer pour modifier' : undefined}
                  className={`text-sm select-none font-medium transition-all block truncate ${
                    item.completed
                      ? 'line-through text-slate-400 opacity-75 font-normal cursor-pointer hover:text-slate-600'
                      : canEdit
                      ? 'text-slate-800 hover:text-indigo-700 cursor-pointer'
                      : 'text-slate-800'
                  }`}
                >
                  {item.title}
                </span>

                {item.completedAt && (
                  <span className="text-[11px] text-emerald-700/80 block mt-0.5">
                    Fait par {item.completedBy || 'Commercial'} le {new Date(item.completedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            )}
          </div>

          {canEdit && !isEditing && (
            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
              {depth === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingParentId(item.id);
                    setSubTitle('');
                    setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
                  }}
                  title="Ajouter une sous-checklist"
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}

              {item.completed && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingTitle(item.title);
                  }}
                  title="Renommer"
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDeleteItem(item.id, item.title)}
                title="Supprimer"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Input box to add a sub-checklist item */}
        {addingParentId === item.id && canEdit && (
          <div className="ml-6 mt-1.5 p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 whitespace-nowrap">
              Sous-tâche:
            </span>
            <input
              type="text"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubItem(item.id, item.title);
                if (e.key === 'Escape') setAddingParentId(null);
              }}
              placeholder="Intitulé de la sous-checklist..."
              className="flex-1 px-2.5 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleAddSubItem(item.id, item.title)}
              className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setAddingParentId(null)}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Render sub-checklist items recursively */}
        {hasSub && isExpanded && (
          <div className="mt-1.5 space-y-1.5">
            {item.subItems!.map((sub) => renderItem(sub, depth + 1, item.id))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Progress Header (hidden when no checklist items configured) */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-700">
              Avancement des checklists: {done} / {total} réalisées
            </span>
          </div>
          <div className="flex items-center gap-2">
            {done > 0 && (
              <button
                type="button"
                onClick={() => setHideCompleted((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  hideCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={hideCompleted ? 'Réafficher les tâches cochées' : 'Masquer les tâches cochées'}
              >
                {hideCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {hideCompleted ? `Afficher les cochés (${done})` : `Masquer les cochés (${done})`}
              </button>
            )}
            <div className="flex items-center gap-2 min-w-28">
              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 min-w-8 text-right">
                {percent}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* List of Checklist items */}
      {(() => {
        const visibleItems = applyHideCompleted(checklists);

        return (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {checklists.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Aucune checklist configurée pour cette étape.
              </p>
            ) : visibleItems.length === 0 && hideCompleted ? (
              <button
                type="button"
                onClick={() => setHideCompleted(false)}
                className="w-full text-xs text-emerald-700 italic text-center py-4 bg-emerald-50 rounded-lg border border-dashed border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                ✔ Toutes les tâches sont cochées — cliquez pour les réafficher
              </button>
            ) : (
              <>
                {canEdit && checklists.length > 1 && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
                    <GripVertical className="w-3.5 h-3.5" />
                    Glissez une ligne pour changer son rang dans la liste.
                  </p>
                )}
                {visibleItems.map((item) => renderItem(item, 0, null))}
              </>
            )}
          </div>
        );
      })()}

      {/* Form to add new primary Checklist item */}
      {canEdit && (
        <form onSubmit={handleAddParentItem} className="flex gap-2 pt-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="+ Ajouter une nouvelle checklist principale..."
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </form>
      )}

      {isReadOnly && (
        <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1.5">
          <span>ℹ️</span> Accès Client (lecture seule) : Vous pouvez visualiser le statut des checklists sans pouvoir cocher ou modifier.
        </p>
      )}
    </div>
  );
};
