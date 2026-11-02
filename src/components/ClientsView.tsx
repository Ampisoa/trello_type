import React, { useState, useMemo } from 'react';
import { Card, StepDefinition, UserProfile } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import { getClientDefaultInitials, CLIENT_COLOR_PALETTES } from '../utils/clientInitials';
import { ClientIdentityModal } from './ClientIdentityModal';
import {
  Building2,
  Mail,
  FolderKanban,
  Calendar,
  Eye,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Sparkles,
  Layers,
  Edit3,
  ExternalLink,
  CheckCircle2,
  Clock,
  IdCard,
} from 'lucide-react';

interface ClientsViewProps {
  cards: Card[];
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onCardClick: (card: Card) => void;
  onRenameClientInCards?: (oldName: string, newName: string) => void;
}

export interface ClientSummary {
  id: string;
  name: string;
  cleanName: string;
  email?: string;
  avatar?: string;
  posteLabel?: string;
  initials?: string;
  phone?: string;
  address?: string;
  notes?: string;
  brandColor?: string;
  userAccount?: UserProfile;
  cards: Card[];
  totalCards: number;
  activeCardsCount: number;
  completedCardsCount: number;
  nearestDeliveryDate?: string;
}

export interface ClientCustomData {
  name?: string;
  email?: string;
  initials?: string;
  brandColor?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

const STORAGE_CLIENT_META_KEY = 'suivi_flux_client_metadata_v1';

export const ClientsView: React.FC<ClientsViewProps> = ({
  cards,
  steps,
  allUsers,
  currentUser,
  onCardClick,
  onRenameClientInCards,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClientForIdentity, setSelectedClientForIdentity] = useState<ClientSummary | null>(null);

  // Local persistent metadata for initials and colors
  const [clientCustomMeta, setClientCustomMeta] = useState<Record<string, ClientCustomData>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CLIENT_META_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveCustomMeta = (key: string, data: Partial<ClientCustomData>) => {
    setClientCustomMeta((prev) => {
      const updated = { ...prev, [key]: { ...prev[key], ...data } };
      try {
        localStorage.setItem(STORAGE_CLIENT_META_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save client metadata', e);
      }
      return updated;
    });
  };

  // New client form states
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientInitials, setNewClientInitials] = useState('');
  const [newClientPoste, setNewClientPoste] = useState('Client / Marque Partenaire');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  const canManage = canUserCreateOrEditCards(currentUser);

  // Compute aggregate client list
  const clientsList = useMemo(() => {
    const clientsMap = new Map<string, ClientSummary>();

    // 1. Add known client brands from metadata directory
    (Object.entries(clientCustomMeta) as [string, ClientCustomData][]).forEach(([key, custom]) => {
      const cleanName = (custom.name || key).replace(/\(client\)/gi, '').trim().toLowerCase();
      if (!cleanName) return;

      clientsMap.set(cleanName, {
        id: `client-${cleanName.replace(/\s+/g, '-')}`,
        name: custom.name || key,
        cleanName,
        email: custom.email,
        posteLabel: 'Client / Marque Partenaire',
        initials: custom.initials || getClientDefaultInitials(custom.name || key),
        brandColor: custom.brandColor || 'indigo',
        phone: custom.phone,
        address: custom.address,
        notes: custom.notes,
        cards: [],
        totalCards: 0,
        activeCardsCount: 0,
        completedCardsCount: 0,
      });
    });

    // 2. Aggregate cards into client records
    cards.forEach((card) => {
      const cardClientRaw = card.clientName || 'Client Inconnu';
      const cleanCardClient = cardClientRaw.replace(/\(client\)/gi, '').trim().toLowerCase();

      let existingClientKey: string | undefined;
      for (const [key, client] of clientsMap.entries()) {
        if (
          key === cleanCardClient ||
          client.name.toLowerCase() === cardClientRaw.toLowerCase() ||
          (cleanCardClient.length > 2 && key.includes(cleanCardClient)) ||
          (key.length > 2 && cleanCardClient.includes(key))
        ) {
          existingClientKey = key;
          break;
        }
      }

      if (!existingClientKey) {
        existingClientKey = cleanCardClient;
        const custom = clientCustomMeta[existingClientKey] || {};
        clientsMap.set(existingClientKey, {
          id: `client-${cleanCardClient.replace(/\s+/g, '-')}`,
          name: custom.name || cardClientRaw,
          cleanName: cleanCardClient,
          posteLabel: 'Client / Marque Référente',
          initials: custom.initials || getClientDefaultInitials(cardClientRaw),
          brandColor: custom.brandColor || 'indigo',
          phone: custom.phone,
          address: custom.address,
          notes: custom.notes,
          cards: [],
          totalCards: 0,
          activeCardsCount: 0,
          completedCardsCount: 0,
        });
      }

      const client = clientsMap.get(existingClientKey)!;
      client.cards.push(card);
      client.totalCards += 1;

      if (card.status === 'termine') {
        client.completedCardsCount += 1;
      } else {
        client.activeCardsCount += 1;
      }

      if (card.dateLivraison && !isNaN(new Date(card.dateLivraison).getTime())) {
        if (!client.nearestDeliveryDate) {
          client.nearestDeliveryDate = card.dateLivraison;
        } else if (new Date(card.dateLivraison) < new Date(client.nearestDeliveryDate)) {
          client.nearestDeliveryDate = card.dateLivraison;
        }
      }
    });

    return Array.from(clientsMap.values()).sort((a, b) => b.totalCards - a.totalCards || a.name.localeCompare(b.name));
  }, [allUsers, cards, clientCustomMeta]);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientsList;
    const q = searchQuery.toLowerCase().trim();
    return clientsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.initials && c.initials.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.posteLabel && c.posteLabel.toLowerCase().includes(q)) ||
        c.cards.some(
          (card) =>
            card.reference.toLowerCase().includes(q) ||
            card.modele.toLowerCase().includes(q)
        )
    );
  }, [clientsList, searchQuery]);

  // Global aggregate stats (without pieces and without portfolio value)
  const totalClientsCount = clientsList.length;
  const totalProductionCards = cards.length;
  const totalActiveCards = cards.filter((c) => c.status !== 'termine').length;
  const totalCompletedCards = cards.filter((c) => c.status === 'termine').length;

  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const calcInitials = (newClientInitials.trim() || getClientDefaultInitials(newClientName)).toUpperCase();
    const cleanKey = newClientName.toLowerCase().trim();

    saveCustomMeta(cleanKey, {
      name: newClientName.trim(),
      email: newClientEmail.trim().toLowerCase() || undefined,
      initials: calcInitials,
      phone: newClientPhone.trim() || undefined,
      address: newClientAddress.trim() || undefined,
      brandColor: 'indigo',
    });

    setNewClientName('');
    setNewClientEmail('');
    setNewClientInitials('');
    setNewClientPhone('');
    setNewClientAddress('');
    setIsAddClientModalOpen(false);
  };

  const handleUpdateClientData = (updatedData: {
    id: string;
    name: string;
    email?: string;
    initials: string;
    posteLabel?: string;
    phone?: string;
    address?: string;
    notes?: string;
    brandColor?: string;
  }) => {
    const matchedClient = clientsList.find((c) => c.id === updatedData.id);
    const clientKey = matchedClient ? matchedClient.cleanName : updatedData.name.toLowerCase().trim();

    // Save custom metadata locally
    saveCustomMeta(clientKey, {
      name: updatedData.name,
      email: updatedData.email,
      initials: updatedData.initials,
      brandColor: updatedData.brandColor,
      phone: updatedData.phone,
      address: updatedData.address,
      notes: updatedData.notes,
    });

    // Rename in cards if name changed and callback provided
    if (matchedClient && matchedClient.name !== updatedData.name && onRenameClientInCards) {
      onRenameClientInCards(matchedClient.name, updatedData.name);
    }

    // If modal is currently open, refresh its data
    if (selectedClientForIdentity && selectedClientForIdentity.id === updatedData.id) {
      setSelectedClientForIdentity((prev) =>
        prev
          ? {
              ...prev,
              name: updatedData.name,
              initials: updatedData.initials,
              email: updatedData.email,
              posteLabel: updatedData.posteLabel,
              phone: updatedData.phone,
              address: updatedData.address,
              notes: updatedData.notes,
              brandColor: updatedData.brandColor,
            }
          : null
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Annuaire & Portefeuille Clients
                </h2>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {totalClientsCount} client{totalClientsCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Fiches identitaires des marques clientes, initiales personnalisées et suivi des modèles
              </p>
            </div>
          </div>

          {/* Action button: Add client */}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddClientModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all self-stretch sm:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Client / Marque</span>
            </button>
          )}
        </div>

        {/* Metric cards grid (Pièces en production et Valeur portefeuille retirées) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Total Marques & Clients</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900">{totalClientsCount}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                Actifs
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Modèles en Suivi</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-indigo-600">{totalProductionCards}</span>
              <span className="text-[10px] font-medium text-slate-500">fiches</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Modèles en Fabrication</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-600">{totalActiveCards}</span>
              <span className="text-[10px] font-medium text-slate-500">en cours</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Modèles Livrés</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-emerald-600">{totalCompletedCards}</span>
              <span className="text-[10px] font-medium text-slate-500">terminés</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par nom de marque, initiales, email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-medium shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-auto flex items-center gap-2">
          <span>Affichage de <strong className="text-slate-800">{filteredClients.length}</strong> client{filteredClients.length > 1 ? 's' : ''}</span>
          <span className="text-slate-300">•</span>
          <span className="text-indigo-600 font-semibold flex items-center gap-1">
            <IdCard className="w-3.5 h-3.5" /> Cliquez sur l'icône carré pour ouvrir la fiche identitaire
          </span>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Aucun client trouvé</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? `Aucun résultat pour "${searchQuery}". Essayez un autre terme.` : "Aucun client n'est encore enregistré dans l'application."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const palette =
              CLIENT_COLOR_PALETTES.find((p) => p.id === client.brandColor) || CLIENT_COLOR_PALETTES[0];
            const clientInitials =
              client.initials || getClientDefaultInitials(client.name);

            return (
              <div
                key={client.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isExpanded ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Section */}
                <div className="p-5 space-y-4">
                  {/* Client Square Icon with 10% border radius & Identity */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* SQUARE ICON WITH 10% BORDER RADIUS */}
                      <button
                        type="button"
                        onClick={() => setSelectedClientForIdentity(client)}
                        style={{ borderRadius: '10%' }}
                        className={`w-14 h-14 ${palette.bg} text-white font-black text-lg flex flex-col items-center justify-center shadow-md border-2 border-white ring-2 ring-slate-100 hover:ring-indigo-400 hover:scale-105 transition-all shrink-0 cursor-pointer group relative`}
                        title="Cliquer pour afficher la Fiche Identitaire du Client"
                      >
                        <span className="tracking-tight">{clientInitials.substring(0, 4)}</span>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-[10%] flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedClientForIdentity(client)}
                            className="text-left group/title"
                          >
                            <h3 className="text-sm font-black text-slate-900 truncate leading-tight group-hover/title:text-indigo-600 transition-colors">
                              {client.name}
                            </h3>
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                          {client.posteLabel}
                        </p>

                        {client.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedClientForIdentity(client)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Ouvrir la Fiche Identitaire"
                    >
                      <IdCard className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Clean Metrics Badges (Cartes, En cours, Terminées) */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block">Total Cartes</span>
                      <span className="text-xs font-black text-indigo-600">{client.totalCards}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block">En cours</span>
                      <span className="text-xs font-black text-amber-600">{client.activeCardsCount}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block">Terminées</span>
                      <span className="text-xs font-black text-emerald-600">{client.completedCardsCount}</span>
                    </div>
                  </div>

                  {/* Nearest delivery info */}
                  {client.nearestDeliveryDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg border border-indigo-100/80">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        Prochaine livraison :{' '}
                        <strong className="text-indigo-950 font-bold">
                          {new Date(client.nearestDeliveryDate).toLocaleDateString('fr-FR')}
                        </strong>
                      </span>
                    </div>
                  )}

                  {/* Associated Cards Accordion */}
                  {client.cards.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                        className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
                          Modèles associés ({client.cards.length})
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-180 text-indigo-600' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin animate-in fade-in duration-150">
                          {client.cards.map((card) => {
                            const step = steps.find((s) => s.id === card.currentStepId) || steps[0];
                            return (
                              <div
                                key={card.id}
                                data-link-entity="card"
                                data-link-id={card.id}
                                data-link-label={`Carte — ${card.reference}`}
                                onClick={() => onCardClick(card)}
                                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2 group"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-indigo-700">
                                      {card.reference}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${step.color}`}>
                                      S{step.order}: {step.name}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 mt-0.5">
                                    {card.modele}
                                  </p>
                                </div>

                                <span className="p-1 text-slate-400 group-hover:text-indigo-600 shrink-0">
                                  <Eye className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Action to Open Client Identity Sheet */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedClientForIdentity(client)}
                    className="font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                  >
                    <IdCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Fiche Identitaire</span>
                  </button>

                  {client.cards.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                      <span>{isExpanded ? 'Masquer' : 'Voir les cartes'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Aucune carte active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Fiche Identitaire du Client */}
      {selectedClientForIdentity && (
        <ClientIdentityModal
          client={selectedClientForIdentity}
          steps={steps}
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => setSelectedClientForIdentity(null)}
          onUpdateClient={handleUpdateClientData}
          onCardClick={onCardClick}
        />
      )}

      {/* Modal: Add New Client */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nouveau Client / Marque</h3>
                  <p className="text-xs text-slate-500">Ajouter une marque cliente avec initiales personnalisées</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom de la marque ou du client *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    if (!newClientInitials) {
                      setNewClientInitials(getClientDefaultInitials(e.target.value));
                    }
                  }}
                  placeholder="ex: Maison Dior, Atelier Riviera..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initiales du client (1 à 4 lettres)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newClientInitials}
                  onChange={(e) => setNewClientInitials(e.target.value.toUpperCase())}
                  placeholder="ex: MD, AR, LV"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse E-mail de contact *</label>
                <input
                  type="email"
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="contact@client.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rôle / Intitulé du compte</label>
                <input
                  type="text"
                  value={newClientPoste}
                  onChange={(e) => setNewClientPoste(e.target.value)}
                  placeholder="ex: Client / Marque Partenaire"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone de contact</label>
                <input
                  type="tel"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="+33 1 40 00 00 00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse ou Siège social</label>
                <input
                  type="text"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="ex: 12 Rue de la Paix, 75002 Paris"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newClientName.trim() || !newClientEmail.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  Enregistrer le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
