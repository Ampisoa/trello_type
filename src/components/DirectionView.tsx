import React, { useState, useMemo } from 'react';
import { Card, StepDefinition, UserProfile } from '../types';
import { getCardMerchandisers } from '../utils/merchandiser';
import { formattedToPlainText } from './FormattedText';
import {
  AlertTriangle,
  Flame,
  Activity,
  CheckCircle2,
  Coins,
  Package,
  Calendar,
  Building2,
  ArrowUpDown,
  Layers,
  ShieldAlert,
  CheckSquare,
} from 'lucide-react';

interface DirectionViewProps {
  cards: Card[];
  steps: StepDefinition[];
  allUsers?: UserProfile[];
  onCardClick: (card: Card) => void;
}

export type DirectionCategory = 'urgence' | 'alerte' | 'en_cours';

export interface EvaluatedCard {
  card: Card;
  category: DirectionCategory;
  reason: string;
  subReason?: string;
  daysRemaining: number;
  isOverdue: boolean;
  progressPercent: number;
  totalChecklistCount: number;
  completedChecklistCount: number;
  totalValue: number;
  totalQuantity: number;
  currentStep?: StepDefinition;
}

/**
 * Calculates remaining days between today and delivery date.
 */
function getDaysRemaining(dateString: string): number {
  if (!dateString) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const delivery = new Date(dateString);
  if (isNaN(delivery.getTime())) return 999;
  delivery.setHours(0, 0, 0, 0);
  const diffTime = delivery.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates a single card based on metadata and assigns it to 'urgence', 'alerte', or 'en_cours'.
 */
function evaluateCardForDirection(card: Card, steps: StepDefinition[]): EvaluatedCard {
  const daysRemaining = getDaysRemaining(card.dateLivraison);
  const isOverdue = daysRemaining < 0 && card.status !== 'termine';
  const currentStep = steps.find((s) => s.id === card.currentStepId);

  // Checklists stats
  const items = card.stepChecklists?.[card.currentStepId] || currentStep?.defaultChecklists || [];
  const totalChecklistCount = items.length;
  const completedChecklistCount = items.filter((i) => i.completed).length;
  const progressPercent =
    totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

  // Financial values
  const unitPrice = card.descriptionSpec?.prix || 0;
  const totalQuantity = card.descriptionSpec?.quantites || 0;
  const totalValue = unitPrice * totalQuantity;

  let category: DirectionCategory = 'en_cours';
  let reason = 'Production nominale et délais maîtrisés';
  let subReason: string | undefined = undefined;

  // 1. EVALUATION FOR 'URGENCE' (uniquement délais, checklists et statut du modèle)
  if (card.status !== 'termine') {
    if (isOverdue) {
      category = 'urgence';
      const days = Math.abs(daysRemaining);
      reason = `Délai dépassé de ${days} jour${days > 1 ? 's' : ''}`;
      const formattedDelivery =
        card.dateLivraison && !isNaN(new Date(card.dateLivraison).getTime())
          ? new Date(card.dateLivraison).toLocaleDateString('fr-FR')
          : 'Non définie';
      subReason = `Livraison prévue le ${formattedDelivery}`;
    } else if (daysRemaining <= 3 && progressPercent < 80) {
      category = 'urgence';
      reason = `Échéance imminente (J-${daysRemaining}) & avancement incomplet`;
      subReason = `Progression checklist : ${progressPercent}% (${completedChecklistCount}/${totalChecklistCount})`;
    } else if (card.status === 'en_attente' && daysRemaining <= 5) {
      category = 'urgence';
      reason = `Dossier en attente à J-${daysRemaining} de la livraison`;
      subReason = "Nécessite déblocage immédiat de la Direction";
    }
  }

  // 2. EVALUATION FOR 'EN ALERTE' (if not already 'urgence')
  if (category === 'en_cours' && card.status !== 'termine') {
    if (daysRemaining <= 7 && progressPercent < 60) {
      category = 'alerte';
      reason = `Échéance proche (J-${daysRemaining}) avec progression faible`;
      subReason = `Seulement ${progressPercent}% des points validés (${completedChecklistCount}/${totalChecklistCount})`;
    } else if (card.status === 'validation') {
      category = 'alerte';
      reason = "En attente de validation client / technique";
      subReason = `Livraison dans ${daysRemaining} jours`;
    } else if (card.status === 'en_attente') {
      category = 'alerte';
      reason = "Statut en attente";
      subReason = "Vérification requise pour relancer le flux";
    } else if (
      progressPercent === 0 &&
      currentStep &&
      currentStep.order > 1 &&
      daysRemaining <= 14
    ) {
      category = 'alerte';
      reason = `Étape ${currentStep.name} non entamée (0%)`;
      subReason = `Livraison dans ${daysRemaining} jours`;
    }
  }

  // 3. EN COURS (Default fallback with contextual reason)
  if (category === 'en_cours') {
    if (card.status === 'termine') {
      reason = 'Commande terminée et livrée';
      subReason = 'Tous les jalons sont validés';
    } else {
      reason = 'Flux régulier en production';
      subReason = `J-${daysRemaining} • ${progressPercent}% complété`;
    }
  }

  return {
    card,
    category,
    reason,
    subReason,
    daysRemaining,
    isOverdue,
    progressPercent,
    totalChecklistCount,
    completedChecklistCount,
    totalValue,
    totalQuantity,
    currentStep,
  };
}

export const DirectionView: React.FC<DirectionViewProps> = ({
  cards,
  steps,
  allUsers = [],
  onCardClick,
}) => {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedStepId, setSelectedStepId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'date' | 'value' | 'quantity'>('severity');

  // Evaluate all cards according to metadata
  const evaluatedCards = useMemo(() => {
    return cards.map((card) => evaluateCardForDirection(card, steps));
  }, [cards, steps]);

  // Clients list for filter dropdown
  const availableClients = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.clientName) set.add(c.clientName.trim());
    });
    return Array.from(set).sort();
  }, [cards]);

  // Apply filters
  const filteredEvaluated = useMemo(() => {
    return evaluatedCards.filter((item) => {
      if (
        selectedClient !== 'all' &&
        item.card.clientName.toLowerCase().trim() !== selectedClient.toLowerCase().trim()
      ) {
        return false;
      }
      if (selectedStepId !== 'all' && item.card.currentStepId !== selectedStepId) {
        return false;
      }
      return true;
    });
  }, [evaluatedCards, selectedClient, selectedStepId]);

  // Sort helper
  const sortCards = (items: EvaluatedCard[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'severity') {
        // Overdue first, then lower days remaining, then higher value
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
        return b.totalValue - a.totalValue;
      }
      if (sortBy === 'date') {
        return a.daysRemaining - b.daysRemaining;
      }
      if (sortBy === 'value') {
        return b.totalValue - a.totalValue;
      }
      if (sortBy === 'quantity') {
        return b.totalQuantity - a.totalQuantity;
      }
      return 0;
    });
  };

  // Segment into the 3 columns
  const urgenceCards = useMemo(
    () => sortCards(filteredEvaluated.filter((i) => i.category === 'urgence')),
    [filteredEvaluated, sortBy]
  );

  const alerteCards = useMemo(
    () => sortCards(filteredEvaluated.filter((i) => i.category === 'alerte')),
    [filteredEvaluated, sortBy]
  );

  const enCoursCards = useMemo(
    () => sortCards(filteredEvaluated.filter((i) => i.category === 'en_cours')),
    [filteredEvaluated, sortBy]
  );

  // Global KPIs for Direction
  const totalValuation = useMemo(
    () => filteredEvaluated.reduce((acc, curr) => acc + curr.totalValue, 0),
    [filteredEvaluated]
  );

  const totalPieces = useMemo(
    () => filteredEvaluated.reduce((acc, curr) => acc + curr.totalQuantity, 0),
    [filteredEvaluated]
  );

  const totalUrgentValuation = useMemo(
    () => urgenceCards.reduce((acc, curr) => acc + curr.totalValue, 0),
    [urgenceCards]
  );

  const totalAlerteValuation = useMemo(
    () => alerteCards.reduce((acc, curr) => acc + curr.totalValue, 0),
    [alerteCards]
  );

  const totalEnCoursValuation = useMemo(
    () => enCoursCards.reduce((acc, curr) => acc + curr.totalValue, 0),
    [enCoursCards]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pb-12">
      {/* Executive Direction Header & KPI Dashboard */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-black text-[11px] rounded-full border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Tableau de Bord Direction
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Segmentation automatique en temps réel
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Pilotage des Risques & Suivi de Fabrication
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Analyse automatisée des délais, taux de complétion, alertes opérationnelles et valorisation globale.
            </p>
          </div>

          {/* Quick summary pill counters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                Urgence
              </span>
              <span className="text-lg font-black text-rose-200">{urgenceCards.length}</span>
            </div>
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                En Alerte
              </span>
              <span className="text-lg font-black text-amber-200">{alerteCards.length}</span>
            </div>
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                En Cours
              </span>
              <span className="text-lg font-black text-emerald-200">{enCoursCards.length}</span>
            </div>
          </div>
        </div>

        {/* Financial & Volume Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-slate-300">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Valeur Totale Gérée</span>
            </div>
            <p className="text-base sm:text-lg font-black text-white">
              {totalValuation.toLocaleString('fr-FR')} €
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              <span>Volume Global Pièces</span>
            </div>
            <p className="text-base sm:text-lg font-black text-white">
              {totalPieces.toLocaleString('fr-FR')} unités
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Enjeu Critique (Urgence)</span>
            </div>
            <p className="text-base sm:text-lg font-black text-rose-300">
              {totalUrgentValuation.toLocaleString('fr-FR')} €
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Modèles Suivis</span>
            </div>
            <p className="text-base sm:text-lg font-black text-white">
              {filteredEvaluated.length} modèle{filteredEvaluated.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Sorting Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Client Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-normal">Client :</span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les clients ({availableClients.length})</option>
              {availableClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>

          {/* Pipeline Step Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-normal">Étape :</span>
            <select
              value={selectedStepId}
              onChange={(e) => setSelectedStepId(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Toutes les étapes ({steps.length})</option>
              {steps.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} - {st.description || ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {(selectedClient !== 'all' || selectedStepId !== 'all') && (
            <button
              onClick={() => {
                setSelectedClient('all');
                setSelectedStepId('all');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 transition-colors"
            >
              Réinitialiser filtres
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-normal">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="severity">Niveau d'urgence & Retards</option>
              <option value="date">Date de livraison la plus proche</option>
              <option value="value">Valorisation financière (€)</option>
              <option value="quantity">Quantité de pièces</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3 Auto-Segmented Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* COLUMN 1: URGENCE */}
        <div className="bg-rose-50/70 border-2 border-rose-200/90 rounded-2xl flex flex-col overflow-hidden shadow-xs">
          {/* Column Header */}
          <div className="bg-rose-600 text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight uppercase">Urgence</h3>
                <p className="text-[11px] text-rose-100 font-medium">
                  Retards, checklists en retard & échéances J-3
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-white text-rose-700 font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                {urgenceCards.length}
              </span>
              <span className="block text-[10px] text-rose-200 font-semibold mt-0.5">
                {totalUrgentValuation.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto scrollbar-thin">
            {urgenceCards.length === 0 ? (
              <div className="p-8 text-center bg-white/80 rounded-xl border border-rose-200/60">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">Aucune urgence critique</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toutes les commandes prioritaires sont sous contrôle.
                </p>
              </div>
            ) : (
              urgenceCards.map((item) => (
                <DirectionCardItem
                  key={item.card.id}
                  item={item}
                  allUsers={allUsers}
                  onCardClick={onCardClick}
                  badgeColorClass="bg-rose-100 text-rose-800 border-rose-300"
                  accentBorderClass="border-l-4 border-l-rose-500"
                />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: EN ALERTE */}
        <div className="bg-amber-50/70 border-2 border-amber-200/90 rounded-2xl flex flex-col overflow-hidden shadow-xs">
          {/* Column Header */}
          <div className="bg-amber-600 text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight uppercase">En Alerte</h3>
                <p className="text-[11px] text-amber-100 font-medium">
                  Échéances J-7, validations & points bloquants
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-white text-amber-800 font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                {alerteCards.length}
              </span>
              <span className="block text-[10px] text-amber-200 font-semibold mt-0.5">
                {totalAlerteValuation.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto scrollbar-thin">
            {alerteCards.length === 0 ? (
              <div className="p-8 text-center bg-white/80 rounded-xl border border-amber-200/60">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">Aucune alerte active</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Les dossiers suivent un calendrier normal.
                </p>
              </div>
            ) : (
              alerteCards.map((item) => (
                <DirectionCardItem
                  key={item.card.id}
                  item={item}
                  allUsers={allUsers}
                  onCardClick={onCardClick}
                  badgeColorClass="bg-amber-100 text-amber-800 border-amber-300"
                  accentBorderClass="border-l-4 border-l-amber-500"
                />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: EN COURS */}
        <div className="bg-slate-50/80 border-2 border-slate-200/90 rounded-2xl flex flex-col overflow-hidden shadow-xs">
          {/* Column Header */}
          <div className="bg-slate-800 text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight uppercase">En Cours</h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  Fabrication fluide, délais respectés & terminés
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-white text-slate-900 font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                {enCoursCards.length}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                {totalEnCoursValuation.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto scrollbar-thin">
            {enCoursCards.length === 0 ? (
              <div className="p-8 text-center bg-white/80 rounded-xl border border-slate-200/60">
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">Aucune commande en cours</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toutes les cartes sont traitées ou filtrées.
                </p>
              </div>
            ) : (
              enCoursCards.map((item) => (
                <DirectionCardItem
                  key={item.card.id}
                  item={item}
                  allUsers={allUsers}
                  onCardClick={onCardClick}
                  badgeColorClass="bg-slate-100 text-slate-800 border-slate-300"
                  accentBorderClass="border-l-4 border-l-emerald-500"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DirectionCardItemProps {
  item: EvaluatedCard;
  allUsers: UserProfile[];
  onCardClick: (card: Card) => void;
  badgeColorClass: string;
  accentBorderClass: string;
}

const DirectionCardItem: React.FC<DirectionCardItemProps> = ({
  item,
  allUsers,
  onCardClick,
  badgeColorClass,
  accentBorderClass,
}) => {
  const { card, reason, subReason, daysRemaining, isOverdue, progressPercent, totalValue, totalQuantity, currentStep } =
    item;

  const merchandisers = getCardMerchandisers(card, allUsers);
  const photoUrl =
    card.frame?.fileUrl ||
    card.attachments?.find((att) => att.mimeType.startsWith('image/'))?.fileUrl;

  return (
    <div
      data-link-entity="card"
      data-link-id={card.id}
      data-link-label={`Carte — ${card.reference}`}
      onClick={() => onCardClick(card)}
      className={`bg-white rounded-xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-md p-3.5 transition-all cursor-pointer group ${accentBorderClass}`}
    >
      {/* Reason Pill Header (Metadata explanation) */}
      <div className="mb-2.5 pb-2 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {item.category === 'urgence' ? (
              <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ) : item.category === 'alerte' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span
              className={`text-[11px] font-bold truncate ${
                item.category === 'urgence'
                  ? 'text-rose-700'
                  : item.category === 'alerte'
                  ? 'text-amber-700'
                  : 'text-slate-700'
              }`}
              title={reason}
            >
              {reason}
            </span>
          </div>
          {subReason && (
            <p className="text-[10px] text-slate-400 truncate pl-5 mt-0.5">{subReason}</p>
          )}
        </div>

        {/* Step Badge */}
        {currentStep && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 shrink-0"
            title={`Étape actuelle : ${currentStep.name}`}
          >
            {currentStep.name}
          </span>
        )}
      </div>

      {/* Main Card Content */}
      <div className="flex items-start gap-3">
        {/* Photo thumbnail if exists */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={card.modele}
            className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-white shrink-0 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
            <Package className="w-5 h-5 text-slate-400" />
          </div>
        )}

        {/* Info text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
              {card.reference}
            </span>
            {card.cardType !== 'simple' && (
              <span className="text-[10px] font-bold text-slate-500 truncate" title={card.clientName}>
                {card.clientName}
              </span>
            )}
          </div>

          <h4 className="text-xs font-black text-slate-900 truncate mt-1 group-hover:text-indigo-600 transition-colors">
            {card.modele}
          </h4>

          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {formattedToPlainText(card.descriptionSpec?.matiere || 'Matière standard')}
          </p>
        </div>
      </div>

      {/* Financial & Quantities Summary */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] bg-slate-50/70 p-2 rounded-lg">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Volume</span>
          <span className="font-black text-slate-800">{totalQuantity} pcs</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Valeur commande</span>
          <span className="font-black text-indigo-700">{totalValue.toLocaleString('fr-FR')} €</span>
        </div>
      </div>

      {/* Progress & Checklist Bar */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-slate-400" />
            Checklists étape
          </span>
          <span className="text-slate-800 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progressPercent >= 100
                ? 'bg-emerald-500'
                : item.category === 'urgence'
                ? 'bg-rose-500'
                : item.category === 'alerte'
                ? 'bg-amber-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer info: Merchandiser avatar & Delivery Date countdown */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        {/* Merchandiser (hidden for simple cards) */}
        {card.cardType !== 'simple' && (
          <div className="flex items-center gap-1.5 min-w-0" title={`Commercial(e) : ${merchandisers.map((m) => m.name).join(', ')}`}>
            {merchandisers[0]?.avatar ? (
              <img
                src={merchandisers[0].avatar}
                alt={merchandisers[0].name}
                className="w-4 h-4 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[8px] flex items-center justify-center">
                {merchandisers[0]?.name?.charAt(0) || 'M'}
              </div>
            )}
            <span className="truncate max-w-[90px] font-semibold text-slate-700">
              {merchandisers[0]?.name || 'Non assigné'}
            </span>
          </div>
        )}

        {/* Delivery Countdown Badge */}
        <div
          className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 shrink-0 ${
            isOverdue
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : daysRemaining <= 3
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Calendar className="w-3 h-3" />
          <span>
            {isOverdue
              ? `Retard ${Math.abs(daysRemaining)}j`
              : daysRemaining === 0
              ? `Aujourd'hui`
              : `J-${daysRemaining}`}
          </span>
        </div>
      </div>
    </div>
  );
};
