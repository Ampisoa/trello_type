import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CustomBoard, Card, StepDefinition, UserProfile, MerchPole, InvitedVisitor } from '../types';
import { getCardMerchandisers } from '../utils/merchandiser';
import { getPoleTitle } from '../utils/poleHelpers';
import { PRESET_BOARD_BACKGROUNDS } from '../data/presetBackgrounds';
import { ApiService } from '../services/api';
import { getPublicAppUrl, getEntityDeepLink } from '../utils/appUrl';
import { RichTextEditor } from './RichTextEditor';
import {
  X,
  Layers,
  Search,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Trash2,
  AlertCircle,
  ImageIcon,
  Upload,
  Link,
  RotateCcw,
  Palette,
  Users,
  Eye,
  Mail,
  Send,
  Copy,
  CheckCircle2,
} from 'lucide-react';

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board?: CustomBoard | null; // If null, create mode
  boards: CustomBoard[]; // All boards to exclude cards already assigned elsewhere
  cards: Card[];
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  poles?: MerchPole[];
  onSaveBoard: (board: CustomBoard) => void;
  onDeleteBoard?: (boardId: string) => void;
}

export const BoardModal: React.FC<BoardModalProps> = ({
  isOpen,
  onClose,
  board,
  boards,
  cards,
  steps,
  allUsers,
  currentUser,
  poles = [],
  onSaveBoard,
  onDeleteBoard,
}) => {
  const isEditing = Boolean(board && board.id);

  const [title, setTitle] = useState(board?.title || '');
  const [description, setDescription] = useState(board?.description || '');
  const [selectedPoleId, setSelectedPoleId] = useState<string>(
    board?.poleId || (poles.length > 0 ? poles[0].id : '')
  );
  const [backgroundImage, setBackgroundImage] = useState<string>(
    board?.backgroundImage || PRESET_BOARD_BACKGROUNDS[0].url
  );
  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [bgTab, setBgTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(board?.cardIds || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMerchAssigned, setShowOnlyMerchAssigned] = useState(false);

  // Visitors / Observers states
  const [invitedVisitors, setInvitedVisitors] = useState<InvitedVisitor[]>(board?.invitedVisitors || []);
  const [visitorEmailInput, setVisitorEmailInput] = useState('');
  const [visitorNameInput, setVisitorNameInput] = useState('');
  const [copiedVisitorEmail, setCopiedVisitorEmail] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Copy a shareable deep link (?board_id=…) so a connected user can jump
  // straight back into this board (e-mail, SMS, .txt, chat…).
  const handleCopyDeepLink = () => {
    if (!board?.id) return;
    const url = getEntityDeepLink('board', board.id);
    navigator.clipboard?.writeText(url).then(
      () => {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1600);
      },
      () => {}
    );
  };

  // Synchronize state only if the board ID changes while the modal is open (prevents wiping user input on re-renders)
  const prevBoardIdRef = useRef(board?.id);
  useEffect(() => {
    if (board && board.id && board.id !== prevBoardIdRef.current) {
      prevBoardIdRef.current = board.id;
      setTitle(board.title || '');
      setDescription(board.description || '');
      setSelectedPoleId(board.poleId || (poles.length > 0 ? poles[0].id : ''));
      setBackgroundImage(board.backgroundImage || PRESET_BOARD_BACKGROUNDS[0].url);
      setSelectedCardIds(board.cardIds || []);
      setInvitedVisitors(board.invitedVisitors || []);
    }
  }, [board?.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cards already checked in other boards (to exclude them from this board)
  const otherBoardsAssignedIds = useMemo(() => {
    const ids = new Set<string>();
    boards.forEach((b) => {
      if (b.id !== board?.id) {
        b.cardIds.forEach((cId) => ids.add(cId));
      }
    });
    return ids;
  }, [boards, board]);

  // Filter cards to available candidates (excluding those in other boards)
  const candidateCards = useMemo(() => {
    return cards.filter((card) => {
      // Exclude cards already assigned in other boards
      if (otherBoardsAssignedIds.has(card.id)) {
        return false;
      }

      const assignedMerchs = getCardMerchandisers(card, allUsers);
      const hasMerch = assignedMerchs.length > 0;
      if (showOnlyMerchAssigned && !hasMerch) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const refMatches = card.reference.toLowerCase().includes(q);
      const modelMatches = card.modele.toLowerCase().includes(q);
      const clientMatches = card.clientName.toLowerCase().includes(q);
      const merchMatches = assignedMerchs.some((m) => m.name.toLowerCase().includes(q));

      return refMatches || modelMatches || clientMatches || merchMatches;
    });
  }, [cards, otherBoardsAssignedIds, allUsers, showOnlyMerchAssigned, searchQuery]);

  if (!isOpen) return null;

  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleSelectAll = () => {
    const candidateIds = candidateCards.map((c) => c.id);
    const combined = Array.from(new Set([...selectedCardIds, ...candidateIds]));
    setSelectedCardIds(combined);
  };

  const handleDeselectAll = () => {
    const candidateIdsSet = new Set(candidateCards.map((c) => c.id));
    setSelectedCardIds((prev) => prev.filter((id) => !candidateIdsSet.has(id)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setBackgroundImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setBackgroundImage(customUrlInput.trim());
    setCustomUrlInput('');
  };

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = visitorEmailInput.trim().toLowerCase();
    if (!emailClean) return;
    if (invitedVisitors.some((v) => v.email.toLowerCase().trim() === emailClean)) {
      alert('Cet observateur est déjà invité sur ce board.');
      return;
    }
    const newVis: InvitedVisitor = {
      id: `vis-board-${Date.now()}`,
      email: emailClean,
      name: visitorNameInput.trim() || undefined,
      avatar: `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(visitorNameInput.trim() || emailClean)}`,
      invitedAt: new Date().toISOString(),
      invitedBy: currentUser.name,
      invitedById: currentUser.id,
    };
    setInvitedVisitors((prev) => [...prev, newVis]);
    setVisitorEmailInput('');
    setVisitorNameInput('');
  };

  const handleRemoveVisitor = (visitorId: string) => {
    setInvitedVisitors((prev) => prev.filter((v) => v.id !== visitorId));
  };

  const handleCopyVisitorLink = async (email: string) => {
    const vis = invitedVisitors.find((v) => v.email.toLowerCase() === email.toLowerCase());
    let token = vis?.token;
    if (!token && board?.id) {
      try {
        const generated = await ApiService.getVisitorToken({
          email,
          name: vis?.name,
          boardId: board.id,
        });
        if (generated) {
          token = generated;
          if (vis) {
            vis.token = generated;
          }
        }
      } catch (err) {
        console.warn('[BoardModal] Fallback to email param:', err);
      }
    }

    const baseUrl = getPublicAppUrl();
    const url = token
      ? `${baseUrl}?visitor_token=${encodeURIComponent(token)}&board_id=${board?.id || ''}`
      : `${baseUrl}?visitor_email=${encodeURIComponent(email)}&board_id=${board?.id || ''}`;

    navigator.clipboard?.writeText(url).then(() => {
      setCopiedVisitorEmail(email);
      setTimeout(() => setCopiedVisitorEmail(null), 2500);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Veuillez donner un titre au Board.');
      return;
    }

    if (!selectedPoleId.trim()) {
      alert('Veuillez sélectionner le pôle auquel ce board est obligatoirement rattaché.');
      return;
    }

    const savedBoard: CustomBoard = {
      id: board?.id || `board-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      poleId: selectedPoleId.trim(),
      backgroundImage: backgroundImage || undefined,
      cardIds: selectedCardIds,
      invitedVisitors,
      createdAt: board?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: board?.createdBy || currentUser.name,
    };

    onSaveBoard(savedBoard);
    onClose();
  };

  const handleDelete = () => {
    if (!board || !onDeleteBoard) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer le board "${board.title}" ?`)) {
      onDeleteBoard(board.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {isEditing ? 'Modifier le Board Personnalisé' : 'Créer un Nouveau Board'}
              </h2>
              <p className="text-xs text-slate-400">
                Regroupez manuellement les modèles et cartes assignés pour un suivi dédié
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isEditing && (
              <button
                type="button"
                onClick={handleCopyDeepLink}
                className={`p-1.5 rounded-lg transition-colors ${
                  linkCopied
                    ? 'text-emerald-300 hover:text-white hover:bg-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={linkCopied ? 'Lien copié !' : "Copier le lien direct de ce board (y aller directement en un clic, pour mail, SMS, .txt…)"}
              >
                <Link className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Information */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Titre du Board *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Collection Capsule Automne, Commandes VIP, Robes Soie..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Pôle de Rattachement *
                </label>
                <select
                  required
                  value={selectedPoleId}
                  onChange={(e) => setSelectedPoleId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold"
                >
                  <option value="" disabled>-- Sélectionner obligatoirement un pôle --</option>
                  {poles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getPoleTitle(p, allUsers)}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Un board est toujours obligatoirement rattaché à un pôle.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Description ou Note d'objectif (optionnel)
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                minRows={2}
                hideMentions
                placeholder="Ex: Regroupement des cartes pour les essayages presse et défilé"
              />
            </div>

            {/* Background Image Customizer */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Fond du Board
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Personnalisez l'arrière-plan avec une photo d'atelier, de textile ou votre propre image.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBgPickerOpen(!isBgPickerOpen)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isBgPickerOpen ? 'Fermer le sélecteur' : 'Changer le fond'}</span>
                </button>
              </div>

              {/* Current Background Preview Card */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-2xs h-24 flex items-center justify-between p-4 group">
                {backgroundImage ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950" />
                )}

                <div className="relative z-10 text-white min-w-0 bg-black/40 backdrop-blur-xs p-2 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Aperçu du Board
                  </span>
                  <h4 className="text-sm font-black text-white truncate mt-0.5">
                    {title || 'Titre du Board'}
                  </h4>
                </div>

                <div className="relative z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBgPickerOpen(!isBgPickerOpen)}
                    className="px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-bold rounded-lg backdrop-blur-xs transition-colors flex items-center gap-1.5 border border-white/20 shadow-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Changer le fond</span>
                  </button>

                  {backgroundImage && (
                    <button
                      type="button"
                      onClick={() => setBackgroundImage('')}
                      className="p-1.5 bg-black/50 hover:bg-red-600/80 text-white rounded-lg backdrop-blur-xs transition-colors border border-white/20"
                      title="Réinitialiser / enlever l'image"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Background Picker Panel */}
              {isBgPickerOpen && (
                <div className="bg-white rounded-xl border border-slate-300 p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <button
                      type="button"
                      onClick={() => setBgTab('presets')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        bgTab === 'presets'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Choisir une photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgTab('upload')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        bgTab === 'upload'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgTab('url')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        bgTab === 'url'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Lien URL</span>
                    </button>
                  </div>

                  {/* Tab 1: Presets Gallery */}
                  {bgTab === 'presets' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Sélectionnez une photo de texture haute résolution :
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                        {PRESET_BOARD_BACKGROUNDS.map((preset) => {
                          const isSelected = backgroundImage === preset.url;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => setBackgroundImage(preset.url)}
                              className={`relative rounded-lg overflow-hidden h-20 border-2 cursor-pointer transition-all group/preset ${
                                isSelected
                                  ? 'border-indigo-600 shadow-md ring-2 ring-indigo-300'
                                  : 'border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <img
                                src={preset.thumbnail}
                                alt={preset.name}
                                className="w-full h-full object-cover group-hover/preset:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5">
                                <span className="text-[10px] font-bold text-white truncate drop-shadow-xs">
                                  {preset.name}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Upload photo */}
                  {bgTab === 'upload' && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-500">
                        Téléchargez une image depuis votre ordinateur (JPG, PNG, WebP) :
                      </p>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 rounded-xl p-6 text-center cursor-pointer transition-all space-y-2"
                      >
                        <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
                        <div className="text-xs font-bold text-slate-800">
                          Cliquez pour choisir une photo ou glissez-déposez ici
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Formats supportés : JPG, PNG, WEBP.
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Tab 3: URL */}
                  {bgTab === 'url' && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-500">
                        Entrez l'adresse web directe d'une image (https://...) :
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Manual Model / Card Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Modèles / Cartes à regrouper dans ce board
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
                    {selectedCardIds.length} sélectionné{selectedCardIds.length > 1 ? 's' : ''}
                  </span>
                  {otherBoardsAssignedIds.size > 0 && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {otherBoardsAssignedIds.size} modèle{otherBoardsAssignedIds.size > 1 ? 's' : ''} déjà assigné{otherBoardsAssignedIds.size > 1 ? 's' : ''} ailleurs masqué{otherBoardsAssignedIds.size > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sélectionnez les modèles pour ce board. Les modèles déjà affectés à un autre board sont exclus.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer les cartes disponibles par référence, modèle, client ou commercial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Cards List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-slate-50/50">
              {candidateCards.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {otherBoardsAssignedIds.size > 0 && cards.length > 0
                    ? 'Aucun modèle disponible (tous les autres modèles sont déjà attribués à d’autres boards ou ne correspondent pas aux filtres).'
                    : 'Aucune carte ne correspond aux critères de recherche.'}
                </div>
              ) : (
                candidateCards.map((card) => {
                  const isSelected = selectedCardIds.includes(card.id);
                  const assignedMerchs = getCardMerchandisers(card, allUsers);
                  const step = steps.find((s) => s.id === card.currentStepId);
                  const photoUrl = card.frame?.fileUrl || card.attachments.find((a) => a.mimeType.startsWith('image/'))?.fileUrl;

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleCard(card.id)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 hover:bg-indigo-50'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-indigo-600 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 fill-indigo-600 text-white" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={card.modele}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-800">
                              {card.reference}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 truncate">
                              {card.modele}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-medium">{card.clientName}</span>
                            <span>•</span>
                            <span className="text-indigo-700 font-medium">
                              Merchs: {assignedMerchs.map((m) => m.name).join(', ') || 'Non assigné'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Step Badge */}
                      <div className="shrink-0 flex items-center gap-2">
                        {step && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              step.color || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {step.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Visiteurs / Observateurs du Board */}
          <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-600" />
                <span>Visiteurs / Observateurs invités sur ce Board</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-full shrink-0">
                {invitedVisitors.length} observateur{invitedVisitors.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Formulaire compact d'invitation d'observateur */}
            <div className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <div>
                  <input
                    type="email"
                    value={visitorEmailInput}
                    onChange={(e) => setVisitorEmailInput(e.target.value)}
                    placeholder="visiteur@partenaire.com *"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={visitorNameInput}
                    onChange={(e) => setVisitorNameInput(e.target.value)}
                    placeholder="Nom complet (facultatif)"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddVisitor}
                  disabled={!visitorEmailInput.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md shadow-2xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Liste des observateurs invités */}
            <div className="space-y-1.5">
              {invitedVisitors.length === 0 ? (
                <div className="p-2.5 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 text-center">
                  <p className="text-xs text-amber-800 font-medium">Aucun observateur invité sur ce board</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {invitedVisitors.map((vis) => {
                    const isCopied = copiedVisitorEmail === vis.email;
                    return (
                      <div
                        key={vis.id}
                        className="p-2.5 border border-amber-200/90 rounded-lg bg-white shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {vis.avatar ? (
                            <img
                              src={vis.avatar}
                              alt={vis.name || vis.email}
                              className="w-7 h-7 rounded-full object-cover border border-amber-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {(vis.name || vis.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {vis.name || vis.email}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{vis.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Observateur
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyVisitorLink(vis.email)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                            title="Copier le lien d'accès observateur"
                          >
                            {isCopied ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVisitor(vis.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Retirer cet observateur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {isEditing && onDeleteBoard ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer le board</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Enregistrer les modifications' : 'Créer le Board'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
