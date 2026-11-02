import React, { useState } from 'react';
import { Card, StepDefinition, UserProfile } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import { getClientDefaultInitials, CLIENT_COLOR_PALETTES } from '../utils/clientInitials';
import { RichTextEditor } from './RichTextEditor';
import { formattedToPlainText } from './FormattedText';
import {
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  FolderKanban,
  Calendar,
  Save,
  Check,
  Eye,
  UserCheck,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface ClientIdentityModalProps {
  client: {
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
  };
  steps: StepDefinition[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onClose: () => void;
  onUpdateClient: (updatedClientData: {
    id: string;
    name: string;
    email?: string;
    initials: string;
    posteLabel?: string;
    phone?: string;
    address?: string;
    notes?: string;
    brandColor?: string;
  }) => void;
  onCardClick: (card: Card) => void;
}

export const ClientIdentityModal: React.FC<ClientIdentityModalProps> = ({
  client,
  steps,
  allUsers,
  currentUser,
  onClose,
  onUpdateClient,
  onCardClick,
}) => {
  const canEdit = canUserCreateOrEditCards(currentUser) || currentUser.id === client.userAccount?.id;

  const [activeTab, setActiveTab] = useState<'info' | 'cards' | 'notes'>('info');

  // Form State
  const [name, setName] = useState(client.name.replace(/\(client\)/gi, '').trim());
  const [initials, setInitials] = useState(
    client.initials || client.userAccount?.initials || getClientDefaultInitials(client.name)
  );
  const [email, setEmail] = useState(client.email || client.userAccount?.email || '');
  const [phone, setPhone] = useState(client.phone || client.userAccount?.phone || '');
  const [address, setAddress] = useState(client.address || client.userAccount?.address || '');
  const [posteLabel, setPosteLabel] = useState(client.posteLabel || 'Client / Marque Partenaire');
  const [notes, setNotes] = useState(client.notes || client.userAccount?.notes || '');
  const [brandColor, setBrandColor] = useState(
    client.brandColor || client.userAccount?.brandColor || 'indigo'
  );
  const [isSaved, setIsSaved] = useState(false);

  const selectedPalette =
    CLIENT_COLOR_PALETTES.find((p) => p.id === brandColor) || CLIENT_COLOR_PALETTES[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    onUpdateClient({
      id: client.id,
      name: name.trim() || client.name,
      email: email.trim(),
      initials: (initials.trim() || getClientDefaultInitials(name)).toUpperCase(),
      posteLabel: posteLabel.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      brandColor,
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative shrink-0 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Square Icon with 10% Border Radius (Rayon 10%) displaying client avatar or initials */}
              {client.avatar ? (
                <img
                  src={client.avatar}
                  alt={client.name}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-[10%] object-contain bg-white border-2 border-white/20 shrink-0 shadow-lg"
                />
              ) : (
                <div
                  className={`w-16 h-16 sm:w-18 sm:h-18 ${selectedPalette.bg} text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0 transition-transform`}
                  style={{ borderRadius: '10%' }}
                  title="Icône carré du client (arrondi 10%) avec initiales"
                >
                  <span>{initials.substring(0, 4) || 'CL'}</span>
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                    Fiche Identitaire Client
                  </span>
                  {client.userAccount && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Compte Utilisateur Lié
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate mt-1">
                  {name || client.name}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {posteLabel || 'Partenaire Marque Référente'}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex items-center gap-2 self-end sm:self-start">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-5 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'info'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Identité & Coordonnées</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'cards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Modèles en Fabrication ({client.cards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Spécifications & Notes</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'info' && (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Initials & Visual Palette customizer */}
              <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Icône Carré & Initiales du Client
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700">
                    Bordure 10% d'arrondi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initiales affichées (1 à 4 lettres)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={initials}
                      disabled={!canEdit}
                      onChange={(e) => setInitials(e.target.value.toUpperCase())}
                      placeholder="ex: MHC, LV, AR"
                      className="w-full px-3 py-2 text-sm font-black text-slate-900 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider"
                    />
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      Ces initiales apparaîtront dans l'icône carré sur l'annuaire client et les fiches.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Couleur du carré d'initiales
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {CLIENT_COLOR_PALETTES.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => setBrandColor(p.id)}
                          className={`w-7 h-7 rounded-[10%] ${p.bg} transition-transform flex items-center justify-center text-white ${
                            brandColor === p.id
                              ? 'ring-2 ring-indigo-500 scale-110 shadow-sm'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          title={p.name}
                        >
                          {brandColor === p.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom de la Marque / Client *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      disabled={!canEdit}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Maison Dior, Chanel..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rôle / Statut Marque
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={posteLabel}
                    onChange={(e) => setPosteLabel(e.target.value)}
                    placeholder="Client / Marque Partenaire"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse E-mail de contact
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled={!canEdit}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@marque.com"
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Téléphone / Ligne directe
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+33 1 42 68 00 00"
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse du siège / Atelier
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="ex: 30 Avenue Montaigne, 75008 Paris, France"
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Save Bar */}
              {canEdit && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    {isSaved ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                        <Check className="w-4 h-4" /> Modifications enregistrées !
                      </span>
                    ) : (
                      <span>Les modifications s'appliqueront à l'ensemble des fiches et du système.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Enregistrer la Fiche Client</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Modèles & Cartes en Suivi ({client.cards.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fiches de fabrication en cours et terminées associées à cette marque.
                  </p>
                </div>
              </div>

              {client.cards.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                  <FolderKanban className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucun modèle associé</p>
                  <p className="text-[11px] text-slate-400">
                    Aucune carte de fabrication n'a encore été créée pour ce client.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {client.cards.map((card) => {
                    const step = steps.find((s) => s.id === card.currentStepId) || steps[0];
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          onClose();
                          onCardClick(card);
                        }}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {card.reference}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${step.color}`}
                          >
                            S{step.order}: {step.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {card.frame ? (
                            <img
                              src={card.frame.fileUrl}
                              alt={card.modele}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                              <Layers className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                              {card.modele}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {formattedToPlainText(card.descriptionSpec?.matiere || 'Textile standard')}
                            </p>
                            {card.dateLivraison && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>Livraison: {new Date(card.dateLivraison).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">
                            Statut: <strong className="text-slate-800 capitalize">{card.status.replace('_', ' ')}</strong>
                          </span>
                          <span className="text-indigo-600 font-bold flex items-center gap-1 group-hover:underline">
                            <Eye className="w-3.5 h-3.5" /> Ouvrir la fiche
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exigences Particulières, Cahier des Charges & Spécifications Client
                </label>
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  disabled={!canEdit}
                  placeholder="Notes de fabrication, contraintes de conditionnement, contrôle qualité spécifique à la marque... (Mise en forme, liens, images, emojis)"
                  minRows={6}
                  isDark={false}
                  users={allUsers}
                />
              </div>

              {canEdit && (
                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder les Notes</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Identifiant :</span>
            <span className="font-mono text-[11px] text-slate-600">{client.id}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
