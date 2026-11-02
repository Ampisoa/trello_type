import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AvatarPicker } from './AvatarPicker';
import { AVATAR_PRESETS } from '../data/avatarPresets';
import { ApiService } from '../services/api';
import {
  LogIn,
  UserPlus,
  X,
  Lock,
  Mail,
  User,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  allUsers: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onSignup: (newUser: UserProfile) => void;
  initialMode?: 'login' | 'signup';
  isDismissable?: boolean;
}

export const SIGNUP_ROLES_LIST = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'resp_planning', label: 'Responsable Planning & Ordonnancement' },
  { value: 'directeur général', label: 'Directeur Général (Validation Direction requise)' },
  { value: 'directeur', label: 'Directeur de Production (Validation Direction requise)' },
  { value: 'magasinier', label: 'Magasinier / Stock' },
  { value: 'fournisseur', label: 'Fournisseur / Sous-traitant' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  onLogin,
  onSignup,
  initialMode = 'login',
  isDismissable = true,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('commercial');
  const [signupAvatar, setSignupAvatar] = useState(AVATAR_PRESETS[0].url);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [directionSecretCode, setDirectionSecretCode] = useState('');
  const [showDirectionCode, setShowDirectionCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDirectionRole = signupRole === 'directeur' || signupRole === 'directeur général';

  // Comptes démo hérités à exclure définitivement de l'interface
  const LEGACY_DEMO_IDS = new Set([
    'usr-1', 'usr-2', 'usr-5', 'usr-6', 'usr-planning-1', 'usr-dir-1', 'usr-dir-2', 'usr-client-1',
  ]);
  const staffAccounts = allUsers.filter(
    (u) =>
      (u.role as string) !== 'client' &&
      (u.role as string) !== 'visiteur' &&
      !u.id.startsWith('usr-vis') &&
      !LEGACY_DEMO_IDS.has(u.id) &&
      !u.email.includes('@fashionbrand.com') &&
      !u.email.includes('@ateliercouture.fr')
  );
  // Afficher la liste des vrais comptes disponibles dès qu'il y en a
  const isAccountListReady = staffAccounts.length > 0;

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Call backend API /api/v1/auth/login
      const response = await ApiService.login(loginEmail, loginPassword);
      if (response && response.user) {
        onLogin(response.user);
        setSuccess(`Ravi de vous revoir, ${response.user.name} !`);
        setTimeout(() => {
          onClose?.();
        }, 400);
        return;
      }
    } catch (apiErr: any) {
      const status = apiErr?.status || apiErr?.response?.status;
      // Real server response (HTTP error) => invalid credentials, never fall back.
      if (status) {
        setError(apiErr?.detail || apiErr?.message ||
          "Identifiants invalides. Veuillez vérifier votre adresse e-mail et mot de passe.");
        return;
      }
      console.warn('[AuthModal] API injoignable, bascule en vérification locale:', apiErr);
    } finally {
      setIsLoading(false);
    }

    // Local fallback: ONLY for network-level failures (API unreachable). A reply
    // from the server (401/404/etc) must never log the user in without a real
    // token, otherwise authenticated writes fail with "Aucun jeton ...".
    const user = allUsers.find(
      (u) => u.email.toLowerCase().trim() === loginEmail.toLowerCase().trim()
    );

    if (!user) {
      setError("Aucun compte trouvé avec cet e-mail. Veuillez vérifier ou vous inscrire.");
      return;
    }

    const expectedPassword = user.password || '123456';
    if (loginPassword !== expectedPassword) {
      setError("Mot de passe incorrect.");
      return;
    }

    // Even in the offline fallback, try to obtain a real server token using the
    // typed credentials so the session stays server-backed once the API is back.
    ApiService.acquireTokenForUser({ userId: user.id, email: user.email, password: loginPassword });
    onLogin(user);
    setSuccess(`Ravi de vous revoir, ${user.name} !`);
    setTimeout(() => {
      onClose?.();
    }, 400);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (isDirectionRole) {
      if (!directionSecretCode.trim()) {
        setError("Veuillez saisir le mot de passe secret Direction commun pour authentifier votre profil de Direction.");
        return;
      }
    }

    const roleObj = SIGNUP_ROLES_LIST.find((r) => r.value === signupRole);
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: signupName.trim(),
      email: signupEmail.trim(),
      role: signupRole as any,
      posteLabel: roleObj ? roleObj.label.split(' (')[0] : signupRole,
      password: signupPassword,
      avatar: signupAvatar || undefined,
    };

    setIsLoading(true);

    try {
      // Call backend API /api/v1/auth/register with directionCode if applicable
      const response = await ApiService.register({
        ...newUser,
        directionCode: isDirectionRole ? directionSecretCode.trim() : undefined,
      } as any);
      if (response && response.user) {
        onSignup(response.user);
        setSuccess(`Compte créé avec succès ! Bienvenue, ${response.user.name}.`);
        setTimeout(() => {
          onClose?.();
        }, 500);
        return;
      }
    } catch (apiErr: any) {
      console.warn('[AuthModal] Backend register error:', apiErr);
      if (apiErr.detail || apiErr.message) {
        setError(apiErr.detail || apiErr.message);
        setIsLoading(false);
        return;
      }
    } finally {
      setIsLoading(false);
    }

    const existing = allUsers.find(
      (u) => u.email.toLowerCase().trim() === signupEmail.toLowerCase().trim()
    );
    if (existing) {
      setError("Un compte existe déjà avec cette adresse email.");
      return;
    }

    onSignup(newUser);
    setSuccess(`Compte créé avec succès ! Bienvenue, ${newUser.name}.`);
    setTimeout(() => {
      onClose?.();
    }, 500);
  };

  const handlePrefillAccount = (user: UserProfile) => {
    setLoginEmail(user.email);
    setLoginPassword('');
    setError(null);
    setSuccess(`Adresse e-mail renseignée pour ${user.name}. Saisissez votre mot de passe, puis cliquez sur « Connexion ».`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'login' ? 'Connexion Sécurisée' : 'Créer un nouveau compte'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'login'
                  ? 'Entrez vos identifiants pour accéder à l\'outil'
                  : 'Remplissez le formulaire d\'inscription'}
              </p>
            </div>
          </div>
          {isDismissable && onClose && (
            <button
              onClick={() => onClose?.()}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950 border-b border-slate-800 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'signup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            S'inscrire (Sign Up)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ex: miarisoa@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                Connexion
              </button>

              {/* Quick accounts helper (real staff accounts from the server) */}
              {isAccountListReady && (
                <div className="pt-3 border-t border-slate-800/80">
                  <p className="text-[11px] font-medium text-slate-400 mb-2">
                    Comptes de l'équipe (cliquer pour pré-remplir l'e-mail, puis valider par « Connexion ») :
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {staffAccounts
                      .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handlePrefillAccount(u)}
                        className="w-full p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left flex items-center justify-between text-xs text-slate-300 transition-colors"
                        title="Saisir automatiquement l'adresse e-mail de ce compte"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </span>
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0 uppercase tracking-wider">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="ex: Jean Dupont"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="ex: jean.dupont@entreprise.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Poste / Fonction dans l'entreprise
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {SIGNUP_ROLES_LIST.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isDirectionRole ? (
                  <div className="mt-2.5 p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        Mot de passe secret Direction (Commun aux directeurs)
                      </label>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-900/60 border border-amber-700/50 px-1.5 py-0.5 rounded">
                        Requis
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Pour valider que vous êtes bien un Directeur, entrez le mot de passe secret connu en commun par tous les directeurs.
                    </p>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showDirectionCode ? 'text' : 'password'}
                        required
                        value={directionSecretCode}
                        onChange={(e) => setDirectionSecretCode(e.target.value)}
                        placeholder="Mot de passe secret Direction (ex: DIRECTION2026)"
                        className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-amber-500/60 rounded-xl text-xs text-white placeholder-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wide"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDirectionCode(!showDirectionCode)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/70 hover:text-amber-200"
                        title={showDirectionCode ? 'Masquer' : 'Afficher'}
                      >
                        {showDirectionCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="text-[10px] text-amber-300/70 flex items-center justify-between pt-0.5">
                      <span>✓ Valide et débloque les prérogatives Direction</span>
                      <span className="text-amber-400/90 font-mono text-[9px] bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/30">
                        Code: DIRECTION2026
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Les accès Direction et Directeur Général sont protégés par un code d'authentification commun.
                  </p>
                )}
              </div>

              {/* Avatar Selector in Signup */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Avatar Dessin Animé & Cool
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPresets = AVATAR_PRESETS;
                      const pick = randomPresets[Math.floor(Math.random() * randomPresets.length)];
                      setSignupAvatar(pick.url);
                    }}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    🎲 Aléatoire
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-900 shrink-0 p-0.5">
                    <img
                      src={signupAvatar}
                      alt="Aperçu"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Choisissez votre look D.A / Cartoon parmi la sélection :
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSignupAvatar(p.url)}
                      className={`relative rounded-full aspect-square p-0.5 overflow-hidden transition-all ${
                        signupAvatar === p.url
                          ? 'ring-2 ring-indigo-500 scale-105 bg-indigo-950'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={p.name}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reconfirmation du mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-3"
              >
                <UserPlus className="w-4 h-4" />
                Valider mon Inscription
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
