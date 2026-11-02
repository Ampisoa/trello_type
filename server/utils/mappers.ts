import { Card, StepDefinition, UserProfile, MerchPole, CustomBoard } from '../../src/types';

function parseColumn(value: any, fallback: any): any {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

// Normalize a date value coming from PostgreSQL (DATE/TIMESTAMPTZ → ISO string)
// or from a legacy VARCHAR column (kept as-is) so the frontend always receives
// the same string shape it expects.
function normalizeDate(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value.toISOString();
  if (typeof value === 'string') return value || undefined;
  return undefined;
}

export function rowToCard(row: any): Card {
  return {
    id: row.id,
    reference: row.reference,
    modele: row.modele,
    clientName: row.client_name,
    currentStepId: row.current_step_id,
    status: row.status,
    dateCreation: normalizeDate(row.date_creation) || '',
    dateLivraison: normalizeDate(row.date_livraison) || '',
    dueDate: normalizeDate(row.due_date),
    dueDateNotes: row.due_date_notes || undefined,
    merchandiserName: row.merchandiser_name || undefined,
    merchandiserId: row.merchandiser_id || undefined,
    merchandiserAvatar: row.merchandiser_avatar || undefined,
    descriptionSpec: {
      modele: row.modele,
      matiere: row.matiere || '',
      prix: parseFloat(row.prix) || 0,
      quantites: parseInt(row.quantites, 10) || 0,
      vagues: parseColumn(row.vagues, []) || [],
      historiqueNote: row.historique_note || '',
    },
    dossierTechnique: parseColumn(row.dossier_technique, null) || null,
    frame: parseColumn(row.frame, null) || null,
    attachments: parseColumn(row.attachments, []) || [],
    members: parseColumn(row.members, []) || [],
    merchandisers: parseColumn(row.merchandisers, []) || [],
    stepChecklists: parseColumn(row.step_checklists, {}) || {},
    labels: parseColumn(row.labels, []) || [],
    historyLogs: parseColumn(row.history_logs, []) || [],
    invitedVisitors: parseColumn(row.invited_visitors, []) || [],
    comments: parseColumn(row.comments, []) || [],
    sortOrder: row.sort_order === null || row.sort_order === undefined ? undefined : parseInt(row.sort_order, 10),
    archived: !!row.archived,
  };
}

export function rowToStep(row: any): StepDefinition {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    order: row.order_index,
    color: row.color,
    description: row.description,
    defaultChecklists: parseColumn(row.default_checklists, []) || [],
  };
}

export function rowToUser(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    posteLabel: row.poste_label,
    avatar: row.avatar,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    brandColor: row.brand_color,
    invitedBy: row.invited_by,
    invitedCardIds: parseColumn(row.invited_card_ids, []) || [],
  };
}

export function rowToPole(row: any): MerchPole {
  return {
    id: row.id,
    name: row.name || '',
    leaderIds: parseColumn(row.leader_ids, []) || [],
    leaderNames: parseColumn(row.leader_names, []) || [],
    description: row.description || '',
    color: row.color || 'indigo',
    phone: row.phone || '',
    email: row.email || '',
    boardIds: parseColumn(row.board_ids, []) || [],
    invitedVisitors: parseColumn(row.invited_visitors, []) || [],
    notes: row.notes || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function rowToBoard(row: any): CustomBoard {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    color: row.color || 'indigo',
    backgroundImage: row.background_image || undefined,
    cardIds: parseColumn(row.card_ids, []) || [],
    steps: parseColumn(row.steps, []) || [],
    poleId: row.pole_id || undefined,
    invitedVisitors: parseColumn(row.invited_visitors, []) || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}