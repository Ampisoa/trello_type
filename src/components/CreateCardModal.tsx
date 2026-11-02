import React, { useState, useMemo } from 'react';
import { Card, StepDefinition, UserProfile, CardAttachment, CardLabel, CardType, SimpleVisual, ChecklistItem } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import {
  X,
  Plus,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Tag,
  Check,
  Clock,
  RefreshCw,
  Layers,
  Smile,
} from 'lucide-react';
import { DEFAULT_LABELS } from '../data/defaultLabels';
import { RichTextEditor } from './RichTextEditor';
import { SimpleVisualPicker } from './SimpleVisualPicker';
import { generateNextReference } from '../utils/reference';
import { importFileDataUrl, mimeTypeFromDataUrl } from '../utils/mediaUpload';
import { toNoonIsoString } from '../utils/dueDate';
import { toNumber } from '../utils/numberUtils';

interface CreateCardModalProps {
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  existingCards?: Card[];
  initialCardType?: CardType;
  // Étape sur laquelle la carte doit naître (menu "..." d'une colonne du kanban)
  initialStepId?: string;
  onClose: () => void;
  onCreateCard: (newCard: Card) => void;
}

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  steps,
  allUsers,
  currentUser,
  existingCards = [],
  initialCardType = 'modele',
  initialStepId,
  onClose,
  onCreateCard,
}) => {
  // Colonne d'arrivée : celle demandée par le menu "..." de l'étape, sinon la
  // première du board. La valeur reste toujours bordee aux étapes du board cible.
  const targetStep = useMemo(
    () => steps.find((s) => s.id === initialStepId) || steps[0],
    [steps, initialStepId]
  );

  // Existing clients / brands suggestions derived from real cards data
  const existingClients = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of existingCards) {
      const name = (c.clientName || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(name);
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [existingCards]);

  // New cards start with empty checklists for every step (no default pre-filled items)
  const emptyStepChecklists = useMemo(
    () => Object.fromEntries(steps.map((s) => [s.id, [] as ChecklistItem[]])),
    [steps]
  );

  // Mode: 'modele' (standard model card) vs 'simple' (simple memo/visual card)
  const [cardType, setCardType] = useState<CardType>(initialCardType);

  // --- SIMPLE CARD STATE ---
  const [simpleName, setSimpleName] = useState('');
  const [simpleNotes, setSimpleNotes] = useState('');
  const [simpleVisual, setSimpleVisual] = useState<SimpleVisual | undefined>(undefined);
  const [simpleLabels, setSimpleLabels] = useState<CardLabel[]>([]);

  // --- MODEL CARD STATE ---
  const [reference, setReference] = useState(() => generateNextReference(existingCards));
  const [modele, setModele] = useState('');
  const [clientName, setClientName] = useState('');

  const handleRegenerateReference = () => {
    setReference(generateNextReference(existingCards));
  };
  
  const [matiere, setMatiere] = useState('');
  const [prix, setPrix] = useState('0');
  const [quantites, setQuantites] = useState('0');
  const [dateLivraison, setDateLivraison] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [dossierPdf, setDossierPdf] = useState<CardAttachment | null>(null);
  const [framePhoto, setFramePhoto] = useState<CardAttachment | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<CardLabel[]>([]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [dueDateNotes, setDueDateNotes] = useState('');
  const [historiqueNote, setHistoriqueNote] = useState('');

  // Titles given to default color labels during card creation
  const [labelTitles, setLabelTitles] = useState<Record<string, string>>({});
  const setLabelTitle = (id: string, title: string) =>
    setLabelTitles((prev) => ({ ...prev, [id]: title }));
  const withTitle = (lbl: CardLabel): CardLabel => {
    const title = (labelTitles[lbl.id] || '').trim();
    return title ? { ...lbl, name: title } : lbl;
  };

  const toggleLabelSelection = (label: CardLabel) => {
    if (selectedLabels.some((l) => l.id === label.id)) {
      setSelectedLabels(selectedLabels.filter((l) => l.id !== label.id));
    } else {
      setSelectedLabels([...selectedLabels, withTitle(label)]);
    }
  };

  const toggleSimpleLabelSelection = (label: CardLabel) => {
    if (simpleLabels.some((l) => l.id === label.id)) {
      setSimpleLabels(simpleLabels.filter((l) => l.id !== label.id));
    } else {
      setSimpleLabels([...simpleLabels, withTitle(label)]);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Ce fichier PDF dépasse la taille maximale (15 Mo). Veuillez choisir un document plus léger.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setDossierPdf({
        id: `att-dt-${Date.now()}`,
        name: file.name,
        fileUrl: event.target?.result as string,
        mimeType: file.type,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        category: 'dossier_technique',
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // La photo est recadrée en carré exact 98 × 98 avant d'arriver dans la fiche.
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let fileDataUrl: string;
    try {
      fileDataUrl = await importFileDataUrl(file);
    } catch {
      alert(`Impossible de lire l'image "${file.name}".`);
      return;
    }

    setFramePhoto({
      id: `att-frame-${Date.now()}`,
      name: file.name,
      fileUrl: fileDataUrl,
      mimeType: mimeTypeFromDataUrl(fileDataUrl) || file.type,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      category: 'frame',
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // -------------------------------------------------------------
    // CAS 1 : CARTE SIMPLE (libre, non rattachée, sans réf/client/prix...)
    // -------------------------------------------------------------
    if (cardType === 'simple') {
      if (!simpleName.trim()) return;

      const firstStep = targetStep || { id: 'step-1', name: 'Étape 1', order: 1 };
      const uniqueCardId = `card-smp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const autoRef = `SMP-${Math.floor(100 + Math.random() * 900)}`;

      const newCard: Card = {
        id: uniqueCardId,
        reference: autoRef,
        modele: simpleName.trim(),
        clientName: '',
        currentStepId: firstStep.id,
        status: 'en_cours',
        cardType: 'simple',
        simpleVisual: simpleVisual,
        dateCreation: new Date().toISOString(),
        dateLivraison: '',
        dossierTechnique: null,
        frame:
          simpleVisual && (simpleVisual.type === 'photo' || simpleVisual.type === 'gif')
            ? {
                id: `att-frame-smp-${Date.now()}`,
                name: 'Visuel carte simple',
                fileUrl: simpleVisual.content,
                mimeType: simpleVisual.type === 'gif' ? 'image/gif' : 'image/jpeg',
                category: 'frame',
                uploadedAt: new Date().toISOString(),
                uploadedBy: currentUser.name,
              }
            : null,
        attachments: [],
        labels: simpleLabels,
        stepChecklists: emptyStepChecklists,
        descriptionSpec: {
          modele: simpleName.trim(),
          matiere: '',
          prix: 0,
          quantites: 0,
          historiqueNote: simpleNotes.trim(),
        },
        members: [
          {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            avatar: currentUser.avatar,
            addedAt: new Date().toISOString(),
          },
        ],
        historyLogs: [
          {
            id: `hist-${Date.now()}`,
            cardId: uniqueCardId,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            action: 'Création d\'une carte simple',
            details: `Nom: ${simpleName.trim()}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      onCreateCard(newCard);
      onClose();
      return;
    }

    // -------------------------------------------------------------
    // CAS 2 : CARTE MODÈLE (standard de collection avec spécifications complètes)
    // -------------------------------------------------------------
    if (!modele.trim() || !reference.trim()) return;

    const firstStep = targetStep;
    if (!firstStep) return;

    const initialMembers = [
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar: currentUser.avatar,
        addedAt: new Date().toISOString(),
      },
    ];

    const uniqueCardId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newCard: Card = {
      id: uniqueCardId,
      reference: reference.trim(),
      modele: modele.trim(),
      clientName: clientName.trim(),
      currentStepId: firstStep.id,
      status: 'en_cours',
      cardType: 'modele',
      dateCreation: new Date().toISOString(),
      dateLivraison: dateLivraison ? toNoonIsoString(dateLivraison) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: dueDate ? toNoonIsoString(dueDate) : undefined,
      dueDateNotes: dueDateNotes.trim() || undefined,
      dossierTechnique: dossierPdf,
      frame: framePhoto,
      attachments: [],
      labels: selectedLabels,
      descriptionSpec: {
        modele: modele.trim(),
        matiere: matiere.trim() || 'Textile standard',
        prix: toNumber(prix),
        quantites: toNumber(quantites),
        historiqueNote: historiqueNote.trim() || 'Carte créée via l\'interface.',
      },
      members: initialMembers,
      stepChecklists: emptyStepChecklists,
      historyLogs: [
        {
          id: `hist-${Date.now()}`,
          cardId: uniqueCardId,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          action: 'Création de la carte',
          details: `Modèle: ${modele.trim()} (${reference.trim()})`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onCreateCard(newCard);
    onClose();
  };

  if (!canUserCreateOrEditCards(currentUser)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold">Créer une nouvelle Carte</h3>
            {targetStep && (
              <span
                className="text-[10px] font-bold bg-indigo-600/80 text-white px-1.5 py-0.5 rounded-md border border-indigo-400/60"
                title="Étape du kanban dans laquelle la carte sera créée"
              >
                Étape {targetStep.order}: {targetStep.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Type Switcher Button Group */}
        <div className="px-6 py-3 bg-slate-900/95 border-b border-slate-800">
          <div className="grid grid-cols-2 gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setCardType('modele')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                cardType === 'modele'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-200 shrink-0" />
              <div className="text-left">
                <div className="leading-tight">Carte pour Modèle</div>
                <div className="text-[10px] font-normal text-slate-300 opacity-80 hidden sm:block">Production & Collection</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCardType('simple')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                cardType === 'simple'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Smile className="w-4 h-4 text-amber-200 shrink-0" />
              <div className="text-left">
                <div className="leading-tight">Carte Simple</div>
                <div className="text-[10px] font-normal text-slate-300 opacity-80 hidden sm:block">Note, mémo & visuel libre</div>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body */}
        {cardType === 'simple' ? (
          /* ============================================================ */
          /* FORMULAIRE CARTE SIMPLE (Non rattachée, sans réf/client/prix...) */
          /* ============================================================ */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            {/* Bannière explicative */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <span className="text-lg leading-none">💡</span>
              <div>
                <p className="font-bold">Carte Simple (Mémo / Libre)</p>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  Cette carte n'est rattachée à aucun client, référence ou commande de production. Définissez simplement son <strong>Nom</strong>, son <strong>Visuel</strong> (Emoji, GIF, Photo ou Message) et vos <strong>Notes de départ</strong>.
                </p>
              </div>
            </div>

            {/* Nom de la carte */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nom de la carte <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="ex: Brief shooting photo, Relance fournisseur boutons, Idée motif floral..."
                value={simpleName}
                onChange={(e) => setSimpleName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Visuel libre (Emoji, GIF, Photo, Message) */}
            <SimpleVisualPicker
              visual={simpleVisual}
              onChange={setSimpleVisual}
              titlePreview={simpleName || 'Aperçu carte'}
            />

            {/* Notes & Spécifications de départ */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Notes & Spécifications de départ
              </label>
              <RichTextEditor
                value={simpleNotes}
                onChange={setSimpleNotes}
                placeholder="Détails du mémo, instructions d'équipe, mentions (@)..."
                minRows={3}
                isDark={false}
                users={allUsers}
              />
            </div>

            {/* Labels / Étiquettes optionnelles */}
            <div className="pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Étiquette(s) / Catégorie (Optionnel)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DEFAULT_LABELS.map((lbl) => {
                  const isSelected = simpleLabels.some((l) => l.id === lbl.id);
                  const title = labelTitles[lbl.id] || '';
                  return (
                    <div key={lbl.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSimpleLabelSelection(lbl)}
                        title="Activer cette couleur"
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold transition-all border flex items-center gap-1 cursor-pointer ${lbl.badgeClass} ${
                          isSelected ? 'ring-2 ring-amber-500 scale-105' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span>{title}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                      {isSelected && (
                        <input
                          type="text"
                          placeholder="Titre..."
                          value={title}
                          onChange={(e) => setLabelTitle(lbl.id, e.target.value)}
                          className="w-28 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!simpleName.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Créer la Carte Simple
              </button>
            </div>
          </form>
        ) : (
          /* ============================================================ */
          /* FORMULAIRE CARTE MODÈLE (Standard complet)                    */
          /* ============================================================ */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Référence <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateReference}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Générer la prochaine référence séquentielle disponible"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto-générer
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="ex: REF-2026-004"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border rounded-lg focus:outline-none focus:ring-1 border-slate-300 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Plusieurs fiches peuvent partager la même référence (ex: doublons de modèles).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Client / Marque associé(e) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Maison Haute Couture"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  list="clients-list"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <datalist id="clients-list">
                  {existingClients.map((client) => (
                    <option key={client} value={client} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nom du Modèle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ex: Chemise Soie Oversize Signature"
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Matière / Tissu Principal
              </label>
              <RichTextEditor
                value={matiere}
                onChange={setMatiere}
                minRows={2}
                hideMentions
                placeholder="ex: 100% Soie Mulberry Crêpe de Chine"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Prix Unitaire (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Quantité (pcs)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantites}
                  onChange={(e) => setQuantites(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Livraison Prévue
                </label>
                <input
                  type="date"
                  value={dateLivraison}
                  onChange={(e) => setDateLivraison(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Due Date (Date prochaine mise à jour Merch) */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Due Date (Prochaine mise à jour par le/la Commerciale)
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                />
                <input
                  type="text"
                  value={dueDateNotes}
                  onChange={(e) => setDueDateNotes(e.target.value)}
                  placeholder="Rappel (ex: Relance validation tissu)..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Labels Selector */}
            <div className="pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Étiquettes / Labels
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DEFAULT_LABELS.map((lbl) => {
                  const isSelected = selectedLabels.some((l) => l.id === lbl.id);
                  const title = labelTitles[lbl.id] || '';
                  return (
                    <div key={lbl.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLabelSelection(lbl)}
                        title="Activer cette couleur"
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold transition-all border flex items-center gap-1 cursor-pointer ${lbl.badgeClass} ${
                          isSelected ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span>{title}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                      {isSelected && (
                        <input
                          type="text"
                          placeholder="Titre..."
                          value={title}
                          onChange={(e) => setLabelTitle(lbl.id, e.target.value)}
                          className="w-28 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes & Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Notes & Spécifications de départ
              </label>
              <RichTextEditor
                value={historiqueNote}
                onChange={setHistoriqueNote}
                placeholder="Précisions de confection, directives, mentions (@)..."
                minRows={2}
                isDark={false}
                users={allUsers}
              />
            </div>

            {/* Files Upload Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-rose-600" /> Dossier rattaché (.pdf)
                </label>
                {dossierPdf ? (
                  <p className="text-xs text-emerald-700 font-medium truncate">{dossierPdf.name}</p>
                ) : (
                  <label className="block text-center py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                    + PDF Dossier rattaché
                    <input type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Visuel Frame (Photo)
                </label>
                {framePhoto ? (
                  <p className="text-xs text-emerald-700 font-medium truncate">{framePhoto.name}</p>
                ) : (
                  <label className="block text-center py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                    + Photo Frame
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!reference.trim() || !modele.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Créer la Carte Modèle
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
