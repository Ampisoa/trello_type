import React from 'react';
import { UserProfile } from '../types';
import { canUserCreateOrEditCards } from '../utils/permissions';
import {
  Home,
  Layers,
  LayoutGrid,
  List,
  Users,
  Building2,
  Plus,
  Search,
  X,
  Shield,
  ShieldCheck,
  Eye,
  Settings,
  LogOut,
  User,
  LogIn,
} from 'lucide-react';

interface HeaderProps {
  viewMode: 'kanban' | 'list' | 'poles' | 'clients' | 'direction';
  onViewModeChange: (mode: 'kanban' | 'list' | 'poles' | 'clients' | 'direction') => void;
  onHomeClick: () => void;
  activeBoardId?: string | null;
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  onUserChange: (user: UserProfile) => void;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenCreateCard: () => void;
  onOpenStepConfig: () => void;
  totalCards: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  onHomeClick,
  activeBoardId,
  currentUser,
  allUsers,
  onUserChange,
  onLogout,
  onOpenAuthModal,
  onOpenProfileModal,
  searchTerm,
  onSearchChange,
  onOpenCreateCard,
  onOpenStepConfig,
  totalCards,
}) => {
  const isDirector =
    Boolean(currentUser) &&
    (currentUser?.role === 'directeur' ||
      currentUser?.role === 'directeur général' ||
      currentUser?.role?.toLowerCase() === 'directeur' ||
      currentUser?.role?.toLowerCase() === 'directeur général' ||
      currentUser?.role?.toLowerCase() === 'directeur general');
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Logo & App Title - Clickable to go home */}
        <button
          type="button"
          onClick={onHomeClick}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
          title="Accueil : Suivi de Flux & Fiches Cartes"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 group-hover:bg-indigo-500 transition-all">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                Suivi de Flux & Fiches Cartes
              </h1>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                {totalCards} carte{totalCards > 1 ? 's' : ''}
              </span>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30"
                title="Synchronisation automatique en direct active (multi-utilisateurs)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En direct
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pipeline de fabrication • Checklists ajustables • Fiches identitaires
            </p>
          </div>
        </button>

        {/* Right side controls: Current User, Switcher, Logout & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
          {currentUser ? (
            currentUser.role === 'visiteur' ? (
              <div className="flex items-center gap-2 bg-amber-950/80 p-1.5 pl-2.5 rounded-xl border border-amber-500/40 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-amber-600/40 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-amber-200 leading-tight truncate max-w-[140px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-amber-400 font-medium">
                    Invité (Lecture seule)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors ml-1"
                  title="Quitter le mode visiteur"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Quitter</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 pl-2 rounded-xl border border-slate-700/80 shadow-xs">
                {/* User Identity Info - Clickable to edit profile & avatar */}
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-2 hover:bg-slate-700/60 p-1 rounded-lg transition-colors group text-left"
                  title="Modifier mon profil et ma photo d'avatar"
                >
                  <div className="relative">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/50 group-hover:ring-indigo-400 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-indigo-500/50">
                        {currentUser.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center text-white border border-slate-900 shadow-xs">
                      <Settings className="w-2 h-2" />
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-white leading-tight truncate max-w-[130px] group-hover:text-indigo-200 transition-colors">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-indigo-300 font-medium capitalize truncate">
                      {currentUser.posteLabel || currentUser.role}
                    </p>
                  </div>
                </button>

                {/* Explicit Logout Button */}
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg border border-red-500/30 flex items-center gap-1 transition-colors ml-0.5"
                  title="Se déconnecter de votre compte"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            )
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Se Connecter / S'inscrire</span>
            </button>
          )}

          {/* Action Buttons */}
          {canUserCreateOrEditCards(currentUser) && (
            <button
              onClick={onOpenStepConfig}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Ajuster la séquence des steps et checklists par défaut"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Ajuster</span> Steps
            </button>
          )}

          {canUserCreateOrEditCards(currentUser) && (
            <button
              onClick={onOpenCreateCard}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Carte</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Header: View switcher & Live Search */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
            {/* Bouton Accueil lié au Tableau Liste (vue d'accueil par défaut) */}
            <button
              id="nav-tab-home"
              onClick={onHomeClick}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'list' && !activeBoardId && !searchTerm
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Accueil : Tableau Liste de Suivi de Flux & Fiches Cartes (Tous les modèles)"
            >
              <Home className="w-3.5 h-3.5" />
              Accueil
            </button>

            <button
              id="nav-tab-list"
              onClick={() => onViewModeChange('list')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                viewMode === 'list' && (activeBoardId || searchTerm)
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : viewMode === 'list'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tableau Liste"
            >
              <List className="w-3.5 h-3.5" />
              Tableau Liste
            </button>

            <button
              id="nav-tab-kanban"
              onClick={() => onViewModeChange('kanban')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                viewMode === 'kanban' && (activeBoardId || searchTerm)
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : viewMode === 'kanban'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vue Kanban"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Vue Kanban
            </button>

            <button
              id="nav-tab-poles"
              onClick={() => onViewModeChange('poles')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                viewMode === 'poles'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Pôles
            </button>

            <button
              id="nav-tab-clients"
              onClick={() => onViewModeChange('clients')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                viewMode === 'clients'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Clients
            </button>

            {isDirector && (
              <button
                id="nav-tab-direction"
                onClick={() => onViewModeChange('direction')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'direction'
                    ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-400/50'
                    : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800'
                }`}
                title="Vue de pilotage stratégique pour la Direction"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Direction</span>
                <span className="text-[9px] px-1 py-0.2 bg-amber-500/30 text-amber-200 rounded font-semibold border border-amber-400/30">
                  Pilote
                </span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par référence, modèle, client..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-8 py-1 text-xs bg-slate-900 text-white border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

