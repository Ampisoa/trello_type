import React, { useState, useEffect, useRef } from 'react';
import { Card, StepDefinition, UserProfile, MerchPole, CustomBoard } from './types';
import { DEFAULT_STEPS, INITIAL_CARDS, DEFAULT_USERS, DEFAULT_POLES, DEFAULT_BOARDS } from './data/initialData';
import { isCardVisibleToUser, isBoardVisibleToUser, isPoleVisibleToUser, canUserCreateOrEditCards, isDirection, isVisiteur } from './utils/permissions';
import { getPoleTitle } from './utils/poleHelpers';
import { ingestFilesIntoCard } from './utils/mediaUpload';
import { ApiService } from './services/api';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { CardListView } from './components/CardListView';
import { PolesView } from './components/PolesView';
import { ClientsView } from './components/ClientsView';
import { DirectionView } from './components/DirectionView';
import { CardIdentityModal } from './components/CardIdentityModal';
import { StepConfigModal } from './components/StepConfigModal';
import { CreateCardModal } from './components/CreateCardModal';
import { BoardModal } from './components/BoardModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { KanbanBackgroundModal } from './components/KanbanBackgroundModal';
import { ArchivesModal } from './components/ArchivesModal';
import { Layers, X, Image as ImageIcon, Sparkles, ChevronDown, Plus, Edit2, Check, LayoutGrid, Eye, Archive, ListOrdered, List, Link2, Home } from 'lucide-react';
import { getEntityDeepLink } from './utils/appUrl';
import { LinkContextMenuProvider } from './components/LinkContextMenu';

const STORAGE_CARDS_KEY = 'suivi_flux_cards_v2';
const STORAGE_STEPS_KEY = 'suivi_flux_steps_v2';
const STORAGE_USERS_KEY = 'suivi_flux_users_v2';
const STORAGE_CURRENT_USER_KEY = 'suivi_flux_current_user_v2';
const STORAGE_POLES_KEY = 'suivi_flux_poles_v2';
const STORAGE_BOARDS_KEY = 'suivi_flux_boards_v2';
const STORAGE_KANBAN_BG_KEY = 'suivi_flux_kanban_bg_v2';
const DEFAULT_KANBAN_BG = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1600&q=80';

export default function App() {
  const [cards, setCards] = useState<Card[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CARDS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_CARDS;
    } catch {
      return INITIAL_CARDS;
    }
  });

  const [steps, setSteps] = useState<StepDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STEPS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_STEPS;
    } catch {
      return DEFAULT_STEPS;
    }
  });

  const [poles, setPoles] = useState<MerchPole[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POLES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_POLES;
    } catch {
      return DEFAULT_POLES;
    }
  });

  const [boards, setBoards] = useState<CustomBoard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOARDS_KEY);
      if (saved) {
        const parsed: CustomBoard[] = JSON.parse(saved);
        return parsed.map((b) => ({
          ...b,
          cardIds: (b.cardIds || []).filter((id) => id !== 'card-104'),
        }));
      }
      return DEFAULT_BOARDS;
    } catch {
      return DEFAULT_BOARDS;
    }
  });

  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      // First run (nothing saved yet) falls back to the initial staff; once a
      // list has been persisted it is respected as-is (including deletions).
      const parsed: UserProfile[] = saved ? JSON.parse(saved) : DEFAULT_USERS;
      return parsed.filter(
        (u) => (u.role as string) !== 'client' && (u.role as string) !== 'visiteur' && u.id !== 'usr-client-1' && !u.id.startsWith('usr-vis')
      );
    } catch {
      return DEFAULT_USERS;
    }
  });

  // Session persisted in localStorage (shared across tabs/windows): opening the
  // app from a shareable deep link (e-mail, SMS, .txt…) in a NEW tab keeps the
  // user signed in and navigates straight to the linked entity.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY) || sessionStorage.getItem(STORAGE_CURRENT_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [kanbanBackground, setKanbanBackground] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KANBAN_BG_KEY);
      return saved !== null ? saved : DEFAULT_KANBAN_BG;
    } catch {
      return DEFAULT_KANBAN_BG;
    }
  });

  // Landing view on connection & reconnection: the Pôles dashboard.
  // The home page itself ('list' / global kanban) stays reachable via the
  // Accueil button and the home view toggle.
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'poles' | 'clients' | 'direction'>('poles');
  const [searchTerm, setSearchTerm] = useState('');

  // Incremented after a visitor link is validated so the app can re-fetch the
  // backend with the (now stored) visitor token instead of remaining on the
  // unauthenticated fallback data.
  const [serverSyncKey, setServerSyncKey] = useState(0);
  // Ensures the visitor link is processed only once per page load, even though
  // the effect re-runs whenever cards change.
  const visitorLinkHandledRef = useRef(false);
  // Ensures an authenticated-user deep link (?card_id / ?board_id / ?pole_id)
  // is consumed only once per page load.
  const deepLinkHandledRef = useRef(false);
  // Pôle ciblé par un lien direct (?pole_id=…), transmis à la vue Pôles pour
  // ouvrir immédiatement la fiche identitaire du pôle.
  const [poleDeepLinkId, setPoleDeepLinkId] = useState<string | null>(null);
  const [boardLinkCopied, setBoardLinkCopied] = useState(false);

  // Copy a shareable deep link (?board_id=…) for the active board.
  const handleCopyBoardLink = () => {
    if (!activeBoard) return;
    const url = getEntityDeepLink('board', activeBoard.id);
    navigator.clipboard?.writeText(url).then(
      () => {
        setBoardLinkCopied(true);
        window.setTimeout(() => setBoardLinkCopied(false), 1600);
      },
      () => {}
    );
  };

  // Modals state
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isStepConfigOpen, setIsStepConfigOpen] = useState(false);
  // Board whose personal steps are being edited (null = global template pipeline)
  const [stepConfigBoard, setStepConfigBoard] = useState<CustomBoard | null>(null);
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  // Board ciblé par le modal de création de carte, figé à l'ouverture : la carte
  // y est assignée directement (sans cela filteredCards ne l'afficherait pas,
  // car une vue board ne montre que ses propres cardIds).
  const [createCardBoardId, setCreateCardBoardId] = useState<string | null>(null);
  // Étape de départ imposée au modal de création (menu "..." d'une colonne) :
  // sans elle la carte naît sur la première étape du board.
  const [createCardStepId, setCreateCardStepId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isKanbanBgModalOpen, setIsKanbanBgModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isArchivesModalOpen, setIsArchivesModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<CustomBoard | null>(null);
  const [isBoardSelectorOpen, setIsBoardSelectorOpen] = useState(false);
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const boardSelectorRef = useRef<HTMLDivElement>(null);
  // Cards deleted locally, so an in-flight background refresh (triggered e.g. by
  // the confirm() dialog losing focus) cannot resurrect them before the server
  // has processed the DELETE.
  const deletedCardIdsRef = useRef<Set<string>>(new Set());
  // Users deleted locally (same anti-resurrection role as deletedCardIdsRef).
  const deletedUserIdsRef = useRef<Set<string>>(new Set());

  // Sérialisation des PUT /cards/:id : le payload est la carte complète, donc
  // deux requêtes simultanées pourraient être appliquées côté serveur dans
  // l'ordre inverse et la première écraserait les fichiers ajoutés par la
  // seconde. Une seule requête en vol à la fois, dans l'ordre FIFO.
  const cardUpdateChainRef = useRef<Record<string, Promise<unknown>>>({});
  const cardUpdatePendingRef = useRef<Record<string, number>>({});
  // id de la fiche ouverte, lu dans des callbacks asynchrones pour ne jamais
  // réécrire `selectedCard` une fois la modale refermée ou une autre ouverte.
  const selectedCardIdRef = useRef<string | null>(null);
  selectedCardIdRef.current = selectedCard?.id ?? null;

  // Close board selector on click outside
  useEffect(() => {
    if (!isBoardSelectorOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (boardSelectorRef.current && !boardSelectorRef.current.contains(e.target as Node)) {
        setIsBoardSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isBoardSelectorOpen]);

  const activeUser = currentUser || DEFAULT_USERS[0];
  const activeBoard = boards.find((b) => b.id === activeBoardId) || null;
  const visibleBoards = boards.filter((b) => isBoardVisibleToUser(b, activeUser, null, poles, cards));

  // Étapes affichées au kanban : celles du board actif si personnalisées, sinon
  // le modèle global (la vue Kanban globale sert de modèle de référence).
  const boardSteps =
    activeBoard && activeBoard.steps && activeBoard.steps.length > 0 ? activeBoard.steps : steps;

  // Cartes déjà regroupées dans un board personnalisé : exclues de la vue globale.
  const boardCardIds = new Set<string>();
  boards.forEach((b) => (b.cardIds || []).forEach((id) => boardCardIds.add(id)));

  // Fetch real data from backend on mount and sync periodically (Live Multi-user Polling)
  useEffect(() => {
    let isMounted = true;
    const fetchBackendData = async () => {
      try {
        const [backendSteps, backendUsers, backendCards, backendPoles, backendBoards] = await Promise.all([
          ApiService.getSteps().catch(() => null),
          ApiService.getUsers().catch(() => null),
          ApiService.getCards().catch(() => null),
          ApiService.getPoles().catch(() => null),
          ApiService.getBoards().catch(() => null),
        ]);

        if (!isMounted) return;

        if (backendSteps && backendSteps.length > 0) {
          setSteps(backendSteps);
        }
        if (backendUsers) {
          const cleanBackendUsers = backendUsers.filter(
            (u) => (u.role as string) !== 'client' && (u.role as string) !== 'visiteur' && u.id !== 'usr-client-1' && !u.id.startsWith('usr-vis')
          );
          // Ignore users deleted locally but possibly still returned by a
          // refresh that raced with the DELETE request.
          const freshUsers = cleanBackendUsers.filter((u) => !deletedUserIdsRef.current.has(u.id));
          setAllUsers(freshUsers);
        }
        if (backendCards) {
          // Ignore cards deleted locally but possibly still returned by a
          // refresh that raced with the DELETE request.
          const freshCards = backendCards.filter((c) => !deletedCardIdsRef.current.has(c.id));
          setCards(freshCards);
          // Keep active open card in sync with fresh data from other users
          setSelectedCard((prevSelected) => {
            if (!prevSelected) return null;
            const updated = freshCards.find((c) => c.id === prevSelected.id);
            return updated || prevSelected;
          });
        }
        if (backendPoles && backendPoles.length > 0) {
          setPoles(backendPoles);
        }
        if (backendBoards && backendBoards.length > 0) {
          setBoards(backendBoards);
        }
      } catch {
        // Silent fallback to local storage during server warm-up
      }
    };

    fetchBackendData();

    // Event-driven synchronization: refresh when user refocuses the tab / window
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchBackendData();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [serverSyncKey]);

  // User Profile Update handler (enforcing anti-self-promotion, server is the source of truth)
  const handleUpdateUser = async (updatedUser: UserProfile) => {
    const callerIsDirection = isDirection(currentUser);
    const existing = allUsers.find((u) => u.id === updatedUser.id);

    // Non-direction users CANNOT change their system role
    const safeUser: UserProfile = {
      ...updatedUser,
      role: callerIsDirection ? updatedUser.role : (existing?.role || updatedUser.role),
    };

    const previousUser = existing || null;

    // Optimistic local update
    setAllUsers((prev) => prev.map((u) => (u.id === safeUser.id ? safeUser : u)));
    if (currentUser?.id === safeUser.id || (!currentUser && safeUser.id === DEFAULT_USERS[0].id)) {
      setCurrentUser(safeUser);
    }

    try {
      // Await the backend sync; keep local state consistent with server response
      const serverUser = await ApiService.updateUser(safeUser.id, safeUser);
      if (serverUser) {
        setAllUsers((prev) => prev.map((u) => (u.id === serverUser.id ? serverUser : u)));
        if (currentUser?.id === serverUser.id || (!currentUser && serverUser.id === DEFAULT_USERS[0].id)) {
          setCurrentUser(serverUser);
        }
      }
    } catch (e: any) {
      console.warn('[App] Update user backend sync notice:', e);
      // Roll back to avoid divergence with the database
      if (previousUser) {
        setAllUsers((prev) => prev.map((u) => (u.id === previousUser.id ? previousUser : u)));
        if (currentUser?.id === previousUser.id || (!currentUser && previousUser.id === DEFAULT_USERS[0].id)) {
          setCurrentUser(previousUser);
        }
      }
      alert(`Échec de la synchronisation du profil: ${e?.message || 'Erreur serveur'}`);
    }
  };

  // User deletion handler (Direction only, server is the source of truth)
  const handleDeleteUser = async (userId: string) => {
    const previousUsers = allUsers;
    const removed = previousUsers.find((u) => u.id === userId);
    if (!removed) return;

    // Optimistic local removal; keep the id shielded from background refreshes
    // until the server has confirmed the deletion.
    deletedUserIdsRef.current.add(userId);
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      await ApiService.deleteUser(userId);
    } catch (e: any) {
      console.warn('[App] Delete user backend sync notice:', e);
      // Roll back to avoid divergence with the database
      deletedUserIdsRef.current.delete(userId);
      setAllUsers(previousUsers);
      alert(`Échec de la suppression du collaborateur: ${e?.message || 'Erreur serveur'}`);
    }
  };

  // Sync cards with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CARDS_KEY, JSON.stringify(cards));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [cards]);

  // Sync steps with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STEPS_KEY, JSON.stringify(steps));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [steps]);

  // Sync allUsers with LocalStorage (clean internal staff only)
  useEffect(() => {
    try {
      const cleanUsers = allUsers.filter((u) => (u.role as string) !== 'client' && (u.role as string) !== 'visiteur' && !u.id.startsWith('usr-vis'));
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(cleanUsers));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [allUsers]);

  // Sync poles with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POLES_KEY, JSON.stringify(poles));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [poles]);

  // Sync boards with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOARDS_KEY, JSON.stringify(boards));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [boards]);

  // Keep the JWT token and the session in sync with the connected user.
  // The session is persisted in localStorage so the user stays signed in across
  // tabs/windows (in particular when opening a deep link in a new tab).
  useEffect(() => {
    let cancelled = false;
    const syncSession = async () => {
      try {
        if (currentUser) {
          localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
          sessionStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
          // Visitor sessions (invited observers) have no password and cannot
          // obtain a staff token: never force them through the re-auth /
          // logout path, otherwise visitor links log the user straight back out.
          const isVisitorSession = isVisiteur(currentUser);
          if (!isVisitorSession && !ApiService.getToken()) {
            const token = await ApiService.acquireTokenForUser({ userId: currentUser.id, email: currentUser.email });
            if (cancelled) return;
            if (!token) {
              // The API is reachable but no token is obtainable without
              // credentials: the restored session is not server-backed, so a
              // real login is required (otherwise all authenticated writes fail
              // with misleading "Aucun jeton d'authentification fourni").
              const health = await ApiService.checkHealth().then((h) => h?.status === 'ok').catch(() => false);
              if (cancelled) return;
              if (health) {
                console.warn('[App] Session non authentifiée auprès du serveur, reconnexion requise.');
                ApiService.logout();
                localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
                sessionStorage.removeItem(STORAGE_CURRENT_USER_KEY);
                setCurrentUser(null);
                setIsAuthModalOpen(true);
              }
            }
          }
        } else {
          sessionStorage.removeItem(STORAGE_CURRENT_USER_KEY);
          localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
          ApiService.logout();
        }
      } catch (e) {
        console.warn('Session storage save failed:', e);
      }
    };
    syncSession();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

// Ensure active token exists for active user on startup (staff users only;
// visitor sessions carry their own link token or none at all)
useEffect(() => {
  if (activeUser && !isVisiteur(activeUser) && !ApiService.getToken()) {
    ApiService.acquireTokenForUser({ userId: activeUser.id, email: activeUser.email });
  }
}, [activeUser]);

  // Sync kanbanBackground with LocalStorage
  useEffect(() => {
    try {
      if (kanbanBackground) {
        localStorage.setItem(STORAGE_KANBAN_BG_KEY, kanbanBackground);
      } else {
        localStorage.removeItem(STORAGE_KANBAN_BG_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [kanbanBackground]);

  // Support direct visitor access links (?visitor_token=xxx or ?visitor_email=xxx)
  // Approach 1: Visitors access directly via signed secure link without creating or storing a user account
  useEffect(() => {
    if (visitorLinkHandledRef.current) return;
    let isCancelled = false;
    const processVisitorLink = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const visitorToken = urlParams.get('visitor_token');
        const visitorEmail = urlParams.get('visitor_email');
        const boardIdParam = urlParams.get('board_id');
        const poleIdParam = urlParams.get('pole_id');
        const cardIdParam = urlParams.get('card_id');

        if (!visitorToken && !visitorEmail) {
          visitorLinkHandledRef.current = true;
          return;
        }

        if (visitorToken) {
          try {
            const res = await ApiService.verifyVisitorToken(visitorToken);
            if (!isCancelled && res.valid && res.user) {
              // Store the visitor token so ALL subsequent API calls run as the
              // invited visitor (server-side filtering applies). This also
              // prevents a leftover staff token from escalating visitor access.
              ApiService.setToken(visitorToken);
              setCurrentUser(res.user);
              setServerSyncKey((k) => k + 1);
              if (res.boardId || boardIdParam) {
                setActiveBoardId(res.boardId || boardIdParam);
                setViewMode('kanban');
              } else if (res.poleId || poleIdParam) {
                setViewMode('poles');
              } else if (res.cardId || cardIdParam) {
                const targetCardId = res.cardId || cardIdParam;
                const targetCard = cards.find((c) => c.id === targetCardId);
                if (targetCard) {
                  setSelectedCard(targetCard);
                }
                setViewMode('kanban');
              }
              visitorLinkHandledRef.current = true;
              return;
            }
            visitorLinkHandledRef.current = true;
          } catch (tokenErr) {
            console.warn('[App] Verification du token visiteur échouée, essai par email:', tokenErr);
            visitorLinkHandledRef.current = true;
          }
        }

        if (visitorEmail) {
          const cleanEmail = visitorEmail.toLowerCase().trim();
          const tempVisitor: UserProfile = {
            id: `vis-session-${encodeURIComponent(cleanEmail)}`,
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            role: 'visiteur',
            posteLabel: 'Visiteur Invité (Accès par lien)',
            avatar: `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(cleanEmail)}&eyes=variant08&hair=variant14`,
            invitedBoardIds: boardIdParam ? [boardIdParam] : [],
            invitedPoleIds: poleIdParam ? [poleIdParam] : [],
            invitedCardIds: cardIdParam ? [cardIdParam] : [],
          };
          // Set guest session directly WITHOUT adding to allUsers
          setCurrentUser(tempVisitor);

          if (boardIdParam) {
            setActiveBoardId(boardIdParam);
            setViewMode('kanban');
          } else if (poleIdParam) {
            setViewMode('poles');
          } else if (cardIdParam) {
            const targetCard = cards.find((c) => c.id === cardIdParam);
            if (targetCard) {
              setSelectedCard(targetCard);
            }
            setViewMode('kanban');
          }
          visitorLinkHandledRef.current = true;
        }
      } catch (e) {
        console.warn('[App] URL param parsing error:', e);
        visitorLinkHandledRef.current = true;
      }
    };

    processVisitorLink();
    return () => {
      isCancelled = true;
    };
  }, [cards]);

  // Deep links for authenticated users (?card_id / ?board_id / ?pole_id) — liens
  // partagés par e-mail, SMS, fichier .txt ou messagerie : au clic, l'utilisateur
  // connecté entre directement dans la carte / le board / le pôle visé.
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    if (!currentUser) return; // attendre la connexion (le lien sera rejoué après login)
    const params = new URLSearchParams(window.location.search);
    const targetCardId = params.get('card_id');
    const targetBoardId = params.get('board_id');
    const targetPoleId = params.get('pole_id');
    if (!targetCardId && !targetBoardId && !targetPoleId) {
      deepLinkHandledRef.current = true;
      return;
    }

    if (targetBoardId) {
      const board = boards.find((b) => b.id === targetBoardId);
      if (board && isBoardVisibleToUser(board, currentUser, null, poles, cards)) {
        deepLinkHandledRef.current = true;
        setActiveBoardId(board.id);
        setViewMode('kanban');
      }
    } else if (targetPoleId) {
      const pole = poles.find((p) => p.id === targetPoleId);
      if (pole && isPoleVisibleToUser(pole, currentUser, null, boards, cards)) {
        deepLinkHandledRef.current = true;
        setViewMode('poles');
        setPoleDeepLinkId(pole.id);
      }
    } else if (targetCardId) {
      const card = cards.find((c) => c.id === targetCardId);
      if (card) {
        const containingBoard = boards.find((b) => (b.cardIds || []).includes(card.id)) || null;
        if (isCardVisibleToUser(card, currentUser, containingBoard, boards, poles)) {
          deepLinkHandledRef.current = true;
          setActiveBoardId(containingBoard?.id ?? null);
          setViewMode('kanban');
          setSelectedCard(card);
        }
      }
      // Carte non trouvée (ou donnée pas encore chargée) : on n'archive pas le lien,
      // il sera rejoué automatiquement quand `cards` aura été mis à jour.
    }
  }, [currentUser, cards, boards, poles]);

  // Reset activeBoardId if the active user no longer has visibility on it
  useEffect(() => {
    if (activeBoardId && activeBoard) {
      if (!isBoardVisibleToUser(activeBoard, activeUser, null, poles, cards)) {
        setActiveBoardId(null);
      }
    }
  }, [activeBoardId, activeBoard, activeUser, poles, cards]);

  // Auth handlers: on connection the user lands on the Pôles dashboard.
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveBoardId(null); // Ensure all cards/models are visible
    setViewMode('kanban');
    // Clear visitor link query parameters if any were present
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setIsAuthModalOpen(true);
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveBoardId(null); // Direct landing on all cards/models
    setViewMode('poles'); // Land straight on the Pôles dashboard on login
    setIsAuthModalOpen(false);
  };

  const handleSignup = (newUser: UserProfile) => {
    setAllUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveBoardId(null); // Direct landing on all cards/models
    setViewMode('poles'); // Land straight on the Pôles dashboard on signup
    setIsAuthModalOpen(false);
  };

  // Handle Card Update (server is the source of truth: roll back local state on failure)
  const handleUpdateCard = async (updatedCard: Card): Promise<void> => {
    const cardId = updatedCard.id;
    const previousCard = cards.find((c) => c.id === cardId);

    // Optimistic local update for responsiveness
    setCards((prev) => prev.map((c) => (c.id === cardId ? updatedCard : c)));
    if (selectedCard?.id === cardId) {
      setSelectedCard(updatedCard);
    }

    cardUpdatePendingRef.current[cardId] = (cardUpdatePendingRef.current[cardId] || 0) + 1;
    const release = () => {
      cardUpdatePendingRef.current[cardId] = Math.max(
        0,
        (cardUpdatePendingRef.current[cardId] || 1) - 1
      );
      // true = plus aucune mise à jour plus récente en attente pour cette carte
      return cardUpdatePendingRef.current[cardId] === 0;
    };

    const run = async () => {
      try {
        // Await the backend sync; use the server-normalized card when available
        const serverCard = await ApiService.updateCard(cardId, updatedCard, activeUser.name, activeUser.role);
        const isLatest = release();
        // Une édition plus récente a déjà été envoyée localement : ne pas
        // régresser l'état avec une réponse périmée, elle sera écrasée de toute façon.
        if (serverCard && isLatest) {
          setCards((prev) => prev.map((c) => (c.id === serverCard.id ? serverCard : c)));
          if (selectedCardIdRef.current === serverCard.id) {
            setSelectedCard(serverCard);
          }
        }
      } catch (e: any) {
        const isLatest = release();
        console.warn('[App] Update card backend sync notice:', e);
        // Roll back to avoid silent divergence between UI and database
        if (isLatest && previousCard) {
          setCards((prev) => prev.map((c) => (c.id === previousCard.id ? previousCard : c)));
          if (selectedCardIdRef.current === previousCard.id) {
            setSelectedCard(previousCard);
          }
          alert(`Échec de la synchronisation de la fiche: ${e?.message || 'Erreur serveur'}`);
        }
      }
    };

    const previous = cardUpdateChainRef.current[cardId] || Promise.resolve();
    const next = previous.then(run, run);
    cardUpdateChainRef.current[cardId] = next;
    return next;
  };

  // Dépôt de fichiers externes (explorateur / bureau) sur une carte du kanban :
  // la fiche est mise à jour localement puis synchronisée comme une édition
  // classique (upload en data-URL, historique de modifications compris).
  const handleDropFiles = async (card: Card, files: File[]) => {
    try {
      const result = await ingestFilesIntoCard(card, files, {
        name: activeUser.name,
        role: activeUser.role,
      });
      if (result.rejected.length) {
        alert(`Fichier(s) ignoré(s) :\n${result.rejected.join('\n')}`);
      }
      if (result.logs.length) {
        await handleUpdateCard(result.card);
      }
    } catch (e: any) {
      alert(`Échec de l'import du fichier : ${e?.message || 'Erreur inconnue'}`);
    }
  };

  // Handle Card Creation
  // Le board cible est choisi à l'ouverture du modal ; la carte est injectée dans
  // ses cardIds (avec rollback en cas d'échec de la persistance serveur).
  const createCardBoard = createCardBoardId
    ? boards.find((b) => b.id === createCardBoardId) || null
    : null;
  // Étapes du board ciblé : les colonnes d'un board sont ses steps personnalisées,
  // la carte doit naître sur une de ses colonnes et non sur le pipeline global.
  const createCardSteps =
    createCardBoard?.steps && createCardBoard.steps.length > 0 ? createCardBoard.steps : steps;

  const handleCreateCard = async (newCard: Card) => {
    const targetBoard = createCardBoard;
    const previousBoard = targetBoard;
    let boardPatched = false;

    if (targetBoard && !(targetBoard.cardIds || []).includes(newCard.id)) {
      const updatedBoard = { ...targetBoard, cardIds: [...(targetBoard.cardIds || []), newCard.id] };
      setBoards((prev) => prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b)));
      boardPatched = true;
      ApiService.updateBoard(updatedBoard.id, updatedBoard).catch((e) =>
        console.warn('[App] Assign card to board sync notice:', e)
      );
    }

    setCards((prev) => [newCard, ...prev]);
    try {
      const created = await ApiService.createCard(newCard);
      if (created) {
        setCards((prev) => prev.map((c) => (c.id === newCard.id ? created : c)));
      }
    } catch (e: any) {
      console.error('[App] Create card error:', e);
      setCards((prev) => prev.filter((c) => c.id !== newCard.id));
      if (boardPatched && previousBoard) {
        const restored = previousBoard;
        setBoards((prev) => prev.map((b) => (b.id === restored.id ? restored : b)));
      }
      alert(`Erreur lors de la création de la carte: ${e?.message || 'Erreur serveur'}`);
    } finally {
      setCreateCardBoardId(null);
      setCreateCardStepId(null);
    }
  };

  // Création d'une carte depuis le menu "..." d'une colonne du Kanban : le board
  // actif (et son pôle) reste la cible, seule la colonne d'arrivée change.
  const handleCreateCardInStep = (stepId: string) => {
    setCreateCardBoardId(activeBoard ? activeBoard.id : null);
    setCreateCardStepId(stepId);
    setIsCreateCardOpen(true);
  };

  // Duplicate a card: creates an exact double (same reference + modele) that the
  // user can then edit. Server normalizes sort_order and persists the copy.
  const handleDuplicateCard = (sourceCard: Card) => {
    const copyId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const cloned: Card = JSON.parse(JSON.stringify(sourceCard));
    const duplicate: Card = {
      ...cloned,
      id: copyId,
      dateCreation: new Date().toISOString(),
      sortOrder: undefined,
      archived: false,
      invitedVisitors: [],
      historyLogs: [
        {
          id: `hist-${Date.now()}-dup`,
          cardId: copyId,
          authorName: activeUser.name,
          authorRole: activeUser.role,
          action: 'Duplication de la fiche',
          details: `Doublon créé depuis la référence "${sourceCard.reference}" (${sourceCard.modele})`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    handleCreateCard(duplicate);
  };

  // Archive / restore a card (archive zone of the board in the Kanban view).
  const handleArchiveCard = (card: Card) => {
    handleUpdateCard({ ...card, archived: !card.archived });
  };

  // Archive en lot depuis le menu "..." d'une colonne du Kanban : chaque fiche
  // passe par handleUpdateCard (optimiste + rollback serveur + journal d'historique).
  // Les PUT sont enchaînés un par un pour ne pas saturer l'API sur une grosse étape.
  const handleArchiveCards = (cardsToArchive: Card[]) => {
    const count = cardsToArchive.length;
    if (count === 0) return;
    const timestamp = new Date().toISOString();
    const run = async () => {
      for (const card of cardsToArchive) {
        await handleUpdateCard({
          ...card,
          archived: true,
          historyLogs: [
            {
              id: `hist-${Date.now()}-${card.id}`,
              cardId: card.id,
              authorName: activeUser.name,
              authorRole: activeUser.role,
              action: 'Archivage groupé',
              details:
                count > 1
                  ? `Archivée avec ${count - 1} autre(s) fiche(s) depuis le menu de l'étape`
                  : `Archivée depuis le menu de l'étape`,
              timestamp,
            },
            ...card.historyLogs,
          ],
        });
      }
    };
    run();
  };

  // Delete a card (DB + memory + local state). The card is hidden from the
  // board immediately after the confirmation, and restored only if the server
  // rejects the deletion.
  const handleDeleteCard = async (cardId: string) => {
    const target = cards.find((c) => c.id === cardId);
    const previousBoards = boards;

    // Optimistic: remove from cards and from every board's regrouped cardIds so
    // the board/dropdowns update instantly.
    deletedCardIdsRef.current.add(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setBoards((prev) =>
      prev.map((b) =>
        b.cardIds.includes(cardId) ? { ...b, cardIds: b.cardIds.filter((id) => id !== cardId) } : b
      )
    );
    if (selectedCard?.id === cardId) {
      setSelectedCard(null);
    }

    try {
      await ApiService.deleteCard(cardId);
    } catch (e: any) {
      console.warn('[App] Delete card backend notice:', e);
      // Roll back to avoid divergence with the database
      deletedCardIdsRef.current.delete(cardId);
      if (target) {
        setCards((prev) => [target, ...prev.filter((c) => c.id !== cardId)]);
      }
      setBoards(previousBoards);
      alert(`Échec de la suppression de la fiche: ${e?.message || 'Erreur serveur'}`);
    }
  };

  // Visitor Invitation (Approach 1: Link-based guest access, no user account created)
  const handleInviteVisitorUser = (cardId: string, email: string, name?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    // In Approach 1, the visitor is linked directly to the card (card.invitedVisitors) and accesses via shared link.
    // No permanent user profile is added to allUsers.
    ApiService.inviteVisitor(cardId, cleanEmail, name || '', '', activeUser.name, activeUser.role).catch((e) =>
      console.warn('[App] Visitor invite backend notice:', e)
    );
  };

  const handleRemoveVisitorUser = (cardId: string, email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    ApiService.revokeVisitor(cardId, cleanEmail, activeUser.name, activeUser.role).catch((e) =>
      console.warn('[App] Visitor revoke backend notice:', e)
    );
  };

  // Temp Responsable Point Client handlers
  const handleDesignateTempResponsable = async (targetUserId: string, durationHours: number) => {
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) return;
    try {
      const updatedUser = await ApiService.designateTempResponsable(targetUserId, activeUser.id, durationHours);
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
    } catch (e: any) {
      alert(`Échec de la désignation temporaire: ${e?.message || 'Erreur serveur'}`);
    }
  };

  const handleRemoveTempResponsable = async (targetUserId: string) => {
    try {
      const updatedUser = await ApiService.removeTempResponsable(targetUserId);
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
    } catch (e: any) {
      alert(`Échec du retrait du responsable temporaire: ${e?.message || 'Erreur serveur'}`);
    }
  };

  // Move Card between steps quickly in Kanban
  const handleMoveCardStep = (cardId: string, targetStepId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const oldStep = boardSteps.find((s) => s.id === card.currentStepId)?.name || card.currentStepId;
    const newStep = boardSteps.find((s) => s.id === targetStepId)?.name || targetStepId;

    const newLog = {
      id: `hist-${Date.now()}`,
      cardId,
      authorName: activeUser.name,
      authorRole: activeUser.role,
      action: `Changement Step: ${oldStep} → ${newStep}`,
      details: `Carte déplacée via Kanban`,
      timestamp: new Date().toISOString(),
    };

    const updatedCard: Card = {
      ...card,
      currentStepId: targetStepId,
      historyLogs: [newLog, ...card.historyLogs],
    };

    handleUpdateCard(updatedCard);
  };

  // Reorder cards inside a step (vertical drag-and-drop in the Kanban column).
  const handleReorderCardsInStep = (stepId: string, orderedCardIds: string[]) => {
    const orderIndex = new Map(orderedCardIds.map((id, i) => [id, i]));
    setCards((prev) =>
      prev.map((c) => (orderIndex.has(c.id) ? { ...c, sortOrder: orderIndex.get(c.id) } : c))
    );
    ApiService.reorderCardsInStep(stepId, orderedCardIds).catch((e) =>
      console.warn('[App] Reorder backend notice:', e)
    );
  };

  // Filter cards by board, role permissions (Client, Visiteur, Commercial, etc.) & search term.
  // Archived cards are excluded from the columns/views and only shown in the board archives.
  const filteredCards = cards.filter((card) => {
    if (card.archived) return false;

    // If an active board is selected, filter strictly to its manual regrouped card IDs
    if (activeBoardId && activeBoard) {
      if (!activeBoard.cardIds.includes(card.id)) {
        return false;
      }
    }

    // Role-based visibility check (Client sees only client cards, Visiteur sees only invited cards, boards or poles)
    if (!isCardVisibleToUser(card, activeUser, null, boards, poles)) {
      return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      card.reference.toLowerCase().includes(q) ||
      card.modele.toLowerCase().includes(q) ||
      card.clientName.toLowerCase().includes(q) ||
      card.descriptionSpec.matiere.toLowerCase().includes(q)
    );
  });

  // Cartes de la vue Kanban globale ("board global") : toutes celles qui ne
  // sont rattachées à aucun board personnalisé. Le kanban global n'affiche plus
  // les cartes des boards (il sert de modèle de référence pour les étapes).
  const globalKanbanCards = filteredCards.filter((c) => !boardCardIds.has(c.id));
  const kanbanCards = activeBoardId && activeBoard ? filteredCards : globalKanbanCards;

  // Archived cards, scoped to the currently selected board when one is active.
  const archivedCards = cards.filter((card) => {
    if (card.archived !== true) return false;
    if (activeBoardId && activeBoard) {
      if (!activeBoard.cardIds.includes(card.id)) {
        return false;
      }
    }
    return isCardVisibleToUser(card, activeUser, null, boards, poles);
  });

  // Save updated steps and reassign orphan cards if a step was deleted
  const handleSaveSteps = (updatedSteps: StepDefinition[]) => {
    setSteps(updatedSteps);

    // Sync each step with backend API
    updatedSteps.forEach((s) => {
      ApiService.updateStep(s.id, s).catch((e) => console.warn('[App] Step sync notice:', e));
    });

    if (updatedSteps.length > 0) {
      const validStepIds = new Set(updatedSteps.map((s) => s.id));
      const fallbackStep = updatedSteps[0];

      setCards((prevCards) =>
        prevCards.map((card) => {
          // Cartes déjà rattachées à un board : elles utilisent les étapes
          // personnalisées du board, le modèle global ne les concerne pas.
          if (boardCardIds.has(card.id)) return card;
          if (!validStepIds.has(card.currentStepId)) {
            const reassignLog = {
              id: `hist-reassign-${Date.now()}-${Math.random()}`,
              cardId: card.id,
              authorName: currentUser?.name || 'Système',
              authorRole: currentUser?.role || 'system',
              action: `Réassignation automatique d'étape`,
              details: `L'étape associée a été supprimée du pipeline. Carte déplacée vers "${fallbackStep.name}"`,
              timestamp: new Date().toISOString(),
            };

            return {
              ...card,
              currentStepId: fallbackStep.id,
              historyLogs: [reassignLog, ...card.historyLogs],
            };
          }
          return card;
        })
      );
    }
  };

  // Save a board's own personalized steps (add / reorder / rename / delete) and
  // reassign the board's cards whose step was deleted to the new first step.
  // Persists via the boards API (steps are stored per board, not globally).
  const handleSaveBoardSteps = (boardId: string, updatedSteps: StepDefinition[]) => {
    const currentBoard = boards.find((b) => b.id === boardId);
    if (!currentBoard) return;

    const nextBoard: CustomBoard = {
      ...currentBoard,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    };
    setBoards((prev) => prev.map((b) => (b.id === boardId ? nextBoard : b)));
    ApiService.updateBoard(boardId, nextBoard).catch((e) =>
      console.warn('[App] Board steps sync notice:', e)
    );

    if (updatedSteps.length > 0) {
      const validStepIds = new Set(updatedSteps.map((s) => s.id));
      const fallbackStep = updatedSteps[0];
      const boardCardIdsSet = new Set(currentBoard.cardIds || []);
      const orphanBoardCards = cards.filter(
        (c) => boardCardIdsSet.has(c.id) && !validStepIds.has(c.currentStepId)
      );
      orphanBoardCards.forEach((card) => {
        const reassignLog = {
          id: `hist-reassign-${Date.now()}-${Math.random()}`,
          cardId: card.id,
          authorName: currentUser?.name || 'Système',
          authorRole: currentUser?.role || 'system',
          action: `Réassignation automatique d'étape`,
          details: `L'étape associée a été supprimée du board. Carte déplacée vers "${fallbackStep.name}"`,
          timestamp: new Date().toISOString(),
        };
        handleUpdateCard({ ...card, currentStepId: fallbackStep.id, historyLogs: [reassignLog, ...card.historyLogs] });
      });
    }
  };

  // Reorder the kanban columns (steps) by drag & drop: applies to the active
  // board's personalized steps, or to the global template in the global view.
  const handleReorderSteps = (orderedStepIds: string[]) => {
    if (activeBoard) {
      const ordered = orderedStepIds
        .map((id) => boardSteps.find((s) => s.id === id))
        .filter((s): s is StepDefinition => Boolean(s))
        .map((s, i) => ({ ...s, order: i + 1 }));
      handleSaveBoardSteps(activeBoard.id, ordered);
    } else {
      const ordered = orderedStepIds
        .map((id) => steps.find((s) => s.id === id))
        .filter((s): s is StepDefinition => Boolean(s))
        .map((s, i) => ({ ...s, order: i + 1 }));
      handleSaveSteps(ordered);
    }
  };

  // If user is logged out, block access to the app completely
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
        {/* Decorative background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6 max-w-md z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-xl shadow-indigo-600/40 ring-1 ring-indigo-400/30">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1.5">
            Suivi de Flux & Fiches Cartes
          </h1>
          <p className="text-xs text-slate-400">
            Accès sécurisé. Veuillez vous connecter avec votre e-mail et mot de passe pour accéder au système.
          </p>
        </div>

        <AuthModal
          isOpen={true}
          isDismissable={false}
          allUsers={allUsers}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      </div>
    );
  }

  // Pole handlers
  const handleCreatePole = (newPole: MerchPole) => {
    setPoles((prev) => [newPole, ...prev]);
    ApiService.createPole(newPole).catch((err) => console.warn('[App] Create pole sync notice:', err));
  };

  const handleUpdatePole = (updatedPole: MerchPole) => {
    setPoles((prev) => prev.map((p) => (p.id === updatedPole.id ? updatedPole : p)));
    ApiService.updatePole(updatedPole.id, updatedPole).catch((err) => console.warn('[App] Update pole sync notice:', err));

    // Synchronize boards with updated pole's boardIds (H5)
    const poleBoardIds = new Set(updatedPole.boardIds || []);
    setBoards((prevBoards) => {
      let hasChanges = false;
      const nextBoards = prevBoards.map((board) => {
        const isSelectedInPole = poleBoardIds.has(board.id);
        const wasInPole = board.poleId === updatedPole.id;
        if (isSelectedInPole && board.poleId !== updatedPole.id) {
          hasChanges = true;
          const updated = { ...board, poleId: updatedPole.id };
          ApiService.updateBoard(updated.id, updated).catch(() => {});
          return updated;
        } else if (!isSelectedInPole && wasInPole) {
          hasChanges = true;
          const { poleId: _, ...rest } = board;
          const updated: CustomBoard = { ...rest, poleId: undefined };
          ApiService.updateBoard(updated.id, updated).catch(() => {});
          return updated;
        }
        return board;
      });
      return hasChanges ? nextBoards : prevBoards;
    });
  };

  const handleDeletePole = (poleId: string) => {
    setPoles((prev) => prev.filter((p) => p.id !== poleId));
    ApiService.deletePole(poleId).catch((err) => console.warn('[App] Delete pole sync notice:', err));

    // Clear poleId on any boards associated with the deleted pole (H5)
    setBoards((prevBoards) =>
      prevBoards.map((b) => {
        if (b.poleId === poleId) {
          const { poleId: _, ...rest } = b;
          const updated: CustomBoard = { ...rest, poleId: undefined };
          ApiService.updateBoard(updated.id, updated).catch(() => {});
          return updated;
        }
        return b;
      })
    );
  };

  // Custom Board handlers
  const handleCreateBoard = (newBoard: CustomBoard, navigateToKanban?: boolean) => {
    // A new board starts with a snapshot of the global pipeline as its own
    // personalized steps list (they become fully editable afterwards).
    const withSteps: CustomBoard =
      newBoard.steps && newBoard.steps.length > 0
        ? newBoard
        : { ...newBoard, steps: JSON.parse(JSON.stringify(steps)) };
    setBoards((prev) => [withSteps, ...prev]);
    ApiService.createBoard(withSteps).catch((err) => console.warn('[App] Create board sync notice:', err));

    // Ensure the attached pole includes this board's ID in its boardIds
    if (newBoard.poleId) {
      setPoles((prev) =>
        prev.map((p) => {
          if (p.id === newBoard.poleId) {
            const currentBoardIds = p.boardIds || [];
            if (!currentBoardIds.includes(newBoard.id)) {
              const updated = { ...p, boardIds: [...currentBoardIds, newBoard.id] };
              ApiService.updatePole(updated.id, updated).catch(() => {});
              return updated;
            }
          }
          return p;
        })
      );
    }

    // Only switch to kanban if navigateToKanban is explicitly true OR if already in kanban view
    if (navigateToKanban || viewMode === 'kanban') {
      setActiveBoardId(newBoard.id);
      setViewMode('kanban');
    }
  };

  const handleUpdateBoard = (updatedBoard: CustomBoard) => {
    setBoards((prev) => {
      const exists = prev.some((b) => b.id === updatedBoard.id);
      if (!exists) {
        return [updatedBoard, ...prev];
      }
      return prev.map((b) =>
        b.id === updatedBoard.id
          ? { ...b, ...updatedBoard, steps: updatedBoard.steps && updatedBoard.steps.length > 0 ? updatedBoard.steps : b.steps }
          : b
      );
    });
    ApiService.updateBoard(updatedBoard.id, updatedBoard).catch((err) => console.warn('[App] Update board sync notice:', err));

    if (updatedBoard.poleId) {
      setPoles((prev) =>
        prev.map((p) => {
          if (p.id === updatedBoard.poleId) {
            const bIds = p.boardIds || [];
            if (!bIds.includes(updatedBoard.id)) {
              const updated = { ...p, boardIds: [...bIds, updatedBoard.id] };
              ApiService.updatePole(updated.id, updated).catch(() => {});
              return updated;
            }
            return p;
          } else {
            // Remove from other poles if pole was changed
            const bIds = p.boardIds || [];
            if (bIds.includes(updatedBoard.id)) {
              const updated = { ...p, boardIds: bIds.filter((id) => id !== updatedBoard.id) };
              ApiService.updatePole(updated.id, updated).catch(() => {});
              return updated;
            }
            return p;
          }
        })
      );
    }
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    ApiService.deleteBoard(boardId).catch((err) => console.warn('[App] Delete board sync notice:', err));
    setPoles((prev) =>
      prev.map((p) => {
        if ((p.boardIds || []).includes(boardId)) {
          const updated = {
            ...p,
            boardIds: (p.boardIds || []).filter((id) => id !== boardId),
          };
          ApiService.updatePole(updated.id, updated).catch(() => {});
          return updated;
        }
        return p;
      })
    );
    if (activeBoardId === boardId) {
      setActiveBoardId(null);
    }
  };

  const handleSelectBoard = (board: CustomBoard) => {
    setActiveBoardId(board.id);
    setSearchTerm('');
    setViewMode('kanban');
  };

  const handleGoHome = () => {
    setActiveBoardId(null);
    setSearchTerm('');
    setViewMode('list');
  };

  return (
    <LinkContextMenuProvider>
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
        }}
        onHomeClick={handleGoHome}
        activeBoardId={activeBoardId}
        currentUser={currentUser}
        allUsers={allUsers}
        onUserChange={setCurrentUser}
        onLogout={handleLogout}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
onOpenCreateCard={() => {
                            setCreateCardBoardId(activeBoardId ?? null);
                            setCreateCardStepId(null);
                            setIsCreateCardOpen(true);
        }}
        onOpenStepConfig={() => {
          setStepConfigBoard(null);
          setIsStepConfigOpen(true);
        }}
        totalCards={filteredCards.length}
      />

      {/* Banner for invited external visitors */}
      {currentUser?.role === 'visiteur' && (
        <div className="bg-amber-900 border-b border-amber-600/60 text-amber-100 px-4 py-2.5 text-xs shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-md bg-amber-500/20 text-amber-300 shrink-0">
                <Eye className="w-4 h-4" />
              </span>
              <span>
                <strong className="text-amber-200">Mode Visiteur Invité (Lecture seule) :</strong> Vous consultez en accès direct via lien e-mail (<span className="underline font-semibold">{currentUser.email}</span>). Aucun compte requis, seules les fiches partagées avec vous sont accessibles.
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-lg text-xs font-bold border border-amber-500/40 transition-colors shrink-0"
            >
              Quitter le mode visiteur
            </button>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="flex-1 py-4">
        {/* Home view selector: Tableau Liste (default) vs. global Kanban */}
        {!activeBoardId && (viewMode === 'list' || viewMode === 'kanban') && (
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-3 py-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0 pl-1">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4" />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-black text-slate-800">Accueil</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    Affichage de la page d&apos;accueil
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
                <button
                  type="button"
                  id="home-view-list"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                  }`}
                  title="Tableau Liste : affichage par défaut de l'accueil"
                >
                  <List className="w-3.5 h-3.5" />
                  Tableau Liste
                </button>
                <button
                  type="button"
                  id="home-view-kanban"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'kanban'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                  }`}
                  title="Vue Kanban générale : tous les modèles sur un seul tableau"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Vue Kanban Générale
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'kanban' ? (
          <div className="relative min-h-[calc(100vh-120px)]">
            {/* Immersive Full View Background Image for Kanban (Global or Custom Board) */}
            {(activeBoard?.backgroundImage || kanbanBackground) && (
              <div className="fixed inset-0 top-16 pointer-events-none z-0 overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center bg-fixed transition-all duration-700 animate-in fade-in duration-500"
                  style={{ backgroundImage: `url(${activeBoard?.backgroundImage || kanbanBackground})` }}
                />
              </div>
            )}

            <div className={`relative space-y-3 ${isBoardSelectorOpen ? 'z-50' : 'z-10'}`}>
              {/* Kanban Top Bar with Board Selector, Switcher & Background Customizer */}
              <div className={`max-w-7xl mx-auto px-4 sm:px-6 relative ${isBoardSelectorOpen ? 'z-50' : 'z-20'}`}>
                <div className={`relative px-4 py-2 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-md flex flex-wrap items-center justify-between gap-3 transition-all ${isBoardSelectorOpen ? 'z-50' : ''}`}>
                  {/* Left: Board Selector Dropdown */}
                  <div ref={boardSelectorRef} className="relative z-50">
                    <button
                      type="button"
                      onClick={() => setIsBoardSelectorOpen(!isBoardSelectorOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer group"
                      title="Changer de board ou voir tous les modèles"
                    >
                      <div className="w-5 h-5 rounded-md bg-indigo-500/30 text-indigo-300 flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[9.5px] text-slate-400 font-medium leading-none mb-0.5">Board Kanban</p>
                        <p className="text-xs font-black break-words whitespace-normal leading-tight text-white">
                          {activeBoard ? activeBoard.title : 'Vue Globale (Tous les modèles)'}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isBoardSelectorOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Popover Menu for selecting boards */}
                    {isBoardSelectorOpen && (
                      <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-2.5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="px-2 pt-1 pb-1.5 flex items-center justify-between border-b border-slate-100">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Sélectionner un Board
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {visibleBoards.length} board{visibleBoards.length > 1 ? 's' : ''} disponible{visibleBoards.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Search input for boards */}
                          {visibleBoards.length > 3 && (
                            <div className="px-1">
                              <input
                                type="text"
                                placeholder="Rechercher parmi vos boards..."
                                value={boardSearchQuery}
                                onChange={(e) => setBoardSearchQuery(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          )}

                          <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin px-1">
                            {/* Option: Global View */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBoardId(null);
                                setIsBoardSelectorOpen(false);
                              }}
                              className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                                !activeBoardId
                                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                                  : 'hover:bg-slate-100 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                  <LayoutGrid className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">Vue Kanban Globale</p>
                                  <p className="text-[10px] text-slate-500 truncate">Board global ({globalKanbanCards.length} modèle{globalKanbanCards.length > 1 ? 's' : ''})</p>
                                </div>
                              </div>
                              {!activeBoardId && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                            </button>

                            {/* List of custom boards */}
                            {visibleBoards
                              .filter((b) =>
                                !boardSearchQuery.trim() ||
                                b.title.toLowerCase().includes(boardSearchQuery.toLowerCase().trim())
                              )
                              .map((b) => {
                                const isSelected = activeBoardId === b.id;
                                const pole = poles.find((p) => p.id === b.poleId);
                                const count = cards.filter((c) => b.cardIds.includes(c.id)).length;

                                return (
                                  <div
                                    key={b.id}
                                    data-link-entity="board"
                                    data-link-id={b.id}
                                    data-link-label={`Board — ${b.title}`}
                                    className={`w-full p-2 rounded-xl flex items-center justify-between transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                                        : 'hover:bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveBoardId(b.id);
                                        setIsBoardSelectorOpen(false);
                                      }}
                                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                                        <Layers className="w-4 h-4 text-indigo-300" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold break-words whitespace-normal leading-tight text-slate-900">{b.title}</p>
                                        <p className="text-[10px] text-slate-500 break-words leading-tight">
                                          {pole ? getPoleTitle(pole, allUsers) : 'Pôle Commercial'} • {count} modèle{count > 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      {canUserCreateOrEditCards(activeUser) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsBoardSelectorOpen(false);
                                            setEditingBoard(b);
                                            setIsBoardModalOpen(true);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                                          title="Modifier ce board"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Footer Action: Create New Board */}
                          {canUserCreateOrEditCards(activeUser) && (
                            <div className="pt-1.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsBoardSelectorOpen(false);
                                  setEditingBoard({ id: '', title: '', cardIds: [], poleId: poles[0]?.id || '', createdAt: '' } as CustomBoard);
                                  setIsBoardModalOpen(true);
                                }}
                                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Créer un Nouveau Board</span>
                              </button>
                            </div>
                          )}
                        </div>
                    )}
                  </div>

                  {/* Middle: Count and Active Board Tag */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10.5px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 shadow-2xs">
                      {kanbanCards.length} modèle{kanbanCards.length > 1 ? 's' : ''} affiché{kanbanCards.length > 1 ? 's' : ''}
                    </span>

                    {/* Archives zone: one environment per board (visible in the Kanban top bar that holds the board title) */}
                    <button
                      type="button"
                      onClick={() => setIsArchivesModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors cursor-pointer"
                      title={`Afficher les fiches archivées de ${activeBoard ? `ce board (${activeBoard.title})` : 'tous les boards'}`}
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                      Archives
                      {archivedCards.length > 0 && (
                        <span className={`px-1.5 rounded-full text-[10px] font-black ${archivedCards.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {archivedCards.length}
                        </span>
                      )}
                    </button>

                    {activeBoard && (
                      <button
                        type="button"
                        onClick={() => setActiveBoardId(null)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2 py-0.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
                        title="Revenir à l'affichage de tous les modèles"
                      >
                        <X className="w-3 h-3" />
                        <span>Tous les modèles</span>
                      </button>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeBoard && (
                      <button
                        type="button"
                        onClick={handleCopyBoardLink}
                        className={`w-[34px] h-[34px] flex items-center justify-center rounded-xl border text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                          boardLinkCopied
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                        title={boardLinkCopied ? 'Lien copié !' : "Copier le lien direct de ce board (y aller directement en un clic, pour mail, SMS, .txt…)"}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {activeBoard && canUserCreateOrEditCards(activeUser) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStepConfigBoard(activeBoard);
                          setIsStepConfigOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Personnaliser les étapes de ce board (ajouter, réordonner par glisser-déposer)"
                      >
                        <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                        Étapes
                      </button>
                    )}

                    {activeBoard && canUserCreateOrEditCards(activeUser) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBoard(activeBoard);
                          setIsBoardModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Modifier les réglages, le titre ou les modèles de ce board"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Modifier</span> Board
                      </button>
                    )}

                    {canUserCreateOrEditCards(activeUser) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreateCardBoardId(activeBoard ? activeBoard.id : null);
                          setCreateCardStepId(null);
                          setIsCreateCardOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        title={
                          activeBoard
                            ? `Créer une nouvelle carte dans le board « ${activeBoard.title} »`
                            : 'Créer une nouvelle carte (vue globale)'
                        }
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nouvelle carte
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsKanbanBgModalOpen(true)}
                      className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Changer le fond d'écran"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Fond d'écran</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative z-0">
                <KanbanBoard
                  cards={kanbanCards}
                  steps={boardSteps}
                  currentUser={activeUser}
                  allUsers={allUsers}
                  onCardClick={setSelectedCard}
                  onMoveCardStep={handleMoveCardStep}
                  onReorderCardsInStep={handleReorderCardsInStep}
                  onReorderSteps={handleReorderSteps}
                  onDropFiles={handleDropFiles}
                  onCreateCardInStep={handleCreateCardInStep}
                  onArchiveCards={handleArchiveCards}
                />
              </div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <CardListView
            cards={filteredCards}
            steps={steps}
            allUsers={allUsers}
            onCardClick={setSelectedCard}
          />
        ) : viewMode === 'poles' ? (
          <PolesView
            poles={poles.filter((pole) => isPoleVisibleToUser(pole, activeUser, null, boards, cards))}
            boards={boards.filter((board) => isBoardVisibleToUser(board, activeUser, null, poles, cards))}
            cards={cards.filter((card) => !card.archived && isCardVisibleToUser(card, activeUser, null, boards, poles))}
            steps={steps}
            allUsers={allUsers}
            currentUser={activeUser}
            onCardClick={(card) => {
              setSelectedCard(null);
              setActiveBoardId(null);
              setSearchTerm(card.reference);
              setViewMode('kanban');
            }}
            onCreatePole={handleCreatePole}
            onUpdatePole={handleUpdatePole}
            onDeletePole={handleDeletePole}
            onCreateBoard={handleCreateBoard}
            onUpdateBoard={handleUpdateBoard}
            onDeleteBoard={handleDeleteBoard}
            onSelectBoard={handleSelectBoard}
            poleDeepLinkId={poleDeepLinkId}
          />
        ) : viewMode === 'clients' ? (
          <ClientsView
            cards={filteredCards}
            steps={steps}
            allUsers={allUsers}
            currentUser={activeUser}
            onCardClick={setSelectedCard}
            onRenameClientInCards={(oldName, newName) =>
              setCards((prev) =>
                prev.map((c) =>
                  c.clientName.toLowerCase().trim() === oldName.toLowerCase().trim()
                    ? { ...c, clientName: newName }
                    : c
                )
              )
            }
          />
        ) : (
          <DirectionView
            cards={filteredCards}
            steps={steps}
            allUsers={allUsers}
            onCardClick={setSelectedCard}
          />
        )}
      </main>

      {/* Board Archives Modal (per-board archive zone visible in the Kanban top bar) */}
      {isArchivesModalOpen && (
        <ArchivesModal
          cards={archivedCards}
          steps={steps}
          currentUser={activeUser}
          activeBoard={activeBoard}
          onClose={() => setIsArchivesModalOpen(false)}
          onCardClick={setSelectedCard}
          onToggleArchive={handleArchiveCard}
          onDeleteCard={handleDeleteCard}
        />
      )}

      {/* Card Identity Modal ("Fiche identitaire de la carte") */}
      {selectedCard && (
        <CardIdentityModal
          card={selectedCard}
          allCards={cards}
          steps={steps}
          allUsers={allUsers}
          currentUser={activeUser}
          onClose={() => setSelectedCard(null)}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onDuplicateCard={handleDuplicateCard}
          onArchiveCard={handleArchiveCard}
          onInviteVisitorUser={handleInviteVisitorUser}
          onRemoveVisitorUser={handleRemoveVisitorUser}
          onDesignateTempResponsable={handleDesignateTempResponsable}
          onRemoveTempResponsable={handleRemoveTempResponsable}
        />
      )}

      {/* Pipeline Step Configuration Modal (global template OR active board's personalized steps) */}
      {isStepConfigOpen && (
        <StepConfigModal
          steps={
            stepConfigBoard && stepConfigBoard.steps && stepConfigBoard.steps.length > 0
              ? stepConfigBoard.steps
              : steps
          }
          scopeLabel={
            stepConfigBoard ? `Board « ${stepConfigBoard.title} »` : 'Pipeline global (modèle Kanban)'
          }
          onClose={() => {
            setIsStepConfigOpen(false);
            setStepConfigBoard(null);
          }}
          onSaveSteps={(updated) => {
            if (stepConfigBoard) {
              handleSaveBoardSteps(stepConfigBoard.id, updated);
            } else {
              handleSaveSteps(updated);
            }
          }}
        />
      )}

      {/* Create Card Modal */}
      {isCreateCardOpen && (
        <CreateCardModal
          steps={createCardSteps}
          allUsers={allUsers}
          currentUser={activeUser}
          existingCards={cards}
          initialStepId={createCardStepId ?? undefined}
          onClose={() => {
            setIsCreateCardOpen(false);
            setCreateCardBoardId(null);
            setCreateCardStepId(null);
          }}
          onCreateCard={handleCreateCard}
        />
      )}

      {/* Auth / Login / Signup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        allUsers={allUsers}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />

      {/* User Profile & Avatar Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={activeUser}
          allUsers={allUsers}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* Kanban Background Picker Modal */}
      <KanbanBackgroundModal
        isOpen={isKanbanBgModalOpen}
        onClose={() => setIsKanbanBgModalOpen(false)}
        currentBackground={kanbanBackground}
        onSaveBackground={(bg) => setKanbanBackground(bg)}
      />

      {/* Board Modal (Globally Accessible) */}
      {isBoardModalOpen && (
        <BoardModal
          isOpen={isBoardModalOpen}
          board={editingBoard}
          boards={boards}
          cards={cards}
          steps={steps}
          allUsers={allUsers}
          currentUser={activeUser}
          poles={poles}
          onClose={() => {
            setIsBoardModalOpen(false);
            setEditingBoard(null);
          }}
          onSaveBoard={(savedBoard) => {
            if (editingBoard && editingBoard.id) {
              handleUpdateBoard(savedBoard);
            } else {
              handleCreateBoard(savedBoard);
            }
          }}
          onDeleteBoard={handleDeleteBoard}
        />
      )}
    </div>
    </LinkContextMenuProvider>
  );
}

