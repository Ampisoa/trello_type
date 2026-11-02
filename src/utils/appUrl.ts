/**
 * Utilitaire pour déterminer l'URL publique propre de l'application
 * Évite de générer des liens avec 'aistudio.google.com' si l'app est prévisualisée dans un iframe
 */
export function getPublicAppUrl(): string {
  // 1. Priorité à l'URL publique configurée dans l'environnement (ex: domaine Cloudflare)
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  const envUrl = (metaEnv?.VITE_PUBLIC_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. Si on est dans un navigateur standard
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const pathname = window.location.pathname;

    // Si par hasard l'origin est aistudio.google.com, fallback sur l'origine actuelle
    return `${origin}${pathname}`;
  }

  return '';
}

/**
 * Génère un lien direct partageable (e-mail, SMS, .txt, chat…) qui ouvre
 * l'application directement sur l'entité visée : une carte, un board ou un pôle.
 * Utilisé par les utilisateurs connectés : au clic, l'app navigue vers l'entité.
 */
export function getEntityDeepLink(type: 'card' | 'board' | 'pole', id: string): string {
  const paramName = type === 'card' ? 'card_id' : type === 'board' ? 'board_id' : 'pole_id';
  return `${getPublicAppUrl()}?${paramName}=${encodeURIComponent(id)}`;
}
