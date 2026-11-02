import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, StepDefinition, UserProfile } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import { hasDroppedFiles } from '../utils/mediaUpload';
import { getCardMerchandisers } from '../utils/merchandiser';
import { getDueDateStatus } from '../utils/dueDate';
import { CardStepSelector } from './CardStepSelector';
import { SimpleCardVisual } from './SimpleCardVisual';
import { StepActionsMenu, StepCardSortMode } from './StepActionsMenu';
import {
  FileText,
  Image as ImageIcon,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  UserCheck,
  Paperclip,
  MessageSquare,
  GripVertical,
  ArrowDownToLine,
  Calendar,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface KanbanBoardProps {
  cards: Card[];
  steps: StepDefinition[];
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  onCardClick: (card: Card) => void;
  onMoveCardStep: (cardId: string, targetStepId: string) => void;
  onReorderCardsInStep: (stepId: string, orderedCardIds: string[]) => void;
  onReorderSteps?: (orderedStepIds: string[]) => void;
  // Dépôt de fichiers externes (drag & drop système / explorateur) sur une carte
  onDropFiles?: (card: Card, files: File[]) => void;
  // Création d'une carte directement dans une colonne (menu "..." de l'étape)
  onCreateCardInStep?: (stepId: string) => void;
  // Archivage de plusieurs cartes d'un coup (toutes celles d'une colonne)
  onArchiveCards?: (cards: Card[]) => void;
}

// Default order: alphabetic by reference (numeric-aware, accent/case insensitive).
// A manual drag-and-drop inside a step overrides this via `sortOrder`.
function compareStepCards(a: Card, b: Card): number {
  const ao = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
  const bo = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.reference.localeCompare(b.reference, 'fr', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);
}

// Tri par date de création (les cartes sans date restent en fin de liste).
function compareByDate(a: Card, b: Card, dir: 1 | -1): number {
  const at = Date.parse(a.dateCreation || '') || 0;
  const bt = Date.parse(b.dateCreation || '') || 0;
  if (at !== bt) return (at - bt) * dir;
  return a.reference.localeCompare(b.reference, 'fr', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);
}

// Tri par référence seule (sans resortir l'ordre manuel), utilisé quand
// l'utilisateur demande explicitement l'ordre alphabétique depuis le menu.
function compareByReference(a: Card, b: Card): number {
  return (
    a.reference.localeCompare(b.reference, 'fr', { numeric: true, sensitivity: 'base' }) ||
    a.id.localeCompare(b.id)
  );
}

// Applique le tri choisi pour une colonne : 'reference' conserve l'ordre
// manuel (sortOrder) puis alphabétique, les deux autres trient par date.
function sortCardsForStep(cards: Card[], mode: StepCardSortMode): Card[] {
  if (mode === 'newest') return [...cards].sort((a, b) => compareByDate(a, b, -1));
  if (mode === 'oldest') return [...cards].sort((a, b) => compareByDate(a, b, 1));
  return [...cards].sort(compareStepCards);
}

// Ordre à persister (sortOrder) quand l'utilisateur choisit un tri : le mode
// alphabétique repart d'un tri par référence pur, pour repasser d'un tri par
// date à l'alphabetique sans rester bloqué sur l'ordre précédent.
function orderedCardsForMode(cards: Card[], mode: StepCardSortMode): Card[] {
  if (mode === 'reference') return [...cards].sort(compareByReference);
  return sortCardsForStep(cards, mode);
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  cards,
  steps,
  currentUser,
  allUsers,
  onCardClick,
  onMoveCardStep,
  onReorderCardsInStep,
  onReorderSteps,
  onDropFiles,
  onCreateCardInStep,
  onArchiveCards,
}) => {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const [dragColumnOverId, setDragColumnOverId] = useState<string | null>(null);
  const [isBoardDragging, setIsBoardDragging] = useState(false);
  const [reorderSourceCardId, setReorderSourceCardId] = useState<string | null>(null);
  const [reorderTarget, setReorderTarget] = useState<{ cardId: string; placement: 'before' | 'after' } | null>(null);
  const [fileOverCardId, setFileOverCardId] = useState<string | null>(null);
  // Tri choisi par colonne via le menu "..." de l'en-tête d'étape
  const [stepSortModes, setStepSortModes] = useState<Record<string, StepCardSortMode>>({});
  const [openStepMenuId, setOpenStepMenuId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const dragScroll = useRef<{ isDown: boolean; startX: number; startScroll: number; moved: boolean } | null>(null);

  useEffect(() => {
    const handleWindowMove = (e: MouseEvent) => {
      const drag = dragScroll.current;
      const el = boardRef.current;
      if (!drag?.isDown || !el) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 3) drag.moved = true;
      if (drag.moved) {
        el.scrollLeft = drag.startScroll - dx;
      }
    };
    const handleWindowUp = () => {
      dragScroll.current = null;
      setIsBoardDragging(false);
    };
    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
  }, []);

  const handleBoardMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-card], button, input, select, textarea, a, [role="button"], [data-step-header]')) return;
    dragScroll.current = {
      isDown: true,
      startX: e.clientX,
      startScroll: boardRef.current?.scrollLeft ?? 0,
      moved: false,
    };
    setIsBoardDragging(true);
    e.preventDefault();
  };

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  const knownStepIds = new Set(sortedSteps.map((s) => s.id));
  const orphanCards = cards.filter((c) => !c.currentStepId || !knownStepIds.has(c.currentStepId));
  const canEdit = canUserCreateOrEditCards(currentUser);

  // Cards grouped per step, in display order: manual sortOrder if set,
  // otherwise alphabetical by reference (default), or by creation date when the
  // step sort mode has been changed from the column "..." menu.
  const stepCardsByStep = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const s of sortedSteps) {
      const mode = stepSortModes[s.id] || 'reference';
      map.set(s.id, sortCardsForStep(cards.filter((c) => c.currentStepId === s.id), mode));
    }
    return map;
  }, [cards, sortedSteps, stepSortModes]);

  if (sortedSteps.length === 0 && orphanCards.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[40vh]">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-8 max-w-md text-center space-y-3 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Aucune Ã©tape dÃ©finie</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aucune Ã©tape Kanban n'est actuellement configurÃ©e pour ce board.
          </p>
        </div>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    if (!canEdit) return;
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverStepId(null);
    setReorderSourceCardId(null);
    setReorderTarget(null);
    setDragColumnId(null);
    setDragColumnOverId(null);
  };

  const resetReorderState = () => {
    setReorderSourceCardId(null);
    setReorderTarget(null);
  };

  // Vertical drag-and-drop inside a column: reorders (moves a card to a given
  // position 1/2/3/...) instead of changing its step. Cross-step drags are
  // left untouched so the existing column drop keeps handling the move.
  const handleCardDragOver = (e: React.DragEvent, stepId: string, card: Card) => {
    if (!canEdit) return;
    // Dépôt de fichiers venant de l'extérieur (explorateur, bureau) : on ouvre la
    // cible sans lancer la réorganisation interne, qui lit `text/plain` (vide ici).
    if (hasDroppedFiles(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setFileOverCardId(card.id);
      return;
    }
    const fromId = e.dataTransfer.getData('text/plain') || draggedCardId;
    const fromCard = cards.find((c) => c.id === fromId);
    if (!fromCard || fromCard.currentStepId !== stepId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const placement = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setReorderSourceCardId(fromId);
    setReorderTarget({ cardId: card.id, placement });
    if (dragOverStepId !== stepId) {
      setDragOverStepId(stepId);
    }
  };

  const handleCardDragLeave = (e: React.DragEvent, card: Card) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setReorderTarget((cur) => (cur?.cardId === card.id ? null : cur));
    setFileOverCardId((cur) => (cur === card.id ? null : cur));
  };

  const handleCardDrop = (e: React.DragEvent, stepId: string, card: Card) => {
    if (!canEdit) return;
    if (hasDroppedFiles(e)) {
      e.preventDefault();
      e.stopPropagation();
      setFileOverCardId(null);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length && onDropFiles) onDropFiles(card, files);
      return;
    }
    const fromId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!fromId || fromId === card.id) {
      resetReorderState();
      return;
    }
    const fromCard = cards.find((c) => c.id === fromId);
    if (!fromCard || fromCard.currentStepId !== stepId) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY >= rect.top + rect.height / 2;
    const others = (stepCardsByStep.get(stepId) || []).filter((c) => c.id !== fromId);
    const idx = others.findIndex((c) => c.id === card.id);
    const insertAt = after ? idx + 1 : idx;
    const next = [...others.slice(0, insertAt), fromCard, ...others.slice(insertAt)];
    // Un repositionnement manuel prime sur un tri par date : on rebascule la
    // colonne sur l'ordre alphabétique/manuel pour que le placement soit visible.
    if (stepSortModes[stepId] && stepSortModes[stepId] !== 'reference') {
      setStepSortModes((prev) => ({ ...prev, [stepId]: 'reference' }));
    }
    onReorderCardsInStep(
      stepId,
      next.map((c) => c.id)
    );
    resetReorderState();
    setDraggedCardId(null);
    setDragOverStepId(null);
  };

  const reorderIndicator = (card: Card): string => {
    // Surbrillance quand un fichier externe survole cette carte (dépôt autorisé)
    const fileRing =
      fileOverCardId === card.id
        ? ' ring-2 ring-emerald-400 ring-offset-1 shadow-lg shadow-emerald-500/25'
        : '';
    if (!reorderTarget || reorderTarget.cardId !== card.id) return fileRing;
    return fileRing + (reorderTarget.placement === 'before'
      ? ' border-t-[3px] border-t-indigo-500'
      : ' border-b-[3px] border-b-indigo-500');
  };

  const handleDragOver = (e: React.DragEvent, stepId: string) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStepId !== stepId) {
      setDragOverStepId(stepId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stepId: string) => {
    if (!canEdit) return;
    // Prevent flickering when hovering child elements inside the column
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverStepId === stepId) {
        setDragOverStepId(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    if (!canEdit) return;
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (cardId) {
      const card = cards.find((c) => c.id === cardId);
      if (card && card.currentStepId !== targetStepId) {
        onMoveCardStep(cardId, targetStepId);
      }
    }
    setDraggedCardId(null);
    setDragOverStepId(null);
  };

  // ---------------------------------------------------------------
  // Drag & drop des colonnes (étapes) : glisser un en-tête de colonne
  // vers la gauche/droite pour réordonner le pipeline des étapes.
  // ---------------------------------------------------------------
  const handleColumnDragStart = (e: React.DragEvent, stepId: string) => {
    if (!canEdit) return;
    setDragColumnId(stepId);
    setDragColumnOverId(stepId);
    e.dataTransfer.setData('text/plain', stepId);
    e.dataTransfer.setData('application/x-stepid', stepId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, stepId: string) => {
    if (!canEdit || !dragColumnId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragColumnOverId !== stepId) setDragColumnOverId(stepId);
  };

  const handleColumnDrop = (e: React.DragEvent, targetStepId: string) => {
    if (!canEdit || !dragColumnId) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragColumnId !== targetStepId) {
      const fromIndex = sortedSteps.findIndex((s) => s.id === dragColumnId);
      const toIndex = sortedSteps.findIndex((s) => s.id === targetStepId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const next = [...sortedSteps];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        onReorderSteps?.(next.map((s) => s.id));
      }
    }
    setDragColumnId(null);
    setDragColumnOverId(null);
  };

  const handleColumnDragEnd = () => {
    setDragColumnId(null);
    setDragColumnOverId(null);
  };

  // ---------------------------------------------------------------
  // Menu "..." de l'en-tête de colonne
  // ---------------------------------------------------------------

  // Change le tri d'une colonne et persiste l'ordre obtenu (sortOrder) afin que
  // le classement survive aux rechargements et reste cohérent avec le drag & drop.
  const handleStepSortChange = (stepId: string, mode: StepCardSortMode) => {
    setStepSortModes((prev) => ({ ...prev, [stepId]: mode }));
    setOpenStepMenuId(null);
    if (!canEdit) return;
    const ordered = orderedCardsForMode(
      cards.filter((c) => c.currentStepId === stepId),
      mode
    ).map((c) => c.id);
    if (ordered.length > 1) {
      onReorderCardsInStep(stepId, ordered);
    }
  };

  // Archive toutes les fiches d'une colonne (restauration possible via les archives).
  const handleArchiveStep = (stepId: string, stepName: string) => {
    const stepCards = stepCardsByStep.get(stepId) || [];
    setOpenStepMenuId(null);
    if (stepCards.length === 0 || !onArchiveCards) return;
    const confirmed = window.confirm(
      `Archiver les ${stepCards.length} fiche(s) de l'étape « ${stepName} » ?\n` +
        `Elles seront retirées du kanban et retrouvables dans les archives du board.`
    );
    if (!confirmed) return;
    onArchiveCards(stepCards);
  };

  return (
    <div
      ref={boardRef}
      onMouseDown={handleBoardMouseDown}
      className={`flex h-[calc(100dvh-260px)] md:h-[calc(100dvh-180px)] min-h-[320px] gap-3 overflow-x-auto pb-6 pt-2 px-3 sm:px-5 scrollbar-thin select-none items-start ${
        isBoardDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {sortedSteps.map((step, index) => {
        const stepCards = stepCardsByStep.get(step.id) || [];
        const cardCount = stepCards.length;
        const isCompact5Plus = cardCount >= 5;
        const isMedium3To4 = cardCount === 3 || cardCount === 4;
        const isDropTarget = dragOverStepId === step.id && draggedCardId !== null;
        const isColumnDropTarget = dragColumnId !== null && dragColumnId !== step.id && dragColumnOverId === step.id;
        const isColumnDragging = dragColumnId === step.id;

        return (
          <div
            key={step.id}
            onDragOver={(e) => (dragColumnId ? handleColumnDragOver(e, step.id) : handleDragOver(e, step.id))}
            onDragLeave={(e) => handleDragLeave(e, step.id)}
            onDrop={(e) => (dragColumnId ? handleColumnDrop(e, step.id) : handleDrop(e, step.id))}
            className={`w-[min(85vw,288px)] sm:w-72 shrink-0 rounded-xl border transition-all duration-200 flex flex-col h-full max-h-full shadow-sm ${
              isDropTarget
                ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-400 shadow-lg'
                : isColumnDropTarget
                ? 'bg-indigo-500/15 border-indigo-400 ring-2 ring-indigo-300 shadow-lg'
                : 'bg-black/5 hover:bg-black/10 border-white/20 hover:border-white/40 shadow-md'
            }`}
          >
            {/* Column Header */}
            <div
              data-step-header="true"
              draggable={canEdit}
              onDragStart={(e) => handleColumnDragStart(e, step.id)}
              onDragOver={(e) => handleColumnDragOver(e, step.id)}
              onDrop={(e) => handleColumnDrop(e, step.id)}
              onDragEnd={handleColumnDragEnd}
              title={canEdit ? "Glissez-déposer la colonne pour la placer à n'importe quel rang" : step.name}
              className={`px-2.5 py-2 border-b transition-colors rounded-t-xl flex items-center justify-between gap-2 ${
                isDropTarget
                  ? 'bg-indigo-600/40 text-white border-indigo-400/60'
                  : isColumnDropTarget
                  ? 'bg-indigo-600/50 text-white border-indigo-400/70'
                  : 'bg-white/20 hover:bg-white/30 text-slate-900 border-white/20'
              } ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} ${
                isColumnDragging ? 'opacity-40' : ''
              }`}
            >
              <div className="flex items-start gap-1.5 min-w-0">
                {canEdit && (
                  <GripVertical className="w-3 h-3 mt-0.5 text-slate-400 shrink-0" />
                )}
                <span
                  className={`w-4.5 h-4.5 mt-0.5 rounded-full font-bold text-[9.5px] flex items-center justify-center shrink-0 transition-colors shadow-2xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${
                    isDropTarget ? 'bg-white text-indigo-700' : 'bg-slate-900 text-white'
                  }`}
                >
                  {step.order}
                </span>
                <h3
                  className={`text-[11.5px] font-black break-words whitespace-normal leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] ${
                    isDropTarget ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]' : 'text-slate-900'
                  }`}
                  title={step.name}
                >
                  {step.name}
                </h3>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isCompact5Plus && (
                  <span
                    className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${
                      isDropTarget
                        ? 'bg-indigo-600/50 text-white border-indigo-400'
                        : 'text-indigo-900 bg-indigo-500/20 border-indigo-300/50 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                    }`}
                    title="Affichage compact activÃ© (5+ modÃ¨les)"
                  >
                    5+
                  </span>
                )}
                <span
                  className={`text-[11px] font-black px-1.5 py-0.2 rounded-full border transition-colors shadow-2xs ${
                    isDropTarget
                      ? 'bg-indigo-500/50 text-white border-indigo-300'
                      : 'text-slate-900 bg-white/30 border-white/40 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {cardCount}
                </span>
                <StepActionsMenu
                  stepName={step.name}
                  cardCount={cardCount}
                  canEdit={canEdit}
                  sortMode={stepSortModes[step.id] || 'reference'}
                  isOpen={openStepMenuId === step.id}
                  onToggle={() => setOpenStepMenuId((cur) => (cur === step.id ? null : step.id))}
                  onCreateCard={() => {
                    setOpenStepMenuId(null);
                    onCreateCardInStep?.(step.id);
                  }}
                  onSortChange={(mode) => handleStepSortChange(step.id, mode)}
                  onArchiveAll={() => handleArchiveStep(step.id, step.name)}
                  inverted={isDropTarget || isColumnDropTarget}
                />
              </div>
            </div>

            {/* Column Cards Container */}
            <div className="p-1.5 overflow-y-auto flex-1 min-h-0 space-y-1.5 scrollbar-thin">
              {/* Drop placeholder indicator when dragging over column */}
              {isDropTarget && (
                <div className="p-2.5 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-500/10 text-center animate-pulse flex items-center justify-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="text-[11px] font-bold text-indigo-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    DÃ©poser dans {step.name}
                  </span>
                </div>
              )}

              {cardCount === 0 && !isDropTarget ? (
                <div className="p-5 text-center border-2 border-dashed border-white/30 rounded-lg bg-black/5">
                  <p className="text-[11px] text-slate-100 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                    {canEdit ? 'Glissez-dÃ©posez un modÃ¨le ici' : 'Aucune carte'}
                  </p>
                </div>
              ) : (
                stepCards.map((card) => {
                  const isDraggingThisCard = draggedCardId === card.id;

                  // Calculate checklist stats
                  const items = (card.stepChecklists && card.stepChecklists[step.id]) || step.defaultChecklists || [];
                  const total = items.length;
                  const done = items.filter((i) => i.completed).length;
                  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                  const dueStatus = getDueDateStatus(card.dueDate);
                  const hasDueDate = Boolean(card.dueDate);

                  // Determine card photo source
                  const photoUrl =
                    card.frame?.fileUrl ||
                    (card.attachments || []).find((att) => att.mimeType.startsWith('image/'))?.fileUrl;

                  // -------------------------------------------------------------
                  // MODE 1: ULTRA-COMPACT VIEW (>= 5 CARDS)
                  // Focus: Reference & Nom cÃ´te Ã  cÃ´te, Photo, Labels, Due Date compact, Checklists
                  // -------------------------------------------------------------
                  if (isCompact5Plus) {
                    return (
                      <div
                        key={card.id}
                        data-card="true" data-link-entity="card" data-link-id={card.id} data-link-label={`Carte — ${card.reference} · ${card.modele}`}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleCardDragOver(e, step.id, card)}
                        onDragLeave={(e) => handleCardDragLeave(e, card)}
                        onDrop={(e) => handleCardDrop(e, step.id, card)}
                        className={`bg-white/80 hover:bg-white/95 backdrop-blur-xs rounded-lg border transition-all p-1.5 space-y-1 group ${
                          canEdit ? 'cursor-grab active:cursor-grabbing hover:border-indigo-400' : 'cursor-pointer'
                        } ${
                          isDraggingThisCard
                            ? 'opacity-40 scale-95 border-dashed border-indigo-500 ring-2 ring-indigo-400 shadow-md rotate-1'
                            : 'border-white/70 shadow-xs hover:shadow-md'
                        }${reorderIndicator(card)}`}
                        onClick={() => onCardClick(card)}
                      >
                        {/* Reference & Nom du ModÃ¨le CÃ”TE Ã€ CÃ”TE */}
                        <div className="flex items-center gap-1 min-w-0 text-[10px]">
                          {canEdit && (
                            <GripVertical className="w-2.5 h-2.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                          )}
                          {card.cardType === 'simple' ? (
                            <span className="font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-300 shrink-0 text-[9px] flex items-center gap-0.5" title="Carte Simple">
                              <span>ðŸ“</span> Simple
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 shrink-0 text-[9.5px]">
                              {card.reference}
                            </span>
                          )}
                          <span className="font-bold text-slate-800 truncate text-[9.5px]" title={card.modele}>
                            {card.modele}
                          </span>
                        </div>

                        {/* 1. Visuel de la carte (SimpleCardVisual ou Photo du ModÃ¨le) */}
                        {card.cardType === 'simple' ? (
                          <div className="h-16 w-full">
                            <SimpleCardVisual visual={card.simpleVisual} title={card.modele} size="sm" />
                          </div>
                        ) : (
                          <div className="relative rounded overflow-hidden bg-white/70 border border-slate-200/80 h-16 w-full flex items-center justify-center p-0.5">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={card.modele}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100/80 text-slate-400 text-[9px] gap-1">
                                <ImageIcon className="w-3 h-3" /> Photo en attente
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Ã‰tiquette(s) / Label(s) */}
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {card.labels.map((lbl) => (
                              <span
                                key={lbl.id}
                                className={`text-[7.5px] font-extrabold px-1.5 py-0.2 rounded border ${lbl.badgeClass} truncate max-w-[100px]`}
                                title={lbl.name}
                              >
                                {lbl.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 3. Due Date (Compacte) */}
                        {hasDueDate && (
                          <div
                            className={`flex items-center justify-between text-[8.5px] px-1.5 py-0.5 rounded border ${dueStatus.bgClass} ${dueStatus.textClass} ${dueStatus.borderClass}`}
                            title={`Prochaine mise Ã  jour Commercial: ${dueStatus.formattedDate}${card.dueDateNotes ? ` (${card.dueDateNotes})` : ''}`}
                          >
                            <span className="flex items-center gap-1 font-bold truncate">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>Due: {dueStatus.formattedDate}</span>
                            </span>
                            <span className="font-black text-[7.5px] px-1 rounded bg-white/80 border border-black/10 shrink-0">
                              {dueStatus.badgeLabel}
                            </span>
                          </div>
                        )}

                        {/* 4. Checklists Progression */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between text-[8.5px] text-slate-600 font-semibold">
                            <span className="flex items-center gap-0.5">
                              <CheckSquare className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              Checklists {done}/{total}
                            </span>
                            <span className="text-[8px] text-slate-500 font-bold">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200/70 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Step selector */}
                        {canEdit && (
                          <div
                            className="pt-0.5 opacity-90 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CardStepSelector
                              currentStepId={card.currentStepId}
                              steps={steps}
                              onSelectStep={(targetStepId) => onMoveCardStep(card.id, targetStepId)}
                              size="compact"
                            />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // -------------------------------------------------------------
                  // MODE 2: MEDIUM COMPACT VIEW (3 OR 4 CARDS)
                  // Focus: Reference & Nom cÃ´te Ã  cÃ´te, Photo, Labels, Due Date compact, Checklists
                  // -------------------------------------------------------------
                  if (isMedium3To4) {
                    return (
                      <div
                        key={card.id}
                        data-card="true" data-link-entity="card" data-link-id={card.id} data-link-label={`Carte — ${card.reference} · ${card.modele}`}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleCardDragOver(e, step.id, card)}
                        onDragLeave={(e) => handleCardDragLeave(e, card)}
                        onDrop={(e) => handleCardDrop(e, step.id, card)}
                        className={`bg-white/80 hover:bg-white/95 backdrop-blur-xs rounded-lg border transition-all p-2 space-y-1.5 group ${
                          canEdit ? 'cursor-grab active:cursor-grabbing hover:border-indigo-300' : 'cursor-pointer'
                        } ${
                          isDraggingThisCard
                            ? 'opacity-40 scale-95 border-dashed border-indigo-500 ring-2 ring-indigo-400 shadow-md rotate-1'
                            : 'border-white/70 shadow-xs hover:shadow-md'
                        }${reorderIndicator(card)}`}
                        onClick={() => onCardClick(card)}
                      >
                        {/* Reference & Nom du ModÃ¨le CÃ”TE Ã€ CÃ”TE */}
                        <div className="flex items-center gap-1.5 min-w-0 text-[10.5px]">
                          {canEdit && (
                            <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                          )}
                          {card.cardType === 'simple' ? (
                            <span className="font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 shrink-0 text-[9.5px] flex items-center gap-0.5" title="Carte Simple">
                              <span>ðŸ“</span> Simple
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 shrink-0 text-[10px]">
                              {card.reference}
                            </span>
                          )}
                          <span className="font-bold text-slate-800 truncate text-[10px]" title={card.modele}>
                            {card.modele}
                          </span>
                        </div>

                        {/* 1. Visuel de la carte (SimpleCardVisual ou Photo du ModÃ¨le) */}
                        {card.cardType === 'simple' ? (
                          <div className="h-20 w-full">
                            <SimpleCardVisual visual={card.simpleVisual} title={card.modele} size="md" />
                          </div>
                        ) : (
                          <div className="relative rounded-md overflow-hidden bg-white/70 border border-slate-200/80 h-20 w-full flex items-center justify-center p-0.5">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={card.modele}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/80 text-slate-400 text-[9.5px] gap-0.5">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                                <span>Photo en attente</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Ã‰tiquette(s) / Label(s) */}
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {card.labels.map((lbl) => (
                              <span
                                key={lbl.id}
                                className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${lbl.badgeClass}`}
                              >
                                {lbl.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 3. Due Date (Compacte) */}
                        {hasDueDate && (
                          <div
                            className={`flex items-center justify-between text-[9px] px-1.5 py-0.5 rounded border ${dueStatus.bgClass} ${dueStatus.textClass} ${dueStatus.borderClass}`}
                            title={`Prochaine mise Ã  jour Commercial: ${dueStatus.formattedDate}${card.dueDateNotes ? ` - Note: ${card.dueDateNotes}` : ''}`}
                          >
                            <div className="flex items-center gap-1 font-semibold truncate">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>Due: <strong>{dueStatus.formattedDate}</strong></span>
                            </div>
                            <span className="text-[8px] px-1 py-0.2 rounded bg-white/70 border border-black/10 font-black shrink-0">
                              {dueStatus.badgeLabel}
                            </span>
                          </div>
                        )}

                        {/* 4. Checklists Progression */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between text-[9px] text-slate-600 font-semibold">
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              Checklists: {done}/{total}
                            </span>
                            <span className="font-bold text-slate-500 text-[8.5px]">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200/70 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Move controls */}
                        {canEdit && (
                          <div
                            className="pt-0.5 border-t border-slate-100/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CardStepSelector
                              currentStepId={card.currentStepId}
                              steps={steps}
                              onSelectStep={(targetStepId) => onMoveCardStep(card.id, targetStepId)}
                              size="medium"
                            />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // -------------------------------------------------------------
                  // MODE 3: FULL VIEW (1 OR 2 CARDS) - REDUCED & COMPACT
                  // Focus: Reference & Nom cÃ´te Ã  cÃ´te, Photo, Labels, Due Date compact, Checklists
                  // -------------------------------------------------------------
                  return (
                    <div
                      key={card.id}
                      data-card="true" data-link-entity="card" data-link-id={card.id} data-link-label={`Carte — ${card.reference} · ${card.modele}`}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleCardDragOver(e, step.id, card)}
                      onDragLeave={(e) => handleCardDragLeave(e, card)}
                      onDrop={(e) => handleCardDrop(e, step.id, card)}
                      className={`bg-white/80 hover:bg-white/95 backdrop-blur-xs rounded-lg border transition-all p-2 space-y-1.5 group ${
                        canEdit ? 'cursor-grab active:cursor-grabbing hover:border-indigo-300' : 'cursor-pointer'
                      } ${
                        isDraggingThisCard
                          ? 'opacity-40 scale-95 border-dashed border-indigo-500 ring-2 ring-indigo-400 shadow-md rotate-1'
                          : 'border-white/70 shadow-xs hover:shadow-md'
                      }${reorderIndicator(card)}`}
                      onClick={() => onCardClick(card)}
                    >
                      {/* Top Reference & Nom du ModÃ¨le CÃ”TE Ã€ CÃ”TE */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canEdit && (
                          <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        )}
                        {card.cardType === 'simple' ? (
                          <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 shrink-0 flex items-center gap-0.5" title="Carte Simple">
                            <span>ðŸ“</span> Simple
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 shrink-0">
                            {card.reference}
                          </span>
                        )}
                        <span className="text-[10.5px] font-bold text-slate-800 truncate" title={card.modele}>
                          {card.modele}
                        </span>
                      </div>

                      {/* 1. Visuel de la carte (SimpleCardVisual ou Photo du ModÃ¨le) */}
                      {card.cardType === 'simple' ? (
                        <div className="h-24 w-full">
                          <SimpleCardVisual visual={card.simpleVisual} title={card.modele} size="lg" />
                        </div>
                      ) : (
                        <div className="rounded-md overflow-hidden border border-slate-200/80 h-24 w-full bg-white/70 p-1 flex items-center justify-center relative">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={card.modele}
                              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/80 text-slate-400 text-[10px] gap-1">
                              <ImageIcon className="w-4 h-4 text-slate-300" />
                              <span className="font-medium">Photo en attente</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Ã‰tiquette(s) / Label(s) */}
                      {card.labels && card.labels.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {card.labels.map((lbl) => (
                            <span
                              key={lbl.id}
                              className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border shadow-2xs ${lbl.badgeClass}`}
                            >
                              {lbl.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 3. Due Date (Compacte & DiscrÃ¨te) */}
                      {hasDueDate && (
                        <div
                          className={`flex items-center justify-between text-[9px] px-2 py-0.5 rounded border ${dueStatus.bgClass} ${dueStatus.textClass} ${dueStatus.borderClass} shadow-2xs`}
                          title={`Date prochaine de mise Ã  jour Commercial: ${dueStatus.formattedDate}${card.dueDateNotes ? ` - Note: ${card.dueDateNotes}` : ''}`}
                        >
                          <div className="flex items-center gap-1 font-semibold truncate">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>Due : <strong>{dueStatus.formattedDate}</strong></span>
                          </div>
                          <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-white/90 border border-black/10 font-bold shadow-2xs shrink-0">
                            {dueStatus.badgeLabel}
                          </span>
                        </div>
                      )}

                      {/* 4. Checklists Progression */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] text-slate-600 font-semibold">
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-2.5 h-2.5 text-emerald-600" />
                            Checklists: {done}/{total}
                          </span>
                          <span className="font-bold text-slate-700 text-[8.5px]">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200/70 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Move buttons footer */}
                      {canEdit && (
                        <div
                          className="pt-1 border-t border-slate-100/60 opacity-90 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CardStepSelector
                            currentStepId={card.currentStepId}
                            steps={steps}
                            onSelectStep={(targetStepId) => onMoveCardStep(card.id, targetStepId)}
                            size="full"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* Column for Orphan / Unassigned Cards (Missing or Deleted Steps) */}
      {orphanCards.length > 0 && (
        <div className="w-[min(85vw,288px)] sm:w-72 shrink-0 rounded-xl border border-amber-300 transition-all duration-200 flex flex-col h-full max-h-full shadow-sm bg-amber-50/75 backdrop-blur-md">
          <div className="px-2.5 py-2 border-b border-amber-200 rounded-t-xl flex items-center justify-between gap-2 bg-amber-100/90 text-amber-900 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-4.5 h-4.5 rounded-full font-bold text-[9.5px] flex items-center justify-center shrink-0 bg-amber-600 text-white shadow-2xs">
                <AlertTriangle className="w-2.5 h-2.5" />
              </span>
               <h3 className="text-[11.5px] font-black break-words whitespace-normal leading-tight" title="Cartes à réassigner suite à une modification ou suppression d'étape">
                Ã€ reclasser
              </h3>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white text-amber-900 border border-amber-300 shadow-2xs">
              {orphanCards.length}
            </span>
          </div>

          <div className="p-1.5 overflow-y-auto flex-1 min-h-0 space-y-1.5 scrollbar-thin">
            {orphanCards.map((card) => {
              const photoUrl =
                card.frame?.fileUrl ||
                (card.attachments || []).find((att) => att.mimeType.startsWith('image/'))?.fileUrl;

              return (
                <div
                  key={card.id}
                  data-card="true" data-link-entity="card" data-link-id={card.id} data-link-label={`Carte — ${card.reference} · ${card.modele}`}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, card.id)}
                  onDragEnd={handleDragEnd}
                  // Colonne « à réclasser » : pas de réordonnancement interne
                  // (aucune étape valide), seulement le dépôt de fichiers externes.
                  onDragOver={(e) => {
                    if (!canEdit || !hasDroppedFiles(e)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setFileOverCardId(card.id);
                  }}
                  onDragLeave={(e) => handleCardDragLeave(e, card)}
                  onDrop={(e) => {
                    if (!canEdit || !hasDroppedFiles(e)) return;
                    e.preventDefault();
                    setFileOverCardId(null);
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length && onDropFiles) onDropFiles(card, files);
                  }}
                  className={`bg-white/95 rounded-lg border border-amber-200 p-2.5 space-y-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer${reorderIndicator(card)}`}
                  onClick={() => onCardClick(card)}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {card.cardType === 'simple' ? (
                      <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 shrink-0 flex items-center gap-0.5">
                        <span>ðŸ“</span> Simple
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                        {card.reference}
                      </span>
                    )}
                    <span className="text-[10.5px] font-bold text-slate-800 truncate" title={card.modele}>
                      {card.modele}
                    </span>
                  </div>

                  {card.cardType === 'simple' ? (
                    <div className="h-16 w-full">
                      <SimpleCardVisual visual={card.simpleVisual} title={card.modele} size="sm" />
                    </div>
                  ) : photoUrl ? (
                    <div className="rounded-md overflow-hidden border border-slate-200/80 h-16 w-full bg-white p-0.5 flex items-center justify-center">
                      <img src={photoUrl} alt={card.modele} className="w-full h-full object-contain" />
                    </div>
                  ) : null}

                  <p className="text-[9.5px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200/60 leading-tight">
                    Ã‰tape prÃ©cÃ©dente non trouvÃ©e. Choisissez une nouvelle Ã©tape ci-dessous :
                  </p>

                  {canEdit && steps.length > 0 && (
                    <div className="pt-1 border-t border-amber-100" onClick={(e) => e.stopPropagation()}>
                      <CardStepSelector
                        currentStepId={card.currentStepId}
                        steps={steps}
                        onSelectStep={(targetStepId) => onMoveCardStep(card.id, targetStepId)}
                        size="full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

