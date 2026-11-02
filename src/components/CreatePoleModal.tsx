import React, { useState, useMemo } from 'react';
import { MerchPole, UserProfile, CustomBoard } from '../types';
import { RichTextEditor } from './RichTextEditor';
import {
  X,
  Users,
  Plus,
  Check,
  Building2,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  Shield,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';

interface CreatePoleModalProps {
  allUsers: UserProfile[];
  currentUser: UserProfile;
  boards?: CustomBoard[];
  onClose: () => void;
  onCreatePole: (newPole: MerchPole) => void;
}

export const CreatePoleModal: React.FC<CreatePoleModalProps> = ({
  allUsers,
  currentUser,
  boards = [],
  onClose,
  onCreatePole,
}) => {
  // Available Merchandisers
  const availableMerchs = useMemo(() => {
    return allUsers.filter((u) => u.role === 'commercial' || u.role === 'admin' || u.role === 'directeur');
  }, [allUsers]);

  // No leaders selected by default (explicit choice by the user)
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);

  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [customName, setCustomName] = useState('');
  const [code, setCode] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [teams, setTeams] = useState('');
  const [description, setDescription] = useState('');

  // Compute automatic title
  const computedTitle = useMemo(() => {
    if (customName.trim()) return customName.trim();
    const selectedUsers = allUsers.filter((u) => selectedLeaderIds.includes(u.id));
    const firstNames = selectedUsers.map((u) => u.name.trim().split(' ')[0]);

    if (firstNames.length === 0) return 'Nouveau Pôle Commercial';
    if (firstNames.length === 1) return `Pôle de ${firstNames[0]}`;
    if (firstNames.length === 2) return `Pôle de ${firstNames[0]} et ${firstNames[1]}`;
    const last = firstNames[firstNames.length - 1];
    const others = firstNames.slice(0, -1).join(', ');
    return `Pôle de ${others} et ${last}`;
  }, [customName, selectedLeaderIds, allUsers]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedLeaderIds.length === 0) {
      alert('Veuillez sélectionner au moins un responsable de pôle.');
      return;
    }

    const selectedUsers = allUsers.filter((u) => selectedLeaderIds.includes(u.id));
    const leaderNames = selectedUsers.map((u) => u.name);

    const newPole: MerchPole = {
      id: `pole-${Date.now()}`,
      name: customName.trim() ? customName.trim() : computedTitle,
      code: code.trim() || undefined,
      specialty: specialty.trim() || undefined,
      leaderIds: selectedLeaderIds,
      leaderNames,
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      teams: teams.trim() || undefined,
      boardIds: selectedBoardIds,
      createdAt: new Date().toISOString(),
    };

    onCreatePole(newPole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Création
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Créer un Nouveau Pôle Commercial
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Leaders Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              1. Sélectionner les Responsables du Pôle *
            </label>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Sélectionnez les commerciaux et commerciales responsables de ce pôle. Le titre sera automatiquement ajusté.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableMerchs.map((u) => {
                const isSelected = selectedLeaderIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleLeaderSelection(u.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-300'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
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

          {/* Computed Title Preview */}
          <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-extrabold text-indigo-700 tracking-wider">
                Titre Généré Automatiquement
              </p>
              <p className="text-sm font-black text-indigo-900 truncate">{computedTitle}</p>
            </div>
          </div>

          {/* Section 2: Boards Attribution */}
          {boards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  2. Boards Attribués à ce Pôle (Optionnel)
                </label>
                <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selectedBoardIds.length} sélectionné{selectedBoardIds.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Attribuez un ou plusieurs boards regroupant les modèles à ce pôle.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                {boards.map((b) => {
                  const isSelected = selectedBoardIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => toggleBoardSelection(b.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-indigo-600 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-indigo-600 text-white" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{b.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {b.cardIds.length} modèle{b.cardIds.length > 1 ? 's' : ''} regroupé{b.cardIds.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Titre personnalisé */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Titre Personnalisé (Optionnel - sinon automatique)
            </label>
            <input
              type="text"
              placeholder={computedTitle}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Section 4: Spécialité / Sous-titre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Spécialité / Sous-titre du Pôle (Optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Haute Couture, Soieries & Modèles Signatures"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ce texte s'affiche sous le nom du pôle (ex: sous-titre de spécialité produit ou marché).
            </p>
          </div>

          {/* Section 4: Contact */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Contact du Pôle
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de Téléphone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+33 1 42 68 55 00"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description & Missions
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Présentation des expertises, clients suivis et process de confection..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Créer le Pôle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
