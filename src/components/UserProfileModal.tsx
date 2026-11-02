import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { AvatarPicker } from './AvatarPicker';
import { isDirection, canManageUserRoles } from '../utils/permissions';
import {
  X,
  User,
  Mail,
  Briefcase,
  Lock,
  Save,
  Check,
  Camera,
  Users,
  Shield,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onUpdateUser: (updatedUser: UserProfile) => void;
  onDeleteUser?: (userId: string) => void;
  onSwitchUser?: (user: UserProfile) => void;
}

const ROLE_OPTIONS = [
  { value: 'directeur général', label: 'Directeur Général' },
  { value: 'directeur', label: 'Directeur de Production' },
  { value: 'resp_planning', label: 'Responsable Planning & Ordonnancement' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'magasinier', label: 'Magasinier' },
];

function getRoleDisplayLabel(role: string): string {
  const match = ROLE_OPTIONS.find((r) => r.value === role.toLowerCase());
  if (match) return match.label;
  return role;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
}) => {
  const isCallerDirection = isDirection(currentUser);

  // Non-direction users can ONLY edit their own profile
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const targetUser = isCallerDirection
    ? allUsers.find((u) => u.id === selectedUserId) || currentUser
    : currentUser;

  const [name, setName] = useState(targetUser.name);
  const [email, setEmail] = useState(targetUser.email);
  const [role, setRole] = useState(targetUser.role || 'commercial');
  const [posteLabel, setPosteLabel] = useState(targetUser.posteLabel || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState(targetUser.avatar || '');
  const [isSaved, setIsSaved] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const isPasswordHashed = Boolean(targetUser.password?.startsWith('pbkdf2$'));

  // Sync state when targetUser or currentUser changes
  useEffect(() => {
    setName(targetUser.name);
    setEmail(targetUser.email);
    setRole(targetUser.role || 'commercial');
    setPosteLabel(targetUser.posteLabel || '');
    setPassword('');
    setShowPassword(false);
    setPasswordMsg(null);
    setAvatar(targetUser.avatar || '');
  }, [targetUser.id, targetUser.name, targetUser.email, targetUser.role, targetUser.posteLabel, targetUser.avatar, targetUser.password]);

  // When switching selected target user in manager view (Direction only)
  const handleSelectUser = (u: UserProfile) => {
    if (!isCallerDirection) return;
    setSelectedUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role || 'commercial');
    setPosteLabel(u.posteLabel || '');
    setPassword('');
    setShowPassword(false);
    setPasswordMsg(null);
    setAvatar(u.avatar || '');
    setIsSaved(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (password.trim() && password.trim().length < 6) {
      setPasswordMsg('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    // Strict security rule: non-direction users CANNOT change their role
    const finalRole = isCallerDirection ? (role as any) : targetUser.role;

    const updatedUser: UserProfile = {
      ...targetUser,
      name: name.trim(),
      email: email.trim(),
      role: finalRole,
      posteLabel: posteLabel.trim() || targetUser.posteLabel,
      avatar: avatar.trim() || undefined,
      ...(password.trim() ? { password: password.trim() } : {}),
    };

    onUpdateUser(updatedUser);
    setIsSaved(true);
    setPassword('');
    setPasswordMsg(password.trim() ? 'Mot de passe mis à jour et chiffré avec succès !' : null);
    setTimeout(() => {
      setIsSaved(false);
      setPasswordMsg(null);
    }, 3000);
  };

  const handleDeleteTarget = () => {
    const target = targetUser;
    if (!onDeleteUser) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer le compte de "${target.name}" (${target.email}) ?\nCette action est irréversible.`)) {
      return;
    }
    onDeleteUser(target.id);
    setSelectedUserId(currentUser.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isCallerDirection && targetUser.id !== currentUser.id
                  ? `Gestion du profil : ${targetUser.name}`
                  : "Mon Profil & Photo d'avatar"}
              </h3>
              <p className="text-xs text-slate-400">
                {isCallerDirection
                  ? "Gestion des profils d'équipe et attribution des rôles par la Direction"
                  : "Personnalisez votre photo de profil, avatar et informations d'utilisateur"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCallerDirection && onDeleteUser && targetUser.id !== currentUser.id && (
              <button
                type="button"
                onClick={handleDeleteTarget}
                title={`Supprimer le compte de ${targetUser.name}`}
                className="w-8 h-8 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick User Selector (RESERVED TO DIRECTION ONLY) */}
        {isCallerDirection && allUsers.length > 1 && (
          <div className="bg-slate-950/40 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2 max-h-48 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Collaborateur :
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {allUsers.map((u) => {
                const isSelected = u.id === targetUser.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-4 h-4 rounded-full object-cover border border-white"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-indigo-500 text-white font-bold text-[8px] flex items-center justify-center">
                        {u.name.charAt(0)}
                      </div>
                    )}
                    <span>{u.name.split(' ')[0]}</span>
                    {u.id === currentUser.id && (
                      <span className="text-[9px] px-1 bg-white/20 rounded font-normal">Moi</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Avatar Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Photo de Profil / Avatar
            </label>

            <AvatarPicker
              currentAvatar={avatar}
              userName={name}
              onSelectAvatar={(newAvatarUrl) => setAvatar(newAvatarUrl)}
              onClearAvatar={() => setAvatar('')}
            />
          </div>

          {/* User Information Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom complet *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Sophie Bertrand"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Rôle système (LOCKED for regular users, EDITABLE for Direction only) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Rôle système
                </label>
                {!isCallerDirection && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" /> Attribué par la Direction
                  </span>
                )}
              </div>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {isCallerDirection ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ring-1 ring-indigo-200"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span>{getRoleDisplayLabel(targetUser.role)}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                      Verrouillé
                    </span>
                  </div>
                )}
              </div>
              {!isCallerDirection ? (
                <p className="text-[10px] text-slate-500 mt-1">
                  Les rôles et droits d'accès sont définis par la Direction Générale pour garantir la sécurité du suivi.
                </p>
              ) : (
                <p className="text-[10px] text-indigo-600 font-medium mt-1">
                  Privilège Direction : vous pouvez modifier le rôle de ce collaborateur.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Intitulé de poste
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posteLabel}
                  onChange={(e) => setPosteLabel(e.target.value)}
                  placeholder="ex: Commercial"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@entreprise.com"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Mot de passe de session
                </label>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>PBKDF2 SHA-512 (100k itérations)</span>
                </div>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isPasswordHashed
                      ? '•••••••• (Laisser vide pour conserver le mot de passe actuel)'
                      : 'Nouveau mot de passe (min. 6 caractères)'
                  }
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordMsg ? (
                <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {passwordMsg}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1">
                  {isPasswordHashed
                    ? 'Ce compte utilise déjà un hashage PBKDF2 sécurisé. Saisissez une valeur pour modifier le mot de passe.'
                    : 'Le mot de passe sera automatiquement chiffré par PBKDF2 avec sel unique à la prochaine connexion.'}
                </p>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {isSaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" /> Profil et avatar mis à jour !
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fermer
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les Modifications</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
