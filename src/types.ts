export type UserRole =
  | 'commercial'
  | 'admin'
  | 'directeur'
  | 'directeur général'
  | 'fournisseur'
  | 'magasinier'
  | 'resp_planning'
  | 'visiteur'
  | string;

export interface VisitorSession {
  email: string;
  name?: string;
  token?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  posteLabel?: string;
  password?: string;
  avatar?: string;
  initials?: string;
  phone?: string;
  address?: string;
  notes?: string;
  brandColor?: string;
  invitedBy?: string;
  invitedCardIds?: string[];
  invitedBoardIds?: string[];
  invitedPoleIds?: string[];
  // Responsable Point Client Temporaire designation
  tempResponsablePointClient?: {
    designatedBy: string; // userId of the main responsable point client
    designatedAt: string; // ISO timestamp
    expiresAt: string; // ISO timestamp
    isActive: boolean;
  };
}

export interface InvitedVisitor {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  invitedAt: string;
  invitedBy: string; // Nom ou rôle du Merchandiser qui a invité
  invitedById?: string;
  notes?: string;
  token?: string; // Jeton JWT d'accès sécurisé et signé
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: string;
  completedAt?: string;
  completedBy?: string;
  subItems?: ChecklistItem[];
}

export interface StepDefinition {
  id: string;
  name: string;
  code: string;
  order: number;
  color: string;
  description?: string;
  defaultChecklists: ChecklistItem[];
}

export interface CardMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  addedAt: string;
}

export type AttachmentCategory = 'dossier_technique' | 'frame' | 'attachement';

export interface CardAttachment {
  id: string;
  name: string;
  fileUrl: string; // Data URL or preview URL
  mimeType: string; // 'application/pdf', 'image/jpeg', etc.
  size?: string;
  category: AttachmentCategory;
  uploadedAt: string;
  uploadedBy: string;
}

export interface HistoryLog {
  id: string;
  cardId: string;
  authorName: string;
  authorRole: UserRole;
  action: string;
  details?: string;
  timestamp: string; // Formatted ISO string or timestamp string
}

export interface Vague {
  id: string;
  nom: string;
  quantite: number;
}

export interface DescriptionSpec {
  modele: string;
  matiere: string;
  prix: number;
  quantites: number;
  vagues?: Vague[];
  historiqueNote?: string;
}

export interface CardComment {
  id: string;
  cardId: string;
  authorId?: string;
  authorName: string;
  authorRole: UserRole;
  authorPoste?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  isEdited?: boolean;
}

export interface CardLabel {
  id: string;
  name: string;
  color: string;
  bgClass: string;
  badgeClass: string;
}

export type CardType = 'modele' | 'simple';
export type SimpleVisualType = 'emoji' | 'gif' | 'photo' | 'message';

export interface SimpleVisual {
  type: SimpleVisualType;
  content: string; // Emoji character(s), GIF/Photo URL or base64, or short text message
  bgColor?: string; // Optional background color identifier or class
}

export interface CardMerchandiser {
  id?: string;
  name: string;
  avatar?: string;
  email?: string;
  posteLabel?: string;
}

export interface Card {
  id: string;
  reference: string;
  modele: string;
  clientName: string;
  currentStepId: string;
  status: 'en_attente' | 'en_cours' | 'validation' | 'termine';
  dossierTechnique: CardAttachment | null;
  frame: CardAttachment | null;
  attachments: CardAttachment[];
  dateCreation: string;
  dateLivraison: string;
  members: CardMember[];
  descriptionSpec: DescriptionSpec;
  // Step-specific checklists for this specific card
  stepChecklists: Record<string, ChecklistItem[]>; // stepId -> list of items
  historyLogs: HistoryLog[];
  comments?: CardComment[];
  labels?: CardLabel[];
  merchandisers?: CardMerchandiser[];
  merchandiserName?: string;
  merchandiserId?: string;
  merchandiserAvatar?: string;
  invitedVisitors?: InvitedVisitor[];
  dueDate?: string; // Date prochaine où une merch / commerciale doit faire une mise à jour
  dueDateNotes?: string; // Note ou rappel associé à la Due Date
  cardType?: CardType; // 'modele' (défaut) ou 'simple'
  simpleVisual?: SimpleVisual;
  sortOrder?: number; // Position manuelle de la carte dans sa step (tri par référence par défaut)
  archived?: boolean; // Carte archivée : retirée des colonnes, visible dans l'archive du board
}

export interface MerchPole {
  id: string;
  name?: string; // e.g. "Pôle de Sophie et Lucas" ou nom personnalisé
  code?: string; // e.g. "POL-SL"
  leaderIds: string[]; // Liste des IDs des maîtres / responsables du pôle
  leaderNames: string[]; // Noms complets des maîtres (ex: ['Sophie Bertrand', 'Lucas Moreau'])
  specialty?: string; // Spécialité du pôle (ex: Haute Couture & Soieries, Prêt-à-Porter & Tailleur)
  description?: string; // Présentation ou missions du pôle
  color?: string; // Thème couleur (indigo, emerald, rose, amber, sky, purple)
  phone?: string;
  email?: string;
  teams?: string; // Adresse / Lien ou ID sur Microsoft Teams
  notes?: string;
  boardIds?: string[]; // IDs des boards de regroupement attribués à ce pôle
  invitedVisitors?: InvitedVisitor[]; // Observateurs / Visiteurs invités au niveau du pôle
  createdAt?: string;
}

export interface CustomBoard {
  id: string;
  title: string;
  description?: string;
  color?: string; // fallback color or theme
  backgroundImage?: string; // URL or data URL of custom background image
  cardIds: string[]; // IDs des cartes/modèles regroupés manuellement
  steps?: StepDefinition[]; // Étapes personnalisées du board (instantané du modèle global à la création)
  poleId?: string; // ID du pôle auquel ce board est rattaché
  invitedVisitors?: InvitedVisitor[]; // Observateurs / Visiteurs invités au niveau du board
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}
