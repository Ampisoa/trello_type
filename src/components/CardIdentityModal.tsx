import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InteractiveCommentsSection } from './InteractiveCommentsSection';
import { RichTextEditor } from './RichTextEditor';
import { hasDroppedFiles, importFileDataUrl, ingestFilesIntoCard, mimeTypeFromDataUrl } from '../utils/mediaUpload';
import { FormattedText } from './FormattedText';
import {
  Card,
  StepDefinition,
  UserRole,
  UserProfile,
  CardAttachment,
  CardMember,
  ChecklistItem,
  CardComment,
  CardLabel,
  CardMerchandiser,
  InvitedVisitor,
  SimpleVisual,
  Vague,
} from '../types';
import {
  canUserCreateOrEditCards,
  isVisiteur,
  canInviteVisitors,
  canRemoveVisitors,
  canDesignateTempResponsable,
  designateTempResponsablePointClient,
  removeTempResponsablePointClient,
  getTempResponsableInfo,
} from '../utils/permissions';

import { toNumber } from '../utils/numberUtils';
import { getCardMerchandisers } from '../utils/merchandiser';
import { ApiService } from '../services/api';
import { getPublicAppUrl, getEntityDeepLink } from '../utils/appUrl';
import { SimpleVisualPicker } from './SimpleVisualPicker';
import { SimpleCardVisual } from './SimpleCardVisual';
import {
  X,
  FileText,
  Image as ImageIcon,
  Users,
  Clock,
  CheckSquare,
  Paperclip,
  Upload,
  UserPlus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  MessageSquare,
  Send,
  Tag,
  UserCheck,
  Mail,
  Shield,
  ShieldAlert,
  UserMinus,
  Check,
  AlertCircle,
  Copy,
  Archive,
  Link2,
  Activity,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StepChecklistTree } from './StepChecklistTree';
import { HistoryLogTable } from './HistoryLogTable';
import { FileViewerModal } from './FileViewerModal';
import { LabelSelectorPopover } from './LabelSelectorPopover';
import { DueDateSelectorPopover } from './DueDateSelectorPopover';
import { DEFAULT_LABELS } from '../data/defaultLabels';
import { getDueDateStatus, toNoonIsoString } from '../utils/dueDate';

interface CardIdentityModalProps {
  card: Card;
  allCards?: Card[];
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onClose: () => void;
  onUpdateCard: (updated: Card) => void;
  onDeleteCard?: (cardId: string) => void;
  onDuplicateCard?: (card: Card) => void;
  onArchiveCard?: (card: Card) => void;
  onInviteVisitorUser?: (cardId: string, email: string, name?: string) => void;
  onRemoveVisitorUser?: (cardId: string, email: string) => void;
  // Temp Responsable Point Client
  onDesignateTempResponsable?: (targetUserId: string, durationHours: number) => Promise<void>;
  onRemoveTempResponsable?: (targetUserId: string) => Promise<void>;
}

export const CardIdentityModal: React.FC<CardIdentityModalProps> = ({
  card,
  allCards = [],
  steps,
  allUsers,
  currentUser,
  onClose,
  onUpdateCard,
  onDeleteCard,
  onDuplicateCard,
  onArchiveCard,
  onInviteVisitorUser,
  onRemoveVisitorUser,
  onDesignateTempResponsable,
  onRemoveTempResponsable,
}) => {
  // Existing clients / brands suggestions derived from real cards data
  const existingClients = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of allCards) {
      const name = (c.clientName || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(name);
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allCards]);

  const [activeTab, setActiveTab] = useState<'identity' | 'checklists' | 'attachments' | 'members' | 'comments'>('checklists');
  const [viewingAttachment, setViewingAttachment] = useState<CardAttachment | null>(null);

  const isUserVisiteur = isVisiteur(currentUser);
  const canEdit = canUserCreateOrEditCards(currentUser);
  const initialMerchs = useMemo(() => getCardMerchandisers(card, allUsers), [card, allUsers]);
  const canInvite = canInviteVisitors(currentUser);
  const canRemove = canRemoveVisitors(currentUser);
  const [copiedVisitorEmail, setCopiedVisitorEmail] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  // Zone "Responsable Point Client" masquable
  const [isMerchZoneHidden, setIsMerchZoneHidden] = useState(false);
  // Vrai pendant qu'un fichier externe (explorateur) survole la fiche
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  // Copy a shareable deep link (?card_id=…) so a connected user can jump
  // straight back into this card (e-mail, SMS, .txt, chat…).
  const handleCopyDeepLink = () => {
    const url = getEntityDeepLink('card', card.id);
    navigator.clipboard?.writeText(url).then(
      () => {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1600);
      },
      () => {}
    );
  };

  // Form state for specs
  const [modele, setModele] = useState(card.modele || '');
  const [reference, setReference] = useState(card.reference || '');
  const [clientName, setClientName] = useState(card.clientName || '');
  const [matiere, setMatiere] = useState(card.descriptionSpec?.matiere || '');
  const [prix, setPrix] = useState<string>(card.descriptionSpec?.prix != null ? String(card.descriptionSpec.prix) : '0');
  const [quantites, setQuantites] = useState<string>(card.descriptionSpec?.quantites != null ? String(card.descriptionSpec.quantites) : '0');
  const [vagues, setVagues] = useState<Vague[]>(card.descriptionSpec?.vagues || []);
  const [historiqueNote, setHistoriqueNote] = useState(card.descriptionSpec?.historiqueNote || '');
  const [dateLivraison, setDateLivraison] = useState(
    card.dateLivraison ? card.dateLivraison.slice(0, 10) : ''
  );
  const [simpleVisual, setSimpleVisual] = useState<SimpleVisual | undefined>(card.simpleVisual);

  // Member selection state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMemberRole, setSelectedMemberRole] = useState<UserRole>('commercial');

  // Visitor Invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);

  // Selected step checklist tab view inside card modal
  const [selectedStepIdForChecklists, setSelectedStepIdForChecklists] = useState(card.currentStepId);

  // Sliding strip of steps (swipe / horizontal scroll)
  const stepsScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollSteps = (direction: 1 | -1) => {
    stepsScrollRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });
  };

  // Amène l'étape sélectionnée dans la zone visible du ruban
  useEffect(() => {
    const el = stepsScrollRef.current?.querySelector<HTMLElement>(`[data-step-id="${selectedStepIdForChecklists}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedStepIdForChecklists]);

  // Synchronize state when card prop changes
  useEffect(() => {
    setModele(card.modele || '');
    setReference(card.reference || '');
    setClientName(card.clientName || '');
    setMatiere(card.descriptionSpec?.matiere || '');
    setPrix(card.descriptionSpec?.prix != null ? String(card.descriptionSpec.prix) : '0');
    setQuantites(card.descriptionSpec?.quantites != null ? String(card.descriptionSpec.quantites) : '0');
    setVagues(card.descriptionSpec?.vagues || []);
    setHistoriqueNote(card.descriptionSpec?.historiqueNote || '');
    setDateLivraison(card.dateLivraison ? card.dateLivraison.slice(0, 10) : '');
    setSimpleVisual(card.simpleVisual);
    setSelectedStepIdForChecklists(card.currentStepId);
  }, [card.id, card.currentStepId]);

  // Dernière carte connue : un upload est asynchrone (décodage / recadrage du
  // fichier), pendant quoi la carte peut déjà avoir évolué. Lire `card` direct
  // dans ce cas utiliserait un état périmé et écraserait des fichiers ajoutés
  // entre-temps.
  const cardRef = useRef(card);
  useEffect(() => {
    cardRef.current = card;
  });

  // Ctrl+V : un fichier (image / PDF) présent dans le presse-papiers est importé
  // dans la fiche. Un simple collage de texte ne possède aucun `files` et repasse
  // donc normalement au champ en focus (RichTextEditor, commentaires, champs…).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files || !files.length) return;
      e.preventDefault();
      void ingestFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, canEdit, onUpdateCard]);

  // Labels popover state
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<CardLabel[]>(() => {
    try {
      const saved = localStorage.getItem('atelier_available_labels');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LABELS;
  });

  const handleUpdateAvailableLabels = (updatedLabels: CardLabel[]) => {
    setAvailableLabels(updatedLabels);
    try {
      localStorage.setItem('atelier_available_labels', JSON.stringify(updatedLabels));
    } catch {}
    // Synchronize card labels if any label was edited or removed
    if (card.labels && card.labels.length > 0) {
      const updatedCardLabels = card.labels
        .filter((l) => updatedLabels.some((u) => u.id === l.id))
        .map((l) => {
          const matching = updatedLabels.find((u) => u.id === l.id);
          return matching || l;
        });
      onUpdateCard({
        ...card,
        labels: updatedCardLabels,
      });
    }
  };

  // Due Date popover state
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = useState(false);

  // Handle Due Date save
  const handleSaveDueDate = (newDueDate?: string, notes?: string) => {
    if (!canEdit) return;
    const formatted = newDueDate ? new Date(newDueDate).toLocaleDateString('fr-FR') : '';
    const logDetails = newDueDate
      ? `Prochaine mise à jour commerciale fixée au ${formatted}${notes ? ` (Objectif: ${notes})` : ''}`
      : 'Date prochaine de mise à jour commerciale retirée';

    const updatedLogs = logAction('Due Date Commercial', logDetails);

    onUpdateCard({
      ...card,
      dueDate: newDueDate,
      dueDateNotes: notes,
      historyLogs: updatedLogs,
    });
  };

  // Parse various date strings safely into a Date object
  const parseTimestampToDate = (ts: string): Date => {
    if (!ts) return new Date(0);
    if (ts.includes('T')) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }
    // Handles "DD/MM/YYYY à HH:mm:ss" or "DD/MM/YYYY à HH:mm"
    const match = ts.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+à\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    }
    const isoMatch = ts.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+à\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (isoMatch) {
      const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = isoMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    }
    const parsed = new Date(ts);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  // Generate dynamic human-readable relative timestamp
  const getDynamicTimestampLabel = (rawTs: string): string => {
    const dateObj = parseTimestampToDate(rawTs);
    if (dateObj.getTime() === 0) return rawTs;

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();

    if (diffMs < 0 || diffMs < 30 * 1000) {
      return "À l'instant";
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Il y a ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }

    return dateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Toggle label handler
  const handleToggleLabel = (targetLabel: CardLabel) => {
    const currentLabels = card.labels || [];
    const exists = currentLabels.some((l) => l.id === targetLabel.id);
    const newLabels = exists
      ? currentLabels.filter((l) => l.id !== targetLabel.id)
      : [...currentLabels, targetLabel];

    const actionName = exists
      ? `Retrait étiquette: "${targetLabel.name}"`
      : `Ajout étiquette: "${targetLabel.name}"`;

    const updatedLogs = logAction('Étiquettes / Labels', actionName);

    onUpdateCard({
      ...card,
      labels: newLabels,
      historyLogs: updatedLogs,
    });
  };

  // Utility to log modification action
  const logAction = (action: string, details?: string, base: Card = card) => {
    const newLog = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      cardId: base.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    return [newLog, ...(base.historyLogs || [])];
  };

  // Step change handler
  const handleStepChange = (newStepId: string) => {
    if (!canEdit || newStepId === card.currentStepId) return;

    const oldStep = steps.find((s) => s.id === card.currentStepId)?.name || card.currentStepId;
    const newStep = steps.find((s) => s.id === newStepId)?.name || newStepId;

    const updatedLogs = logAction(
      `Changement d'étape: ${oldStep} → ${newStep}`,
      `Carte déplacée de "${oldStep}" vers "${newStep}"`
    );

    const updatedCard: Card = {
      ...card,
      currentStepId: newStepId,
      status: 'en_cours',
      historyLogs: updatedLogs,
    };

    onUpdateCard(updatedCard);
    setSelectedStepIdForChecklists(newStepId);
  };

  // Save specs handler
  const handleSaveSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (card.cardType === 'simple') {
      if (!modele.trim()) return;

      const updatedLogs = logAction(
        'Mise à jour Carte Simple',
        `Nom: ${modele.trim()}`
      );

      const updatedCard: Card = {
        ...card,
        modele: modele.trim(),
        simpleVisual: simpleVisual,
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
            : card.frame,
        descriptionSpec: {
          ...card.descriptionSpec,
          modele: modele.trim(),
          historiqueNote,
        },
        historyLogs: updatedLogs,
      };

      onUpdateCard(updatedCard);
      return;
    }

if (!reference.trim() || !modele.trim()) return;

    // Les vagues divisent la commande en plusieurs lots nommés : la quantité
    // totale devient alors la somme des vagues (sinon valeur saisie manuellement).
    const savedVagues = vagues
      .filter((v) => v.nom.trim() !== '' || v.quantite > 0)
      .map((v) => ({ ...v, nom: v.nom.trim() || 'Sans nom', quantite: Math.max(0, toNumber(String(v.quantite)) ) }));
    const totalVagues = savedVagues.reduce((sum, v) => sum + v.quantite, 0);
    const finalQuantites = savedVagues.length > 0 ? totalVagues : toNumber(quantites);
    const vaguesStr = savedVagues.length > 0 ? `, Vagues=[${savedVagues.map((v) => `${v.nom}: ${v.quantite}`).join(' | ')}]` : '';

    const updatedLogs = logAction(
      'Mise à jour Fiche Identitaire',
      `Spécifications modifiées: Modèle=${modele}, Matière=${matiere}, Prix=${prix}€, Qté=${finalQuantites}${vaguesStr}`
    );

    const updatedCard: Card = {
      ...card,
      reference,
      modele,
      clientName,
      dateLivraison: dateLivraison ? toNoonIsoString(dateLivraison) : card.dateLivraison || new Date().toISOString(),
      descriptionSpec: {
        modele,
        matiere,
        prix: toNumber(prix),
        quantites: finalQuantites,
        vagues: savedVagues,
        historiqueNote,
      },
      historyLogs: updatedLogs,
    };

    onUpdateCard(updatedCard);
  };

  // Upload handler for Dossier Technique (PDF), Frame (Photo), or Attachment.
  // Les photos sont recadrées en carré exact 98 × 98 avant d'arriver en base.
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'dossier_technique' | 'frame' | 'attachement'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset input
    if (!file || !canEdit) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Ce fichier dépasse la taille maximale recommandée (15 Mo). Veuillez sélectionner un fichier PDF plus léger.");
      return;
    }

    let fileDataUrl: string;
    try {
      fileDataUrl = await importFileDataUrl(file);
    } catch {
      alert(`Impossible de lire le fichier "${file.name}".`);
      return;
    }

    const newAttachment: CardAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      fileUrl: fileDataUrl,
      mimeType: mimeTypeFromDataUrl(fileDataUrl) || file.type,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      category,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
    };

    // Relecture du state le plus récent après l'`await` (cf. cardRef).
    const latest = cardRef.current;
    let updatedCard: Card = { ...latest };
    let actionName = '';

    if (category === 'dossier_technique') {
      actionName = 'Mise à jour Dossier rattaché (PDF)';
      updatedCard.dossierTechnique = newAttachment;
    } else if (category === 'frame') {
      actionName = 'Mise à jour Photo / Frame';
      // Jamais de perte : le visuel remplacé rejoint la liste des pièces jointes
      // pour rester visible dans "Dossier rattaché & Médias".
      const previousFrame = latest.frame;
      if (previousFrame) {
        updatedCard.attachments = [...(latest.attachments || []), { ...previousFrame, category: 'attachement' }];
      }
      updatedCard.frame = newAttachment;
    } else {
      actionName = `Ajout d'attachement (${file.name})`;
      updatedCard.attachments = [...(latest.attachments || []), newAttachment];
    }

    const updatedLogs = logAction(actionName, `Fichier "${file.name}" importé`, latest);
    updatedCard.historyLogs = updatedLogs;

    onUpdateCard(updatedCard);
  };

  // Promouvoir une pièce jointe image en "Frame / Visuel Modèle". L'ancien
  // visuel (s'il existe) prend sa place dans la liste : aucun fichier perdu.
  const handlePromoteToFrame = (attachmentId: string) => {
    if (!canEdit) return;
    const attachment = (card.attachments || []).find((a) => a.id === attachmentId);
    if (!attachment) return;

    const previousFrame = card.frame;
    const remaining = (card.attachments || []).filter((a) => a.id !== attachmentId);
    if (previousFrame) {
      remaining.push({ ...previousFrame, category: 'attachement' });
    }

    const updatedCard: Card = {
      ...card,
      frame: { ...attachment, category: 'frame' },
      attachments: remaining,
      historyLogs: logAction(
        'Mise à jour Photo / Frame',
        previousFrame
          ? `Photo "${attachment.name}" promue en Frame / Visuel Modèle (échange avec "${previousFrame.name}")`
          : `Photo "${attachment.name}" définie comme Frame / Visuel Modèle`
      ),
    };

    onUpdateCard(updatedCard);
  };

  // Remove attachment handler
  const handleRemoveAttachment = (attachmentId: string, category: string, name: string) => {
    if (!canEdit) return;

    let updatedCard: Card = { ...card };

    if (category === 'dossier_technique') {
      updatedCard.dossierTechnique = null;
    } else if (category === 'frame') {
      updatedCard.frame = null;
    } else {
      updatedCard.attachments = (card.attachments || []).filter((a) => a.id !== attachmentId);
    }

    const updatedLogs = logAction(`Suppression fichier`, `Fichier "${name}" retiré`);
    updatedCard.historyLogs = updatedLogs;

    onUpdateCard(updatedCard);
  };

  // Import de fichiers venant de l'extérieur : glisser-déposer système ou
  // Ctrl+V (capture d'écran, "Copier l'image"…). Même routage que les boutons
  // d'upload : photo -> Frame / Visuel Modèle, PDF -> Dossier rattaché,
  // tout le reste -> pièces jointes, sans jamais écraser un fichier existant.
  const ingestFiles = async (files: File[] | FileList) => {
    if (!canEdit) return;
    const list = Array.from(files);
    if (!list.length) return;

    try {
      const result = await ingestFilesIntoCard(cardRef.current, list, {
        name: currentUser.name,
        role: currentUser.role,
      });
      if (result.rejected.length) {
        alert(`Fichier(s) ignoré(s) :\n${result.rejected.join('\n')}`);
      }
      if (result.logs.length) {
        onUpdateCard(result.card);
      }
    } catch (e: any) {
      alert(`Échec de l'import du fichier : ${e?.message || 'Erreur inconnue'}`);
    }
  };

  // Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !canEdit) return;

    const userObj = allUsers.find((u) => u.id === selectedUserId);
    if (!userObj) return;

    if ((card.members || []).some((m) => m.id === userObj.id)) {
      alert('Ce membre est déjà associé à la carte.');
      return;
    }

    const memberRole = userObj.role || 'commercial';
    const newMember: CardMember = {
      id: userObj.id,
      name: userObj.name,
      email: userObj.email,
      role: memberRole,
      avatar: userObj.avatar,
      addedAt: new Date().toISOString(),
    };

    const updatedLogs = logAction(
      `Ajout membre (${memberRole.toUpperCase()})`,
      `${userObj.name} ajouté en collaboration sur la carte`
    );

    const updatedCard: Card = {
      ...card,
      members: [...(card.members || []), newMember],
      historyLogs: updatedLogs,
    };

    onUpdateCard(updatedCard);
    setSelectedUserId('');
  };

  // Remove Member
  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!canEdit) return;

    const updatedMembers = (card.members || []).filter((m) => m.id !== memberId);
    const updatedLogs = logAction('Retrait membre', `${memberName} retiré de la carte`);

    onUpdateCard({
      ...card,
      members: updatedMembers,
      historyLogs: updatedLogs,
    });
  };

  // Invite Visitor (Exclusivité Resp Point Clients & Admin)
  const handleInviteVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErrorMsg(null);
    setInviteSuccessMsg(null);

    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteErrorMsg('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const existingVisitors = card.invitedVisitors || [];

    if (existingVisitors.some((v) => v.email.toLowerCase() === normalizedEmail)) {
      setInviteErrorMsg('Cette adresse e-mail est déjà invitée sur cette carte.');
      return;
    }

    const visitorName = inviteName.trim() || inviteEmail.split('@')[0];
    const newVisitorId = `vis-${Date.now()}`;
    const newVisitor: InvitedVisitor = {
      id: newVisitorId,
      email: normalizedEmail,
      name: visitorName,
      avatar: `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(visitorName)}&eyes=variant08&hair=variant14`,
      invitedAt: new Date().toISOString(),
      invitedBy: currentUser.name + (currentUser.posteLabel ? ` (${currentUser.posteLabel})` : ''),
      invitedById: currentUser.id,
      notes: inviteNotes.trim() || undefined,
    };

    // Request signed JWT visitor token and persist immediately
    try {
      const tok = await ApiService.getVisitorToken({ email: normalizedEmail, name: visitorName, cardId: card.id });
      if (tok) {
        newVisitor.token = tok;
      }
    } catch (err) {
      console.warn('[CardIdentityModal] Visitor token request error:', err);
    }

    const updatedVisitors = [...existingVisitors, newVisitor];
    const updatedLogs = logAction(
      'Invitation Visiteur Observateur',
      `Visiteur "${visitorName}" (${normalizedEmail}) invité en observation par ${currentUser.name}`
    );

    const updatedCard: Card = {
      ...card,
      invitedVisitors: updatedVisitors,
      historyLogs: updatedLogs,
    };

    onUpdateCard(updatedCard);
    onInviteVisitorUser?.(card.id, normalizedEmail, visitorName);

    setInviteEmail('');
    setInviteName('');
    setInviteNotes('');
    setInviteSuccessMsg(`Invitation envoyée avec succès à ${normalizedEmail} !`);
    setTimeout(() => setInviteSuccessMsg(null), 5000);
  };

  // Remove / Revoke Visitor (Exclusivité Resp Point Clients & Admin)
  const handleRemoveVisitor = (visitorEmail: string, visitorName?: string) => {
    if (!canRemove) return;
    if (
      !confirm(
        `Êtes-vous sûr de vouloir retirer définitivement l'accès observateur à ${visitorName || visitorEmail} ?`
      )
    ) {
      return;
    }

    const updatedVisitors = (card.invitedVisitors || []).filter(
      (v) => v.email.toLowerCase() !== visitorEmail.toLowerCase()
    );
    const updatedLogs = logAction(
      'Révocation Visiteur Observateur',
      `Accès observateur de ${visitorName || visitorEmail} révoqué par ${currentUser.name}`
    );

    const updatedCard: Card = {
      ...card,
      invitedVisitors: updatedVisitors,
      historyLogs: updatedLogs,
    };

    onUpdateCard(updatedCard);
    onRemoveVisitorUser?.(card.id, visitorEmail);
  };

  // Update Checklist items for step with actionLog audit support
  const handleChecklistsChange = (
    stepId: string,
    updatedChecklists: ChecklistItem[],
    actionLog?: { action: string; details?: string }
  ) => {
    let updatedLogs = card.historyLogs || [];
    if (actionLog) {
      updatedLogs = logAction(actionLog.action, actionLog.details);
    }
    const updatedStepChecklists = {
      ...(card.stepChecklists || {}),
      [stepId]: updatedChecklists,
    };

    onUpdateCard({
      ...card,
      stepChecklists: updatedStepChecklists,
      historyLogs: updatedLogs,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        onDragOver={(e) => {
          if (!canEdit || !hasDroppedFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsFileDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsFileDragOver(false);
        }}
        onDrop={(e) => {
          if (!hasDroppedFiles(e)) return;
          e.preventDefault();
          setIsFileDragOver(false);
          void ingestFiles(e.dataTransfer.files);
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
          {/* Top Identity Header Banner */}
          {isUserVisiteur && (
            <div className="bg-amber-600/90 text-amber-50 px-5 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 border-b border-amber-500/40">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-200 shrink-0" />
                <span>
                  <strong>Accès Visiteur Observateur (Lecture Seule)</strong> — Vous êtes invité à observer uniquement cette carte. Aucune modification n'est autorisée.
                </span>
              </div>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-mono">
                {card.cardType === 'simple' ? 'Carte Simple' : card.reference}
              </span>
            </div>
          )}

          <div className="bg-slate-900 text-white p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-slate-800 shrink-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {card.cardType === 'simple' ? (
                  <span className="bg-amber-500/20 text-amber-300 font-sans text-xs font-bold px-2.5 py-1 rounded-md border border-amber-400/30 flex items-center gap-1.5">
                    <span>📝</span> Carte Simple
                  </span>
                ) : (
                  <span className="bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-400/30">
                    {card.reference}
                  </span>
                )}

                {/* Invited visitors count in header */}
                {card.invitedVisitors && card.invitedVisitors.length > 0 && (
                  <span className="text-xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-700/50 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-amber-400" />
                    {card.invitedVisitors.length} visiteur(s) invité(s)
                  </span>
                )}
              </div>

              {/* Trello-like Labels bar */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {card.labels && card.labels.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {card.labels.map((lbl) => (
                      <span
                        key={lbl.id}
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs border ${lbl.badgeClass}`}
                      >
                        {lbl.name}
                      </span>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setIsLabelPopoverOpen((prev) => !prev)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Étiquettes</span>
                      {card.labels && card.labels.length > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                          {card.labels.length}
                        </span>
                      )}
                    </button>

                    {isLabelPopoverOpen && (
                      <LabelSelectorPopover
                        cardLabels={card.labels || []}
                        onToggleLabel={handleToggleLabel}
                        onClose={() => setIsLabelPopoverOpen(false)}
                        availableLabels={availableLabels}
                        onUpdateAvailableLabels={handleUpdateAvailableLabels}
                      />
                    )}
                  </div>
                )}

                {/* Due Date Button (Next to Étiquettes) */}
                {canEdit ? (
                  <div className="relative inline-block">
                    {(() => {
                      const dueStatus = getDueDateStatus(card.dueDate);
                      const hasDueDate = Boolean(card.dueDate);
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsDueDatePopoverOpen((prev) => !prev)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 shadow-2xs ${
                              hasDueDate
                                ? 'bg-indigo-950/80 text-indigo-200 border-indigo-500/60 hover:bg-indigo-900/90'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                            title="Date prochaine où une merchandiser / commerciale doit faire une mise à jour de la carte"
                          >
                            <Clock className={`w-3.5 h-3.5 ${hasDueDate ? 'text-indigo-300' : 'text-indigo-400'}`} />
                            <span>Due Date</span>
                            {hasDueDate ? (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ml-0.5 border ${
                                  dueStatus.status === 'overdue'
                                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                                    : dueStatus.status === 'today'
                                    ? 'bg-amber-400 text-slate-900 border-amber-300'
                                    : 'bg-indigo-500 text-white border-indigo-400'
                                }`}
                              >
                                {dueStatus.formattedDate}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">+</span>
                            )}
                          </button>

                          {isDueDatePopoverOpen && (
                            <DueDateSelectorPopover
                              currentDueDate={card.dueDate}
                              currentDueDateNotes={card.dueDateNotes}
                              onSaveDueDate={handleSaveDueDate}
                              onClose={() => setIsDueDatePopoverOpen(false)}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  card.dueDate && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-xs font-bold rounded-lg border border-slate-700 text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Due Date: {new Date(card.dueDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Frame / Visuel Modèle card — zone dimensionnée pour le visuel carré 98 × 98 */}
            <div className="justify-self-center w-full max-w-[168px]">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex flex-wrap items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Frame / Visuel Modèle
                </label>

                {card.cardType === 'simple' ? (
                  <div className="h-24 w-full max-w-xs mx-auto">
                    <SimpleCardVisual visual={card.simpleVisual} title={card.modele} size="md" />
                  </div>
                ) : card.frame ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mx-auto w-[98px] h-[98px]">
                    <img
                      src={card.frame.fileUrl}
                      alt="Frame Modèle"
                      className="w-[98px] h-[98px] object-cover cursor-zoom-in"
                      onClick={() => setViewingAttachment(card.frame!)}
                    />
                    <button
                      type="button"
                      onClick={() => setViewingAttachment(card.frame)}
                      className="absolute bottom-1.5 left-1.5 p-1 bg-white/90 text-indigo-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-white"
                      title="Agrandir"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(card.frame!.id, 'frame', card.frame!.name)}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-700"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg text-center bg-slate-50 hover:bg-slate-100 transition-colors mx-auto w-[98px] h-[98px] flex flex-col items-center justify-center gap-1 px-1">
                    <ImageIcon className="w-5 h-5 text-slate-300" />
                    <p className="text-[9px] leading-tight font-semibold text-slate-600">Aucune photo de frame</p>
                    {canEdit && (
                      <label className="inline-flex items-center gap-1 px-1.5 py-1 bg-indigo-600 text-white rounded-md text-[9px] font-medium cursor-pointer hover:bg-indigo-700 transition-colors">
                        <Upload className="w-3 h-3" /> Charger
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'frame')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              {/* Quick Step Changer dropdown */}
              {canEdit && (
                <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                  <Layers className="w-4 h-4 text-indigo-400 ml-1" />
                  <select
                    value={card.currentStepId}
                    onChange={(e) => handleStepChange(e.target.value)}
                    className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    {steps.map((s) => (
                      <option key={s.id} value={s.id}>
                        Step {s.order}: {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleCopyDeepLink}
                className={`p-2 rounded-lg transition-colors ${
                  linkCopied ? 'text-emerald-300 hover:bg-emerald-600/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={linkCopied ? 'Lien copié !' : 'Copier le lien direct de cette fiche (y aller directement en un clic, pour mail, SMS, .txt…)'}
              >
                <Link2 className="w-5 h-5" />
              </button>

              {canEdit && onDuplicateCard && (
                <button
                  onClick={() => onDuplicateCard(card)}
                  className="p-2 text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-600/30 transition-colors"
                  title="Dupliquer la fiche (crée un double avec la même référence et le même modèle)"
                >
                  <Copy className="w-5 h-5" />
                </button>
              )}

              {canEdit && onArchiveCard && (
                <button
                  onClick={() => onArchiveCard(card)}
                  className="p-2 text-amber-300 hover:text-white rounded-lg hover:bg-amber-600/30 transition-colors"
                  title={card.archived ? 'Restaurer la fiche (la remettre dans les colonnes du board)' : 'Archiver la fiche (la déplacer dans les archives du board)'}
                >
                  <Archive className={`w-5 h-5 ${card.archived ? 'rotate-12' : ''}`} />
                </button>
              )}

              {canEdit && onDeleteCard && (
                <button
                  onClick={() => {
                    if (window.confirm(`Supprimer définitivement la fiche "${card.modele || card.reference}" ?`)) {
                      onDeleteCard(card.id);
                    }
                  }}
                  className="p-2 text-red-400 hover:text-white rounded-lg hover:bg-red-600/20 transition-colors"
                  title="Supprimer la fiche"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 border-b border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('checklists')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none ${
                activeTab === 'checklists'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Checklists par Étape</span>
              <span className="sm:hidden">Checklists</span>
            </button>

            <button
              onClick={() => setActiveTab('identity')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none ${
                activeTab === 'identity'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              {card.cardType === 'simple' ? (
                <>
                  <span className="hidden sm:inline">Notes & Visuel</span>
                  <span className="sm:hidden">Notes</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Fiche Identitaire & Spécifications</span>
                  <span className="sm:hidden">Fiche</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none ${
                activeTab === 'attachments'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Paperclip className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">
                Dossier rattaché & Médias ({ (card.dossierTechnique ? 1 : 0) + (card.frame ? 1 : 0) + (card.attachments?.length || 0) })
              </span>
              <span className="sm:hidden">
                Médias ({ (card.dossierTechnique ? 1 : 0) + (card.frame ? 1 : 0) + (card.attachments?.length || 0) })
              </span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none ${
                activeTab === 'members'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Membres & Visiteurs ({(card.members?.length || 0) + (card.invitedVisitors?.length || 0)})</span>
              <span className="sm:hidden">Membres ({(card.members?.length || 0) + (card.invitedVisitors?.length || 0)})</span>
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 min-w-[calc(50%-0.25rem)] sm:flex-none ${
                activeTab === 'comments'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-violet-600 shrink-0" />
              <span className="hidden sm:inline">Commentaires & Échanges ({(card.comments?.length || 0)})</span>
              <span className="sm:hidden">Commentaires ({(card.comments?.length || 0)})</span>
            </button>
          </div>

          {/* Modal Main Content */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto bg-slate-50/40">
            {/* TAB 1: IDENTITY & SPECIFICATIONS OR SIMPLE CARD EDITOR */}
            {activeTab === 'identity' && (
              <div className="space-y-6">
                {card.cardType === 'simple' ? (
                  <form onSubmit={handleSaveSpecs} className="space-y-5 max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                      <span className="text-xl leading-none">📝</span>
                      <div>
                        <p className="font-bold">Carte Simple (Mémo / Note Libre)</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                          Cette carte simple n'est rattachée à aucun modèle, client ou dossier technique. Vous pouvez modifier librement son nom, son visuel (Emoji, GIF, Photo ou Message) et ses notes de suivi.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Nom de la carte <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={modele}
                        onChange={(e) => setModele(e.target.value)}
                        disabled={!canEdit}
                        placeholder="Ex: Réunion équipe, Idée capsule, Mémo urgent..."
                        className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                      />
                    </div>

                    {canEdit ? (
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          Visuel de la carte (Emoji, GIF, Photo ou Petit Message)
                        </label>
                        <SimpleVisualPicker
                          visual={simpleVisual}
                          onChange={setSimpleVisual}
                          titlePreview={modele || 'Aperçu carte'}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Visuel actuel</label>
                        <div className="h-28 w-full max-w-xs">
                          <SimpleCardVisual visual={simpleVisual} title={modele} size="lg" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Notes & Spécifications de départ
                      </label>
                      <RichTextEditor
                        value={historiqueNote}
                        onChange={setHistoriqueNote}
                        disabled={!canEdit}
                        placeholder="Écrivez vos notes, consignes, liens ou rappels ici..."
                        minRows={4}
                        isDark={false}
                        users={allUsers}
                      />
                    </div>

                    {canEdit && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="submit"
                          disabled={!modele.trim()}
                          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4" /> Enregistrer les modifications
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleSaveSpecs} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Zone 1 (left, top) — Détails & Spécifications */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 self-stretch">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                          <span>Détails & Spécifications</span>
                          <span className="text-[11px] text-slate-400 font-normal normal-case">
                            Renseignez les données du modèle
                          </span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Référence <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              disabled={!canEdit}
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                              Plusieurs fiches peuvent partager la même référence (doublons autorisés).
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Client / Marque associé(e)
                            </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          disabled={!canEdit}
                          placeholder={canEdit ? 'ex: Maison Haute Couture' : ''}
                          list="clients-autocomplete"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        />
                        <datalist id="clients-autocomplete">
                          {existingClients.map((client) => (
                            <option key={client} value={client} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Modèle
                      </label>
                      <input
                        type="text"
                        value={modele}
                        onChange={(e) => setModele(e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Matière(s) & Composition
                      </label>
                      <RichTextEditor
                        value={matiere}
                        onChange={setMatiere}
                        disabled={!canEdit}
                        minRows={3}
                        hideMentions
                        placeholder="Ex: Soie Mulberry 100%, Boutons Nacre"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          Prix Unitaire (€)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={prix}
                          onChange={(e) => setPrix(e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-1.5 text-xs font-bold text-emerald-800 bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      {/* Quantité : vagues de commande */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-slate-700">Quantité</span>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                setVagues((prev) => {
                                  const nextIndex = prev.length + 1;
                                  // La première vague reprend la quantité déjà saisie
                                  const seedQty = prev.length === 0 ? Math.max(0, toNumber(quantites)) : 0;
                                  return [
                                    ...prev,
                                    { id: `vague-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, nom: `Vague ${nextIndex}`, quantite: seedQty },
                                  ];
                                })
                              }
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Vague
                            </button>
                          )}
                        </div>

                        {vagues.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {vagues.map((vague, idx) => (
                              <div key={vague.id} className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 w-6 text-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={vague.nom}
                                  onChange={(e) =>
                                    setVagues((prev) => prev.map((v) => (v.id === vague.id ? { ...v, nom: e.target.value } : v)))
                                  }
                                  disabled={!canEdit}
                                  placeholder="Nom de la vague (ex: Vague 1 - Avril)"
                                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={String(vague.quantite)}
                                  onChange={(e) =>
                                    setVagues((prev) =>
                                      prev.map((v) => (v.id === vague.id ? { ...v, quantite: Math.max(0, toNumber(e.target.value)) } : v))
                                    )
                                  }
                                  disabled={!canEdit}
                                  placeholder="Qté"
                                  className="w-20 px-2.5 py-1.5 text-xs font-bold text-blue-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                                />
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">pcs</span>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => setVagues((prev) => prev.filter((v) => v.id !== vague.id))}
                                    title="Supprimer cette vague"
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Date de Création
                        </label>
                        <input
                          type="text"
                          disabled
                          value={new Date(card.dateCreation).toLocaleDateString('fr-FR')}
                          className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-md text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Date de Livraison Prévue
                        </label>
                        <input
                          type="date"
                          value={dateLivraison}
                          onChange={(e) => setDateLivraison(e.target.value)}
                          disabled={!canEdit}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-indigo-700 font-bold">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            Due Date (MàJ Commercial)
                          </span>
                        </label>
                        <input
                          type="date"
                          value={card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ''}
                          onChange={(e) => {
                            if (!e.target.value) {
                              handleSaveDueDate(undefined, card.dueDateNotes);
                            } else {
                              handleSaveDueDate(new Date(`${e.target.value}T18:00:00Z`).toISOString(), card.dueDateNotes);
                            }
                          }}
                          disabled={!canEdit}
                          className="w-full px-3 py-1.5 text-xs bg-indigo-50/50 font-semibold border border-indigo-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:bg-white text-indigo-950"
                        />
                      </div>
                    </div>
                  </div>

                    {/* Zone 1b (right, top) — Notes & Historique Descriptif (carte isolée) */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 self-stretch flex flex-col">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                        Notes &amp; Historique Descriptif
                      </h3>
                      <RichTextEditor
                        value={historiqueNote}
                        onChange={setHistoriqueNote}
                        disabled={!canEdit}
                        fillHeight
                        className="flex-1 min-h-0"
                        placeholder="Précisions sur la fabrication, ajustements ou historique du modèle... (Mise en forme, liens, images, emojis)"
                        minRows={3}
                        isDark={false}
                        users={allUsers}
                      />
                    </div>

                    {/* Zone 2 (left, bottom) — Historique des modifications */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                      <HistoryLogTable logs={card.historyLogs || []} />
                    </div>

                    {/* Zone 3 (moitié de largeur, sous Notes) — Responsable Point Client & Temporaire */}
                    <div>
                      <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            Responsable Point Client
                          </label>
                          <div className="flex items-center gap-1.5">
                            {canDesignateTempResponsable(currentUser) && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                Privilège Resp Point Clients
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsMerchZoneHidden((v) => !v)}
                              aria-expanded={!isMerchZoneHidden}
                              aria-label={
                                isMerchZoneHidden
                                  ? 'Afficher la zone Responsable Point Client'
                                  : 'Masquer la zone Responsable Point Client'
                              }
                              title={isMerchZoneHidden ? 'Afficher' : 'Masquer'}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                            >
                              {isMerchZoneHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {!isMerchZoneHidden && (
                          <div className="space-y-3">
                            {/* Main Responsable Point Client */}
                            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg">
                              <p className="text-[11px] font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                Responsable Point Client Principal
                              </p>
                              <div className="flex items-center gap-2.5">
                                {(() => {
                                  const mainResponsable = allUsers.find((u) => {
                                    const poste = (u.posteLabel || '').toLowerCase();
                                    return poste === 'responsable point client';
                                  });
                                  if (mainResponsable) {
                                    return (
                                      <div className="flex items-center gap-2.5">
                                        {mainResponsable.avatar ? (
                                          <img src={mainResponsable.avatar} alt={mainResponsable.name} className="w-8 h-8 rounded-full object-cover border border-indigo-200" />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                            {mainResponsable.name.charAt(0)}
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-xs font-bold text-slate-900">{mainResponsable.name}</p>
                                          <p className="text-[10px] text-indigo-700">Intitulé : Responsable Point Client</p>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <p className="text-[11px] text-amber-700 italic">Aucun Responsable Point Client principal défini (posteLabel manquant)</p>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Temporary Responsable Point Client Designation */}
                            {canDesignateTempResponsable(currentUser) && (
                              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2">
                                <p className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  Désigner un Responsable Point Client Temporaire
                                </p>
                                <p className="text-[11px] text-slate-600">
                                  En cas d'absence, désignez un collaborateur comme responsable temporaire pour une durée limitée.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <select
                                    id="temp-responsable-user"
                                    className="sm:col-span-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="">— Sélectionner un collaborateur —</option>
                                    {allUsers
                                      .filter((u) => u.id !== currentUser.id)
                                      .map((u) => {
                                        const isAlreadyTemp = getTempResponsableInfo(u)?.isActive;
                                        const poste = u.posteLabel || (u.role === 'commercial' ? 'Commercial' : u.role);
                                        return (
                                          <option key={u.id} value={u.id} disabled={isAlreadyTemp}>
                                            {u.name} — {poste}{isAlreadyTemp ? ' (déjà temporaire)' : ''}
                                          </option>
                                        );
                                      })}
                                  </select>

                                  <select
                                    id="temp-responsable-duration"
                                    className="sm:col-span-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="">— Durée —</option>
                                    <option value="2">2 heures</option>
                                    <option value="4">4 heures</option>
                                    <option value="8">8 heures (1 jour)</option>
                                    <option value="24">24 heures</option>
                                    <option value="48">48 heures</option>
                                    <option value="72">72 heures (3 jours)</option>
                                    <option value="168">1 semaine (168h)</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const userId = (document.getElementById('temp-responsable-user') as HTMLSelectElement)?.value;
                                      const duration = parseInt((document.getElementById('temp-responsable-duration') as HTMLSelectElement)?.value || '0');
                                      if (!userId || !duration || !onDesignateTempResponsable) return;
                                      await onDesignateTempResponsable(userId, duration);
                                    }}
                                    disabled={!onDesignateTempResponsable}
                                    className="sm:col-span-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Désigner
                                  </button>
                                </div>

                                <p className="text-[10px] text-amber-700 italic">
                                  Le responsable temporaire aura les mêmes droits d'édition jusqu'à expiration ou retrait manuel.
                                </p>
                              </div>
                            )}

                            {/* Active Temporary Responsables List */}
                            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                              <p className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                                Responsables Temporaires Actifs
                              </p>
                              {(() => {
                                const activeTemps = allUsers
                                  .map((u) => ({ user: u, info: getTempResponsableInfo(u) }))
                                  .filter((x) => x.info?.isActive);
                                if (activeTemps.length === 0) {
                                  return <p className="text-[11px] text-slate-500 italic">Aucun responsable temporaire actif</p>;
                                }
                                return (
                                  <div className="space-y-1.5">
                                    {activeTemps.map(({ user, info }) => (
                                      <div key={user.id} className="flex items-center justify-between p-2 bg-white border border-emerald-200 rounded-lg">
                                        <div className="flex items-center gap-2.5">
                                          {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">
                                              {user.name.charAt(0)}
                                            </div>
                                          )}
                                          <div>
                                            <p className="text-xs font-bold text-slate-900">{user.name}</p>
                                            <p className="text-[10px] text-emerald-700">
                                              Expire dans ~{info?.remainingHours}h
                                              {info?.designatedBy && (
                                                <>
                                                  <span className="text-slate-500 mx-1">•</span>
                                                  Désigné par {allUsers.find((u) => u.id === info?.designatedBy)?.name || 'inconnu'}
                                                </>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (!onRemoveTempResponsable) return;
                                            await onRemoveTempResponsable(user.id);
                                          }}
                                          disabled={!onRemoveTempResponsable}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="Retirer la désignation temporaire"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

{card.cardType !== 'simple' && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-rose-600" />
                                Dossier rattaché (PDF)
                              </label>
                              {card.dossierTechnique && (
                                <button
                                  type="button"
                                  onClick={() => setViewingAttachment(card.dossierTechnique)}
                                  className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Visualiser PDF
                                </button>
                              )}
                            </div>

                            {card.dossierTechnique ? (
                              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileText className="w-8 h-8 text-rose-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">
                                      {card.dossierTechnique.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {card.dossierTechnique.size || 'PDF'} — Importé par {card.dossierTechnique.uploadedBy}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewingAttachment(card.dossierTechnique)}
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                                    title="Ouvrir"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveAttachment(
                                          card.dossierTechnique!.id,
                                          'dossier_technique',
                                          card.dossierTechnique!.name
                                        )
                                      }
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-white transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50">
                                <p className="text-xs font-medium text-slate-600">Aucun Dossier rattaché (.pdf)</p>
                                {canEdit && (
                                  <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-800 transition-colors">
                                    <Upload className="w-3.5 h-3.5" /> Insérer un fichier .pdf
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf"
                                      onChange={(e) => handleFileUpload(e, 'dossier_technique')}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            )}
</div>
                      )}
                    </div>

                    {/* Bouton Enregistrer tout en bas */}
                    {canEdit && (
                      <div className="pt-4 border-t border-slate-100 flex justify-end col-span-1 md:col-span-2">
                        <button
                          type="submit"
                          disabled={!reference.trim() || !modele.trim()}
                          className="w-full sm:w-auto py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4" /> Enregistrer les spécifications
                        </button>
                      </div>
                    )}
                  </form>
                )}
            </div>
          )}

          {/* TAB 2: STEP CHECKLISTS */}
            {activeTab === 'checklists' && (
              <div className="space-y-5">
                {/* Step selector bar : ruban glissant */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                    Sélectionner l'Étape:
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 sm:hidden">
                    Étape:
                  </span>

                  <div
                    ref={stepsScrollRef}
                    className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth overscroll-x-contain"
                  >
                    {steps.map((step) => {
                      const isCurrent = step.id === card.currentStepId;
                      const isSelected = step.id === selectedStepIdForChecklists;
                      const items = (card.stepChecklists || {})[step.id] || step.defaultChecklists || [];
                      const doneCount = items.filter((i) => i.completed).length;

                      return (
                        <button
                          key={step.id}
                          type="button"
                          data-step-id={step.id}
                          onClick={() => setSelectedStepIdForChecklists(step.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 snap-start flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{step.name}</span>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Étape actuelle" />
                          )}
                          <span className="text-[10px] opacity-75 bg-black/10 px-1 rounded">
                            {doneCount}/{items.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => scrollSteps(-1)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Étapes précédentes"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollSteps(1)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Étapes suivantes"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Selected Step Banner */}
                {(() => {
                  const targetStep = steps.find((s) => s.id === selectedStepIdForChecklists) || steps[0];
                  const currentItems = (card.stepChecklists || {})[targetStep.id] || targetStep.defaultChecklists || [];

                  return (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-md text-xs font-bold border ${targetStep.color}`}>
                            Step {targetStep.order}: {targetStep.name}
                          </span>
                          {targetStep.id === card.currentStepId && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Étape active actuelle
                            </span>
                          )}
                        </div>

                        {canEdit && targetStep.id !== card.currentStepId && (
                          <button
                            type="button"
                            onClick={() => handleStepChange(targetStep.id)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg border border-indigo-200 transition-colors"
                          >
                            Mettre la carte à cette étape
                          </button>
                        )}
                      </div>

                      <StepChecklistTree
                        checklists={currentItems}
                        onChangeChecklists={(updated, actionLog) => handleChecklistsChange(targetStep.id, updated, actionLog)}
                        userRole={currentUser.role}
                        currentUserName={currentUser.name}
                        onLogAction={logAction}
                        isReadOnly={!canEdit}
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: ATTACHMENTS (FILES & MEDIA) */}
            {activeTab === 'attachments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Gestion des Pièces Jointes & Fichiers
                    </h3>
                    <p className="text-xs text-slate-500">
                      Insérez vos fichiers .pdf (dossier rattaché, patron), visuels de frame ou photos complémentaires.
                    </p>
                  </div>

                  {canEdit && (
                    <label className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-2 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" /> Inserer un fichier
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'attachement')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary PDF & Frame */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-rose-600" /> Dossier rattaché Principal
                    </h4>
                    {card.dossierTechnique ? (
                      <div className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate">{card.dossierTechnique.name}</span>
                        <button
                          onClick={() => setViewingAttachment(card.dossierTechnique)}
                          className="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                        >
                          Visualiser
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucun PDF attaché</p>
                    )}
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-600" /> Photo / Frame Principale
                    </h4>
                    {card.frame ? (
                      <div
                        className="p-3 bg-slate-50 border rounded-lg flex items-center gap-3 cursor-zoom-in hover:bg-slate-100 transition-colors"
                        onClick={() => setViewingAttachment(card.frame!)}
                      >
                        <img
                          src={card.frame.fileUrl}
                          alt={card.frame.name}
                          className="w-20 h-20 rounded-lg border border-slate-200 object-cover shrink-0 bg-white"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 break-all">{card.frame.name}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                            <Eye className="w-3 h-3" /> Cliquer pour agrandir
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucune photo attachée</p>
                    )}
                  </div>
                </div>

                {/* Additional Attachments List */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Autres pièces jointes ({card.attachments?.length || 0})
                    </h4>
                    {canEdit && (
                      <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                        <Upload className="w-3.5 h-3.5" /> Ajouter un PDF / Fichier
                        <input
                          type="file"
                          accept=".pdf,application/pdf,image/*,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, 'attachement')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {(!card.attachments || card.attachments.length === 0) ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-lg">
                      Aucun attachement complémentaire pour cette carte.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {(card.attachments || []).map((att) => (
                        <div
                          key={att.id}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {att.mimeType.startsWith('image/') ? (
                              <img
                                src={att.fileUrl}
                                alt={att.name}
                                onClick={() => setViewingAttachment(att)}
                                className="w-12 h-12 rounded-lg border border-slate-200 object-cover shrink-0 bg-slate-100 cursor-zoom-in hover:ring-2 hover:ring-indigo-400 transition-shadow"
                                title="Cliquer pour agrandir"
                              />
                            ) : (
                              <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{att.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Ajouté le {new Date(att.uploadedAt).toLocaleDateString('fr-FR')} par {att.uploadedBy} ({att.size})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {canEdit && att.mimeType.startsWith('image/') && (
                              <button
                                onClick={() => handlePromoteToFrame(att.id)}
                                className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
                                title="Choisir cette photo comme Frame / Visuel Modèle (l'ancien visuel prend sa place dans la liste)"
                              >
                                <ImageIcon className="w-3.5 h-3.5" /> Mettre en Frame
                              </button>
                            )}
                            {!att.mimeType.startsWith('image/') && (
                              <button
                                onClick={() => setViewingAttachment(att)}
                                className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold hover:bg-indigo-100"
                              >
                                Aperçu
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleRemoveAttachment(att.id, 'attachement', att.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: MEMBERS & ACCESS */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* SECTION A: VISITEURS OBSERVATEURS INVITÉS (Par e-mail / Lien) */}
                <div className="bg-gradient-to-br from-amber-500/5 via-white to-amber-500/10 p-5 rounded-xl border border-amber-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-amber-600" />
                        Visiteurs Observateurs Invités par le Commercial
                      </h3>
                      <p className="text-[11px] text-amber-800/80 mt-0.5">
                        Le Commercial en charge invite des observateurs externes par e-mail ou lien direct (Approche 1 : aucun compte utilisateur ni mot de passe n'est requis). Le visiteur consulte la fiche en lecture seule.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-full">
                        {card.invitedVisitors?.length || 0} observateur(s) invité(s)
                      </span>
                    </div>
                  </div>

                  {/* Form to invite visitor (Merchs & Direction) */}
                  {canInvite ? (
                    <form onSubmit={handleInviteVisitor} className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-indigo-600" />
                          Inviter un nouvel observateur par e-mail
                        </label>
                        <span className="text-[10px] text-slate-500 italic">
                          Accès lecture seule par lien ou adresse e-mail
                        </span>
                      </div>

                      {inviteErrorMsg && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>{inviteErrorMsg}</span>
                        </div>
                      )}

                      {inviteSuccessMsg && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{inviteSuccessMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="visiteur@externe.com *"
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <input
                            type="text"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            placeholder="Nom de l'observateur (ex: Claire Valette)"
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-1 flex gap-2">
                          <input
                            type="text"
                            value={inviteNotes}
                            onChange={(e) => setInviteNotes(e.target.value)}
                            placeholder="Note / Audit (facultatif)"
                            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={!inviteEmail}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Inviter
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Seuls les <strong>Commerciaux en charge</strong> ou la Direction peuvent inviter des observateurs sur ce modèle.
                      </span>
                    </div>
                  )}

                  {/* List of invited visitors */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Observateurs enregistrés sur cette fiche ({card.invitedVisitors?.length || 0})
                    </h4>

                    {(!card.invitedVisitors || card.invitedVisitors.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 text-center">
                        <Eye className="w-5 h-5 text-amber-500 mx-auto mb-1 opacity-70" />
                        <p className="text-xs font-semibold text-amber-900">Aucun visiteur invité pour l'instant</p>
                        <p className="text-[11px] text-amber-700/80">
                          Saisissez un e-mail ci-dessus pour inviter un tiers externe en observation.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {card.invitedVisitors.map((vis) => {
                          const baseUrl = getPublicAppUrl();
                          const visitorUrl = vis.token
                            ? `${baseUrl}?visitor_token=${encodeURIComponent(vis.token)}&card_id=${card.id}`
                            : `${baseUrl}?visitor_email=${encodeURIComponent(vis.email)}&card_id=${card.id}`;
                          const isCopied = copiedVisitorEmail === vis.email;

                          return (
                            <div
                              key={vis.id}
                              className="p-3.5 border border-amber-200/90 rounded-xl bg-white shadow-2xs flex flex-col justify-between gap-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  {vis.avatar ? (
                                    <img
                                      src={vis.avatar}
                                      alt={vis.name}
                                      className="w-9 h-9 rounded-full object-cover border border-amber-200"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                                      {vis.name?.charAt(0) || 'V'}
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-slate-900 truncate">{vis.name}</p>
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                                        Observateur
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">{vis.email}</p>
                                  </div>
                                </div>

                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVisitor(vis.email, vis.name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 shrink-0"
                                    title="Révoquer et retirer le visiteur"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-amber-100 text-[10px] text-amber-900/70">
                                <span className="truncate">
                                  {vis.invitedBy ? `Invité par ${vis.invitedBy}` : 'Invité'}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={`mailto:${encodeURIComponent(vis.email)}?subject=${encodeURIComponent(`Suivi de fiche : ${card.modele || card.reference || 'Modèle'}`)}&body=${encodeURIComponent(`Bonjour,\n\nVous êtes invité(e) à consulter la fiche "${card.modele || card.reference}" en lecture seule.\n\nAccédez-y directement via ce lien sécurisé :\n${visitorUrl}\n\nCordialement,\nL'équipe Atelier`)}`}
                                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded border border-amber-200 transition-colors flex items-center gap-1"
                                    title="Envoyer un e-mail avec le lien d'accès"
                                  >
                                    <Mail className="w-3 h-3 text-amber-600" />
                                    <span>Envoyer</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      let urlToCopy = visitorUrl;
                                      if (!vis.token) {
                                        try {
                                          const tok = await ApiService.getVisitorToken({ email: vis.email, name: vis.name, cardId: card.id });
                                          if (tok) {
                                            vis.token = tok;
                                            urlToCopy = `${baseUrl}?visitor_token=${encodeURIComponent(tok)}&card_id=${card.id}`;
                                            const updatedVisitors = (card.invitedVisitors || []).map((v) =>
                                              v.id === vis.id || v.email.toLowerCase() === vis.email.toLowerCase() ? { ...v, token: tok } : v
                                            );
                                            onUpdateCard({
                                              ...card,
                                              invitedVisitors: updatedVisitors,
                                            });
                                          }
                                        } catch {}
                                      }
                                      navigator.clipboard.writeText(urlToCopy);
                                      setCopiedVisitorEmail(vis.email);
                                      setTimeout(() => setCopiedVisitorEmail(null), 3000);
                                    }}
                                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded border border-amber-200 transition-colors flex items-center gap-1 shrink-0"
                                    title="Copier le lien sécurisé direct pour le visiteur"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700 font-bold">Lien copié !</span>
                                      </>
                                    ) : (
                                      <>
                                        <Paperclip className="w-3 h-3 text-amber-600" />
                                        <span>Copier le lien</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION B: COLLABORATEURS INTERNES */}
                <div className="space-y-4">
                  {/* Add member form */}
                  {canEdit && (
                    <form onSubmit={handleAddMember} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        MEMBRES ACTUELLES
                      </h3>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        >
                          <option value="">-- en collaboration avec --</option>
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.posteLabel || u.role}) - {u.email}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          disabled={!selectedUserId}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs disabled:opacity-50 transition-colors shrink-0"
                        >
                          Ajouter
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of active members */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Membres autorisés sur cette carte ({card.members.length})
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {card.members.map((member) => (
                        <div
                          key={member.id}
                          className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                                {member.name.charAt(0)}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{member.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {initialMerchs.some(
                              (m) => (m.id && m.id === member.id) || m.name.toLowerCase() === member.name.toLowerCase()
                            ) && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> Commercial Responsable
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
member.role === 'commercial'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {member.role === 'commercial' ? 'COMMERCIAL (Édition)' : 'CLIENT (Lecture)'}
                            </span>

                            {canEdit && (card.members?.length || 0) > 1 && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Retirer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: COMMENTS & EXCHANGES */}
            {activeTab === 'comments' && (
              <div className="space-y-5">
                <InteractiveCommentsSection
                  cardId={card.id}
                  comments={card.comments || []}
                  currentUser={currentUser}
                  allUsers={allUsers}
                  onCommentsChange={(updatedComments) => {
                    onUpdateCard({
                      ...card,
                      comments: updatedComments,
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visuel du dépôt de fichiers externes : non bloquant (pointer-events-none)
          pour laisser la zone recevoir le drop. */}
      {isFileDragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-6">
          <div className="border-2 border-dashed border-emerald-400 bg-emerald-600/25 backdrop-blur-xs rounded-2xl px-10 py-8 text-center shadow-2xl">
            <Upload className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Déposez vos fichiers ici</p>
            <p className="text-xs text-emerald-100 mt-1.5">
              Photo → Frame / Visuel Modèle · PDF → Dossier rattaché
            </p>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal attachment={viewingAttachment} onClose={() => setViewingAttachment(null)} />
    </>
  );
};
