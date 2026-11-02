import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, StepDefinition, UserProfile, MerchPole, CustomBoard } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import {
  getPoleTitle,
  getPoleLeaders,
  getBoardsForPole,
  getCardsForPoleBoards,
  POLE_COLOR_STYLES,
} from '../utils/poleHelpers';
import { getDueDateStatus } from '../utils/dueDate';
import { getCardMerchandisers } from '../utils/merchandiser';
import { PoleIdentityModal } from './PoleIdentityModal';
import { CreatePoleModal } from './CreatePoleModal';
import { BoardModal } from './BoardModal';
import { FormattedText, formattedToPlainText } from './FormattedText';
import {
  Users,
  Plus,
  Search,
  FolderKanban,
  Award,
  Sparkles,
  Clock,
  CheckSquare,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ImageIcon,
  Layers,
  FileText,
  TrendingUp,
  Settings,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
} from 'lucide-react';

interface PolesViewProps {
  poles: MerchPole[];
  boards: CustomBoard[];
  cards: Card[];
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onCardClick: (card: Card) => void;
  onCreatePole: (newPole: MerchPole) => void;
  onUpdatePole: (updatedPole: MerchPole) => void;
  onDeletePole?: (poleId: string) => void;
  onCreateBoard: (newBoard: CustomBoard) => void;
  onUpdateBoard: (updatedBoard: CustomBoard) => void;
  onDeleteBoard?: (boardId: string) => void;
  onSelectBoard: (board: CustomBoard) => void;
  poleDeepLinkId?: string | null;
}

export const PolesView: React.FC<PolesViewProps> = ({
  poles,
  boards,
  cards,
  steps,
  allUsers,
  currentUser,
  onCardClick,
  onCreatePole,
  onUpdatePole,
  onDeletePole,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onSelectBoard,
  poleDeepLinkId,
}) => {
  const canEdit = canUserCreateOrEditCards(currentUser);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected pole ID for Fiche Identitaire Modal (dynamically resolved to always show latest state)
  const [selectedPoleIdForIdentity, setSelectedPoleIdForIdentity] = useState<string | null>(null);
  const currentPoleForIdentity = useMemo(() => {
    if (!selectedPoleIdForIdentity) return null;
    return poles.find((p) => p.id === selectedPoleIdForIdentity) || null;
  }, [poles, selectedPoleIdForIdentity]);

  // Open the pole's identity modal directly when arriving via a shareable deep
  // link (?pole_id=…) — consumed only once per mount.
  const deepLinkPoleConsumedRef = useRef(false);
  useEffect(() => {
    if (poleDeepLinkId && !deepLinkPoleConsumedRef.current) {
      deepLinkPoleConsumedRef.current = true;
      setSelectedPoleIdForIdentity(poleDeepLinkId);
    }
  }, [poleDeepLinkId]);

  const [isCreatePoleModalOpen, setIsCreatePoleModalOpen] = useState(false);

  // Board Modal state
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<CustomBoard | null>(null);

  // Filtered poles
  const filteredPoles = useMemo(() => {
    return poles.filter((pole) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const title = getPoleTitle(pole, allUsers).toLowerCase();
      const specialty = (pole.specialty || '').toLowerCase();
      const leaderMatches = pole.leaderNames.some((n) => n.toLowerCase().includes(query));
      const poleBoards = getBoardsForPole(pole, boards);
      const boardMatches = poleBoards.some((b) => b.title.toLowerCase().includes(query));

      return title.includes(query) || specialty.includes(query) || leaderMatches || boardMatches;
    });
  }, [poles, searchQuery, allUsers, boards]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Top Header: Title, Search, and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Pôles de Responsables
              </h1>
              <span className="text-[11px] font-extrabold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {poles.length} Pôle{poles.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Organisation des pôles commerciaux et gestion de leurs boards de modèles
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreatePoleModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Pôle</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls & Search Bar for Poles */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un pôle (Sophie, Lucas, board, spécialité...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {filteredPoles.length} Pôle{filteredPoles.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Poles Grid */}
      {filteredPoles.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Aucun pôle ne correspond à votre recherche</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'Essayez de modifier vos termes de recherche ou réinitialisez les filtres.'
              : 'Commencez par créer votre premier pôle commercial.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setIsCreatePoleModalOpen(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un Pôle</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredPoles.map((pole) => {
            const poleTitle = getPoleTitle(pole, allUsers);
            const leaders = getPoleLeaders(pole, allUsers);
            const poleBoards = getBoardsForPole(pole, boards);
            const poleGroupedCards = getCardsForPoleBoards(pole, boards, cards);

            // Stats for this pole across all its boards
            const completedCount = poleGroupedCards.filter((c) => c.status === 'termine').length;
            const inProgressCount = poleGroupedCards.filter((c) => c.status === 'en_cours' || c.status === 'validation').length;

            return (
              <div
                key={pole.id}
                data-link-entity="pole"
                data-link-id={pole.id}
                data-link-label={`${poleTitle}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Pole Header - Clickable to open Pole Identity Modal directly */}
                <div
                  onClick={() => setSelectedPoleIdForIdentity(pole.id)}
                  className="p-4 sm:p-5 border-b border-slate-100 cursor-pointer hover:bg-slate-50/70 transition-colors group/header"
                  title={`Cliquer pour ouvrir la fiche identitaire du ${poleTitle}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2
                          className="text-base sm:text-lg font-black text-slate-900 truncate group-hover/header:text-indigo-600 transition-colors tracking-tight"
                          title={poleTitle}
                        >
                          {poleTitle}
                        </h2>

                        {/* Responsables du Pôle (Avatars & Noms à côté du titre) */}
                        {leaders.length > 0 && (
                          <div
                            className="inline-flex items-center gap-1.5 bg-slate-50 group-hover/header:bg-white px-2 py-0.5 rounded-full border border-slate-200 transition-colors shrink-0"
                            title={`Responsables : ${leaders.map((l) => `${l.name} (${l.posteLabel || 'Commercial'})`).join(', ')}`}
                          >
                            <div className="flex -space-x-1.5 shrink-0">
                              {leaders.map((ldr) => (
                                <div key={ldr.id} className="relative">
                                  {ldr.avatar ? (
                                    <img
                                      src={ldr.avatar}
                                      alt={ldr.name}
                                      className="w-5 h-5 rounded-full object-cover ring-1.5 ring-white shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center ring-1.5 ring-white shadow-2xs">
                                      {ldr.name.substring(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            <span className="text-[11px] font-bold text-slate-700">
                              {leaders.map((l) => l.name).join(' & ') || pole.leaderNames.join(' & ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {pole.specialty && (
                        <p className="text-xs text-slate-500 font-medium">
                          {pole.specialty}
                        </p>
                      )}

                      {pole.invitedVisitors && pole.invitedVisitors.length > 0 && (
                        <div className="pt-0.5">
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 transition-colors shrink-0"
                            title={`${pole.invitedVisitors.length} observateur(s) invité(s) sur ce pôle`}
                          >
                            <Eye className="w-3 h-3 text-amber-600" />
                            <span>{pole.invitedVisitors.length} observateur{pole.invitedVisitors.length > 1 ? 's' : ''}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    </div>
                </div>

                {/* Boards Attribués Preview Section */}
                <div className="p-4 sm:p-5 bg-slate-50/40 flex-1 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Boards Attribués ({poleBoards.length})
                    </h3>
                  </div>

                  {poleBoards.length === 0 ? (
                    <div className="p-5 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2">
                      <p>Aucun board n'est encore attribué à ce pôle.</p>
                      {canEdit && (
                        <div className="flex items-center justify-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBoard({ id: '', title: '', cardIds: [], poleId: pole.id, createdAt: '' } as CustomBoard);
                              setIsBoardModalOpen(true);
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Nouveau Board</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPoleIdForIdentity(pole.id)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <span>Attribuer des boards</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {poleBoards.map((board) => {
                        const boardCards = cards.filter((c) => board.cardIds.includes(c.id));
                        return (
                          <div
                            key={board.id}
                            data-link-entity="board"
                            data-link-id={board.id}
                            data-link-label={`Board — ${board.title}`}
                            onClick={() => onSelectBoard(board)}
                            className="relative rounded-xl border border-slate-300 shadow-2xs hover:shadow-lg hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between overflow-hidden group/board cursor-pointer min-h-[195px]"
                            title={`Cliquer pour afficher le board "${board.title}" en vue Kanban`}
                          >
                            {/* Full View Background Image */}
                            {board.backgroundImage ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover/board:scale-105"
                                style={{ backgroundImage: `url(${board.backgroundImage})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950" />
                            )}

                            {/* Board Header Section */}
                            <div className="relative z-10 p-2.5 sm:p-3 space-y-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 ring-2 ring-white/60 shadow-xs" />
                                    <h4 className="text-xs sm:text-sm font-black text-white break-words whitespace-normal leading-tight group-hover/board:text-indigo-200 transition-colors tracking-tight [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)]">
                                      {board.title}
                                    </h4>
                                  </div>
                                  {board.description && (
                                    <p className="text-[10px] text-white line-clamp-1 pl-3.5 [text-shadow:_0_1px_6px_rgba(0,0,0,0.8)] font-medium leading-tight">
                                      {formattedToPlainText(board.description)}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {board.invitedVisitors && board.invitedVisitors.length > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white backdrop-blur-xs border border-amber-300/50 shadow-xs"
                                      title={`${board.invitedVisitors.length} observateur(s) invité(s) sur ce board`}
                                    >
                                      <Eye className="w-2.5 h-2.5" />
                                      <span>{board.invitedVisitors.length}</span>
                                    </span>
                                  )}

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingBoard(board);
                                        setIsBoardModalOpen(true);
                                      }}
                                      className="p-1 text-white bg-black/40 hover:bg-black/60 border border-white/20 rounded-md backdrop-blur-xs transition-colors shrink-0 shadow-xs"
                                      title="Modifier ce board"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Board Cards Preview Zone */}
                            <div className="relative z-10 p-2.5 flex-1 flex flex-col justify-end space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-black text-white uppercase tracking-wider [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">
                                <span>Modèles ({boardCards.length})</span>
                              </div>

                              {boardCards.length === 0 ? (
                                <div className="p-2 text-center rounded-lg border border-dashed border-white/40 text-[10px] text-white font-medium bg-black/30 backdrop-blur-xs shadow-xs">
                                  Aucun modèle assigné.
                                </div>
                              ) : (
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5 scrollbar-thin">
                                  {boardCards.map((card) => {
                                    const step = steps.find((s) => s.id === card.currentStepId);
                                    const photoUrl =
                                      card.frame?.fileUrl ||
                                      (card.attachments && card.attachments.find((a) => a.mimeType.startsWith('image/'))?.fileUrl);
                                    const assignedMerchs = getCardMerchandisers(card, allUsers);

                                    return (
                                      <div
                                        key={card.id}
                                        data-link-entity="card"
                                        data-link-id={card.id}
                                        data-link-label={`Carte — ${card.reference}`}
                                        onClick={(e) => {
                                          if (onCardClick) {
                                            e.stopPropagation();
                                            onCardClick(card);
                                          }
                                        }}
                                        className="p-1 bg-white/90 hover:bg-white backdrop-blur-md rounded-md border border-white/60 shadow-2xs transition-all flex items-center justify-between gap-1.5 text-slate-900 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                            {photoUrl ? (
                                              <img
                                                src={photoUrl}
                                                alt={card.modele}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <ImageIcon className="w-2.5 h-2.5 text-slate-400" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1">
                                              <span className="font-mono text-[9px] font-bold text-indigo-700">
                                                {card.reference}
                                              </span>
                                              <span className="text-[9.5px] font-bold text-slate-900 truncate">
                                                {card.modele}
                                              </span>
                                            </div>
                                            <p className="text-[8.5px] text-slate-600 font-medium truncate">
                                              {card.clientName} {assignedMerchs.length > 0 && `• ${assignedMerchs.map((m) => m.name).join(', ')}`}
                                            </p>
                                          </div>
                                        </div>

                                        {step && (
                                          <span
                                            className={`text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 ${
                                              step.color || 'bg-slate-100 text-slate-800 border-slate-300'
                                            }`}
                                          >
                                            {step.name}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBoard({ id: '', title: '', cardIds: [], poleId: pole.id, createdAt: '' } as CustomBoard);
                            setIsBoardModalOpen(true);
                          }}
                          className="relative rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-500 text-indigo-600 hover:text-indigo-800 transition-all duration-300 flex flex-col items-center justify-center gap-2 min-h-[195px] cursor-pointer group/add"
                          title={`Créer un nouveau board directement pour ${poleTitle}`}
                        >
                          <div className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-indigo-400 group-hover/add:border-indigo-500 flex items-center justify-center shadow-xs">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider">Nouveau Board</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Card footer metrics */}
                <div className="p-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inProgressCount} en cours</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-600">{completedCount} terminés</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {poleGroupedCards.length} modèle{poleGroupedCards.length > 1 ? 's' : ''} total
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Board Modal (Create & Edit) */}
      {isBoardModalOpen && (
        <BoardModal
          isOpen={isBoardModalOpen}
          board={editingBoard}
          boards={boards}
          cards={cards}
          steps={steps}
          allUsers={allUsers}
          currentUser={currentUser}
          poles={poles}
          onClose={() => {
            setIsBoardModalOpen(false);
            setEditingBoard(null);
          }}
          onSaveBoard={(savedBoard) => {
            if (editingBoard && editingBoard.id) {
              onUpdateBoard(savedBoard);
            } else {
              onCreateBoard(savedBoard);
            }
            setIsBoardModalOpen(false);
            setEditingBoard(null);

            // Quand on crée ou modifie un board rattaché à un pôle, ouvrir la fiche identitaire de ce pôle
            if (savedBoard.poleId) {
              setSelectedPoleIdForIdentity(savedBoard.poleId);
            }
          }}
          onDeleteBoard={onDeleteBoard}
        />
      )}

      {/* Pole Identity Modal */}
      {currentPoleForIdentity && (
        <PoleIdentityModal
          pole={currentPoleForIdentity}
          boards={boards}
          cards={cards}
          steps={steps}
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => setSelectedPoleIdForIdentity(null)}
          onUpdatePole={(updated) => {
            onUpdatePole(updated);
          }}
          onDeletePole={(poleId) => {
            if (onDeletePole) onDeletePole(poleId);
            setSelectedPoleIdForIdentity(null);
          }}
          onCardClick={(card) => {
            setSelectedPoleIdForIdentity(null);
            onCardClick(card);
          }}
          onSelectBoard={(b) => {
            setSelectedPoleIdForIdentity(null);
            onSelectBoard(b);
          }}
          onCreateBoard={onCreateBoard}
          onAddNewBoardForPole={(pole) => {
            setEditingBoard({ id: '', title: '', cardIds: [], poleId: pole.id, createdAt: '' } as CustomBoard);
            setIsBoardModalOpen(true);
          }}
          onEditBoard={(b) => {
            setEditingBoard(b);
            setIsBoardModalOpen(true);
          }}
        />
      )}

      {/* Create Pole Modal */}
      {isCreatePoleModalOpen && (
        <CreatePoleModal
          allUsers={allUsers}
          currentUser={currentUser}
          boards={boards}
          onClose={() => setIsCreatePoleModalOpen(false)}
          onCreatePole={(newPole) => {
            onCreatePole(newPole);
            setIsCreatePoleModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
