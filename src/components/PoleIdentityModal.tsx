import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, StepDefinition, UserProfile, MerchPole, CustomBoard, InvitedVisitor } from '../types';
import { canUserCreateOrEditCards, isVisiteur } from '../utils/permissions';
import {
  getPoleTitle,
  getPoleLeaders,
  getBoardsForPole,
  getCardsForPoleBoards,
} from '../utils/poleHelpers';
import { getCardMerchandisers } from '../utils/merchandiser';
import { getPublicAppUrl, getEntityDeepLink } from '../utils/appUrl';
import { ApiService } from '../services/api';
import { RichTextEditor } from './RichTextEditor';
import { FormattedText, formattedToPlainText } from './FormattedText';
import {
  X,
  Users,
  Mail,
  Phone,
  MessageSquare,
  FolderKanban,
  Save,
  Check,
  Eye,
  Edit3,
  Edit2,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ImageIcon,
  ExternalLink,
  Send,
  Copy,
  CheckCircle2,
  Shield,
  Link2,
} from 'lucide-react';

interface PoleIdentityModalProps {
  pole: MerchPole;
  cards: Card[];
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  boards?: CustomBoard[];
  onClose: () => void;
  onUpdatePole: (updatedPole: MerchPole) => void;
  onDeletePole?: (poleId: string) => void;
  onCardClick?: (card: Card) => void;
  onSelectBoard?: (board: CustomBoard) => void;
  onCreateBoard?: (newBoard: CustomBoard) => void;
  onAddNewBoardForPole?: (pole: MerchPole) => void;
  onEditBoard?: (board: CustomBoard) => void;
}

export const PoleIdentityModal: React.FC<PoleIdentityModalProps> = ({
  pole,
  cards,
  steps,
  allUsers,
  currentUser,
  boards = [],
  onClose,
  onUpdatePole,
  onDeletePole,
  onCardClick,
  onSelectBoard,
  onCreateBoard,
  onAddNewBoardForPole,
  onEditBoard,
}) => {
  const isUserVisitor = isVisiteur(currentUser);
  const canEdit =
    !isUserVisitor &&
    (canUserCreateOrEditCards(currentUser) ||
      pole.leaderIds.includes(currentUser.id) ||
      pole.leaderNames.some((n) => n.toLowerCase().trim() === currentUser.name.toLowerCase().trim()));

  const [activeTab, setActiveTab] = useState<'overview' | 'visitors' | 'edit'>('overview');

  // Edit Form State
  const [name, setName] = useState(pole.name || '');
  const [code, setCode] = useState(pole.code || '');
  const [specialty, setSpecialty] = useState(pole.specialty || '');
  const [description, setDescription] = useState(pole.description || '');
  const [phone, setPhone] = useState(pole.phone || '');
  const [email, setEmail] = useState(pole.email || '');
  const [teams, setTeams] = useState(pole.teams || '');
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>(pole.leaderIds || []);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>(pole.boardIds || []);
  const [isSaved, setIsSaved] = useState(false);

  // Visitors / Observers states
  const [invitedVisitors, setInvitedVisitors] = useState<InvitedVisitor[]>(pole.invitedVisitors || []);
  const [visitorEmailInput, setVisitorEmailInput] = useState('');
  const [visitorNameInput, setVisitorNameInput] = useState('');
  const [copiedVisitorEmail, setCopiedVisitorEmail] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Copy a shareable deep link (?pole_id=…) so a connected user can jump
  // straight back into this pole (e-mail, SMS, .txt, chat…).
  const handleCopyDeepLink = () => {
    const url = getEntityDeepLink('pole', pole.id);
    navigator.clipboard?.writeText(url).then(
      () => {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1600);
      },
      () => {}
    );
  };

  // Synchronize state only when pole ID changes or if not actively typing in the edit tab
  const prevPoleIdRef = useRef(pole.id);
  useEffect(() => {
    if (prevPoleIdRef.current !== pole.id) {
      prevPoleIdRef.current = pole.id;
      setName(pole.name || '');
      setCode(pole.code || '');
      setSpecialty(pole.specialty || '');
      setDescription(pole.description || '');
      setPhone(pole.phone || '');
      setEmail(pole.email || '');
      setTeams(pole.teams || '');
      setSelectedLeaderIds(pole.leaderIds || []);
      setSelectedBoardIds(pole.boardIds || []);
      setInvitedVisitors(pole.invitedVisitors || []);
    } else if (activeTab !== 'edit') {
      setSelectedBoardIds(pole.boardIds || []);
      setInvitedVisitors(pole.invitedVisitors || []);
    }
  }, [pole.id, pole.boardIds, pole.invitedVisitors, activeTab]);

  // Boards attributed to this pole
  const poleBoards = useMemo(() => {
    return getBoardsForPole(pole, boards);
  }, [pole, boards]);

  // All cards grouped across all boards of this pole
  const poleGroupedCards = useMemo(() => {
    return getCardsForPoleBoards(pole, boards, cards);
  }, [pole, boards, cards]);

  // Pole leaders
  const leaders = useMemo(() => {
    return getPoleLeaders(pole, allUsers);
  }, [pole, allUsers]);

  const poleTitle = getPoleTitle(pole, allUsers);

  // Available Merch users for leaders selector
  const availableMerchUsers = useMemo(() => {
    return allUsers.filter((u) => u.role === 'commercial' || u.role === 'admin' || u.role === 'directeur');
  }, [allUsers]);

  const handleOpenBoardKanban = (boardToOpen: CustomBoard) => {
    if (onSelectBoard) {
      onSelectBoard(boardToOpen);
      onClose();
    }
  };

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = visitorEmailInput.trim().toLowerCase();
    if (!emailClean) return;
    if (invitedVisitors.some((v) => v.email.toLowerCase().trim() === emailClean)) {
      alert('Cet observateur est déjà invité sur ce pôle.');
      return;
    }
    const newVis: InvitedVisitor = {
      id: `vis-pole-${Date.now()}`,
      email: emailClean,
      name: visitorNameInput.trim() || undefined,
      avatar: `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(visitorNameInput.trim() || emailClean)}`,
      invitedAt: new Date().toISOString(),
      invitedBy: currentUser.name,
      invitedById: currentUser.id,
    };
    const updatedVisitors = [...invitedVisitors, newVis];
    setInvitedVisitors(updatedVisitors);
    onUpdatePole({
      ...pole,
      invitedVisitors: updatedVisitors,
    });
    setVisitorEmailInput('');
    setVisitorNameInput('');
  };

  const handleRemoveVisitor = (visitorId: string) => {
    const updatedVisitors = invitedVisitors.filter((v) => v.id !== visitorId);
    setInvitedVisitors(updatedVisitors);
    onUpdatePole({
      ...pole,
      invitedVisitors: updatedVisitors,
    });
  };

  const handleCopyVisitorLink = async (email: string) => {
    const vis = invitedVisitors.find((v) => v.email.toLowerCase() === email.toLowerCase());
    let token = vis?.token;
    if (!token) {
      try {
        const generated = await ApiService.getVisitorToken({
          email,
          name: vis?.name,
          poleId: pole.id,
        });
        if (generated) {
          token = generated;
          if (vis) {
            vis.token = generated;
          }
        }
      } catch (err) {
        console.warn('[PoleIdentityModal] Fallback to email param:', err);
      }
    }

    const baseUrl = getPublicAppUrl();
    const url = token
      ? `${baseUrl}?visitor_token=${encodeURIComponent(token)}&pole_id=${pole.id}`
      : `${baseUrl}?visitor_email=${encodeURIComponent(email)}&pole_id=${pole.id}`;

    navigator.clipboard?.writeText(url).then(() => {
      setCopiedVisitorEmail(email);
      setTimeout(() => setCopiedVisitorEmail(null), 2500);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedLeaderUsers = allUsers.filter((u) => selectedLeaderIds.includes(u.id));
    const leaderNames = selectedLeaderUsers.map((u) => u.name);

    const updated: MerchPole = {
      ...pole,
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      specialty: specialty.trim() || undefined,
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      teams: teams.trim() || undefined,
      leaderIds: selectedLeaderIds,
      leaderNames,
      boardIds: selectedBoardIds,
      invitedVisitors,
    };

    onUpdatePole(updated);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setActiveTab('overview');
    }, 800);
  };

  const toggleLeaderSelection = (userId: string) => {
    setSelectedLeaderIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleBoardSelection = (boardId: string) => {
    setSelectedBoardIds((prev) =>
      prev.includes(boardId) ? prev.filter((id) => id !== boardId) : [...prev, boardId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-7 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0 ring-2 ring-white/10">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Pôle Commercial
                </span>
                {pole.code && (
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {pole.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                <h2 className="text-base sm:text-xl font-black text-white truncate tracking-tight">
                  {poleTitle}
                </h2>

                {/* Profils des merchs responsables à droite du titre */}
                {leaders.length > 0 && (
                  <div
                    className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-xs"
                    title={`Responsables : ${leaders.map((l) => `${l.name} (${l.posteLabel || 'Commercial'})`).join(', ')}`}
                  >
                    <div className="flex -space-x-1.5 shrink-0">
                      {leaders.map((leader) => (
                        <div key={leader.id} className="relative">
                          {leader.avatar ? (
                            <img
                              src={leader.avatar}
                              alt={leader.name}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-white shadow-2xs"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[9px] ring-1 ring-white shadow-2xs">
                              {leader.name.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <span className="text-xs font-bold text-white">
                      {leaders.map((l) => l.name).join(' & ') || pole.leaderNames.join(' & ')}
                    </span>

                    {leaders.some((l) => l.email || l.phone) && (
                      <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/25">
                        {leaders.map((ldr) => (
                          <div key={ldr.id} className="flex items-center gap-1">
                            {ldr.email && (
                              <a
                                href={`mailto:${ldr.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-white/80 hover:text-white transition-colors"
                                title={`${ldr.name} : ${ldr.email}`}
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                            {ldr.phone && (
                              <a
                                href={`tel:${ldr.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-white/80 hover:text-white transition-colors"
                                title={`${ldr.name} : ${ldr.phone}`}
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {pole.specialty && (
                <p className="text-xs text-indigo-200 font-medium truncate mt-0.5">
                  {pole.specialty}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyDeepLink}
              className={`p-1.5 rounded-lg transition-colors ${
                linkCopied
                  ? 'text-emerald-300 hover:text-white hover:bg-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={linkCopied ? 'Lien copié !' : "Copier le lien direct de ce pôle (y aller directement en un clic, pour mail, SMS, .txt…)"}
            >
              <Link2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 py-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Identité du Pôle</span>
            </button>

            <button
              onClick={() => setActiveTab('visitors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'visitors'
                  ? 'bg-white text-amber-800 shadow-xs border border-amber-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Observateurs / Visiteurs</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'visitors'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {invitedVisitors.length}
              </span>
            </button>

            {canEdit && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'edit'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Paramètres & Attribution</span>
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              {poleBoards.length} board{poleBoards.length > 1 ? 's' : ''} •{' '}
              {poleGroupedCards.length} modèle{poleGroupedCards.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* TAB 1: OVERVIEW & IDENTITÉ DU PÔLE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Coordonnées & Contact du Pôle (si renseignés, format compact) */}
              {(pole.phone || pole.email || pole.teams) && (
                <div className="bg-indigo-50/50 rounded-xl px-3 py-2 border border-indigo-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-indigo-900 shrink-0">
                    <Phone className="w-3 h-3 text-indigo-600" />
                    <span>Contact :</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {pole.phone && (
                      <a
                        href={`tel:${pole.phone}`}
                        className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 transition-colors bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs text-xs"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{pole.phone}</span>
                      </a>
                    )}

                    {pole.email && (
                      <a
                        href={`mailto:${pole.email}`}
                        className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 transition-colors bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs text-xs"
                      >
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{pole.email}</span>
                      </a>
                    )}

                    {pole.teams && (
                      <a
                        href={
                          pole.teams.startsWith('http')
                            ? pole.teams
                            : `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(pole.teams)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-semibold text-indigo-700 hover:text-indigo-900 transition-colors bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs text-xs"
                        title="Ouvrir sur Microsoft Teams"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-600" />
                        <span>Teams : {pole.teams}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Description du Pôle */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Description & Missions
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{pole.description ? 'Modifier' : 'Ajouter une description'}</span>
                    </button>
                  )}
                </div>

                {pole.description ? (
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <FormattedText text={pole.description} />
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Aucune description renseignée pour ce pôle. {canEdit && 'Cliquez sur « Ajouter une description » pour présenter ses missions.'}
                  </div>
                )}
              </div>

              {/* Section 2: Aperçu des Boards Attribués */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Boards Attribués à ce Pôle ({poleBoards.length})
                    </h3>
                  </div>
                </div>

                {poleBoards.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2 shadow-2xs">
                    <FolderKanban className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Aucun board n'est encore attribué à ce pôle</p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Créez un nouveau board ou attribuez des boards existants à ce pôle.
                    </p>
                    {canEdit && (
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {onAddNewBoardForPole && (
                          <button
                            onClick={() => onAddNewBoardForPole(pole)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nouveau Board</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTab('edit')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <span>Attribuer des Boards</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {poleBoards.map((b) => {
                      const boardCards = cards.filter((c) => b.cardIds.includes(c.id));
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleOpenBoardKanban(b)}
                          className="relative rounded-xl border border-slate-300 shadow-2xs hover:shadow-lg hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between overflow-hidden group/board cursor-pointer min-h-[210px]"
                          title={`Cliquer pour afficher le board "${b.title}" en vue Kanban`}
                        >
                          {/* Full View Background Image */}
                          {b.backgroundImage ? (
                            <div
                              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover/board:scale-105"
                              style={{ backgroundImage: `url(${b.backgroundImage})` }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950" />
                          )}

                          {/* Board Header Section */}
                          <div className="relative z-10 p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 ring-2 ring-white/60 shadow-xs" />
                                  <h4 className="text-xs sm:text-sm font-black text-white break-words whitespace-normal leading-tight group-hover/board:text-indigo-200 transition-colors tracking-tight [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)]">
                                    {b.title}
                                  </h4>
                                </div>
                                {b.description && (
                                  <p className="text-[10.5px] text-white line-clamp-1 pl-3.5 [text-shadow:_0_1px_6px_rgba(0,0,0,0.8)] font-medium">
                                    {formattedToPlainText(b.description)}
                                  </p>
                                )}
                              </div>
                              {canEdit && onEditBoard && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditBoard(b);
                                  }}
                                  className="p-1 bg-black/40 hover:bg-black/70 text-white rounded-md backdrop-blur-md transition-colors shrink-0 shadow-xs"
                                  title="Modifier ce board"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Board Cards Preview Zone */}
                          <div className="relative z-10 p-2.5 flex-1 flex flex-col justify-end space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-black text-white uppercase tracking-wider [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">
                              <span>Modèles ({boardCards.length})</span>
                            </div>

                            {boardCards.length === 0 ? (
                              <div className="p-2.5 text-center rounded-lg border border-dashed border-white/40 text-[10.5px] text-white font-medium bg-black/30 backdrop-blur-xs shadow-xs">
                                Aucun modèle assigné.
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5 scrollbar-thin">
                                {boardCards.map((card) => {
                                  const step = steps.find((s) => s.id === card.currentStepId);
                                  const photoUrl =
                                    card.frame?.fileUrl ||
                                    (card.attachments && card.attachments.find((a) => a.mimeType.startsWith('image/'))?.fileUrl);
                                  const assignedMerchs = getCardMerchandisers(card, allUsers);

                                  return (
                                    <div
                                      key={card.id}
                                      onClick={(e) => {
                                        if (onCardClick) {
                                          e.stopPropagation();
                                          onCardClick(card);
                                        }
                                      }}
                                      className="p-1.5 bg-white/90 hover:bg-white backdrop-blur-md rounded-md border border-white/60 shadow-xs transition-all flex items-center justify-between gap-1.5 text-slate-900 cursor-pointer"
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
                                            <ImageIcon className="w-3 h-3 text-slate-400" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono text-[9px] font-bold text-indigo-700">
                                              {card.reference}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-900 truncate">
                                              {card.modele}
                                            </span>
                                          </div>
                                          <p className="text-[9px] text-slate-600 font-medium truncate">
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
                      {canEdit && onAddNewBoardForPole && (
                        <button
                          type="button"
                          onClick={() => onAddNewBoardForPole(pole)}
                          className="relative rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-500 text-indigo-600 hover:text-indigo-800 transition-all duration-300 flex flex-col items-center justify-center gap-2 min-h-[210px] cursor-pointer group/add"
                          title="Créer un nouveau board directement pour ce pôle"
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
            </div>
          )}

          {/* TAB 2: OBSERVATEURS & VISITEURS DU PÔLE */}
          {activeTab === 'visitors' && (
            <div className="space-y-5">
              {/* Header & Explication de la portée */}
              <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Observateurs et Visiteurs Invités sur ce Pôle
                      </h3>
                      <p className="text-xs text-slate-600">
                        Accès en consultation seule accordé par les responsables du pôle
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-full self-start sm:self-auto">
                    {invitedVisitors.length} observateur{invitedVisitors.length > 1 ? 's' : ''} actif{invitedVisitors.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Scope Notice */}
                <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Portée de l'invitation Pôle :</span>
                  </div>
                  <p className="leading-relaxed">
                    Tout observateur invité sur ce pôle a automatiquement visibilité sur <strong>ce pôle</strong>, ainsi que sur l'ensemble des <strong>{poleBoards.length} boards</strong> et <strong>{poleGroupedCards.length} modèles/cartes</strong> qui lui sont rattachés.
                  </p>
                  <p className="font-semibold text-amber-950 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Statut STRICT : Lecture seule. L'observateur ne peut modifier aucun paramètre, ni déplacer les cartes dans le Kanban.
                  </p>
                </div>
              </div>

              {/* Formulaire d'invitation (réservé aux responsables / merchs) */}
              {canEdit ? (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      Inviter un nouvel observateur sur ce pôle
                    </h4>
                    <span className="text-[10px] text-slate-500 italic">
                      Lien d'accès ou invitation par e-mail
                    </span>
                  </div>

                  <form onSubmit={handleAddVisitor} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Adresse e-mail *
                      </label>
                      <input
                        type="email"
                        value={visitorEmailInput}
                        onChange={(e) => setVisitorEmailInput(e.target.value)}
                        placeholder="observateur@partenaire.com"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nom complet (facultatif)
                      </label>
                      <input
                        type="text"
                        value={visitorNameInput}
                        onChange={(e) => setVisitorNameInput(e.target.value)}
                        placeholder="Ex: Marc Dupond"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={!visitorEmailInput.trim()}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Inviter</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  Seuls les responsables du pôle ou l'équipe de direction peuvent ajouter ou retirer des observateurs sur ce pôle.
                </div>
              )}

              {/* Liste des observateurs */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Observateurs enregistrés ({invitedVisitors.length})
                  </h4>
                </div>

                {invitedVisitors.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 text-center space-y-2">
                    <Eye className="w-8 h-8 text-amber-500/70 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">Aucun observateur invité pour le moment</p>
                    <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                      Les observateurs invités pourront consulter ce pôle, ses boards et toutes les cartes en lecture seule stricte.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {invitedVisitors.map((vis) => {
                      const isCopied = copiedVisitorEmail === vis.email;
                      return (
                        <div
                          key={vis.id}
                          className="p-3.5 border border-slate-200 hover:border-amber-200 rounded-xl bg-white shadow-2xs flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {vis.avatar ? (
                              <img
                                src={vis.avatar}
                                alt={vis.name || vis.email}
                                className="w-9 h-9 rounded-full object-cover border border-amber-200 ring-2 ring-amber-50"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                                {(vis.name || vis.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {vis.name || vis.email}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">{vis.email}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                  Accès Pôle complet
                                </span>
                                {vis.notes && (
                                  <span className="text-[9px] text-slate-500 truncate italic">
                                    • {vis.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyVisitorLink(vis.email)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copier le lien d'accès observateur pour ce pôle"
                            >
                              {isCopied ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVisitor(vis.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Retirer cet observateur"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EDIT PARAMETERS & CONFIGURATION */}
          {activeTab === 'edit' && canEdit && (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Responsables & Titre du Pôle
                </h3>

                {/* Leader selection among Merchs */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sélectionner les Responsables du Pôle *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Le titre du pôle sera automatiquement formaté en fonction des responsables sélectionnés (ex: "Pôle de Sophie et Lucas").
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {availableMerchUsers.map((u) => {
                      const isSelected = selectedLeaderIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleLeaderSelection(u.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="relative shrink-0">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                                {u.name.substring(0, 1).toUpperCase()}
                              </div>
                            )}
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[9px] shadow-xs">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{u.posteLabel || u.role}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Boards Attribution Section */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Boards Attribués à ce Pôle
                    </label>
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {selectedBoardIds.length} attribué{selectedBoardIds.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Cochez les boards qui regroupent les modèles et cartes relevant de ce pôle.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                    {boards.map((b) => {
                      const isChecked = selectedBoardIds.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => toggleBoardSelection(b.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                            isChecked
                              ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-indigo-600 shrink-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 fill-indigo-600 text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{b.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {b.cardIds.length} modèle{b.cardIds.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Titre Personnalisé */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Titre Personnalisé (Optionnel - sinon automatique)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pôle de Sophie et Lucas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Spécialité / Sous-titre du pôle */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Spécialité / Sous-titre du Pôle
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Haute Couture, Soieries & Modèles Signatures"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ce texte s'affiche sous le titre du pôle sur la vue d'ensemble et dans sa fiche.
                  </p>
                </div>

                {/* Contact: Téléphone, Mail, Teams */}
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Contact
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Coordonnées directes de contact du pôle (téléphone, e-mail et canal ou adresse Microsoft Teams).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro de Téléphone
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="+33 1 42 68 55 10"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="pole.commercial@fashionbrand.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Adresse / Lien sur Teams
                      </label>
                      <div className="relative">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Lien canal ou adresse Teams"
                          value={teams}
                          onChange={(e) => setTeams(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description & Missions */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description & Missions du Pôle
                  </label>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Présentez les missions, les clients prioritaires et les expertises du pôle..."
                  />
                </div>
              </div>

              {/* Actions Footer in edit tab */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {onDeletePole && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Confirmer la suppression du ${poleTitle} ?`)) {
                        onDeletePole(pole.id);
                        onClose();
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer ce Pôle</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Enregistré !</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Enregistrer les Modifications</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
