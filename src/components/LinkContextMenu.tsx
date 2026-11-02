import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getEntityDeepLink } from '../utils/appUrl';
import { ExternalLink, Maximize2, SquareSplitHorizontal, Copy, Check, Link2 } from 'lucide-react';

export type LinkEntityType = 'card' | 'board' | 'pole';

interface LinkMenuState {
  url: string;
  label: string;
  x: number;
  y: number;
}

const MENU_WIDTH = 300;
const MENU_HEIGHT = 208;
const EDGE_GAP = 8;

function clampX(x: number) {
  return Math.min(Math.max(x, EDGE_GAP), window.innerWidth - MENU_WIDTH - EDGE_GAP);
}

function clampY(y: number) {
  return Math.min(Math.max(y, EDGE_GAP), window.innerHeight - MENU_HEIGHT - EDGE_GAP);
}

/**
 * Best-effort clipboard write with a textarea/execCommand fallback for
 * insecure (HTTP) contexts where navigator.clipboard is unavailable.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Global right-click menu for cards, boards and poles.
 *
 * Any element annotated with `data-link-entity="card|board|pole"` and
 * `data-link-id="<id>"` (optionally `data-link-label="<label>"`) opens this
 * menu on right-click. No prop drilling is required.
 */
export const LinkContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LinkMenuState | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setState(null);
    setCopied(false);
  }, []);

  // Detect right-click on a linked entity anywhere in the document.
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Keep the native browser menu inside form controls.
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

      const host = target.closest('[data-link-entity]') as HTMLElement | null;
      if (!host) return;

      const type = host.dataset.linkEntity as LinkEntityType | undefined;
      const id = host.dataset.linkId;
      if (!type || !id) return;

      e.preventDefault();

      setCopied(false);
      setState({
        url: getEntityDeepLink(type, id),
        label: host.dataset.linkLabel || '',
        x: clampX(e.clientX),
        y: clampY(e.clientY),
      });
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => document.removeEventListener('contextmenu', handleContextMenu, true);
  }, []);

  // Close on outside pointer, on scroll or on viewport resize.
  useEffect(() => {
    if (!state) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      close();
    };
    const handleClose = () => close();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    window.addEventListener('blur', handleClose);
    window.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('blur', handleClose);
      window.removeEventListener('keydown', handleKey);
    };
  }, [state, close]);

  const openInNewTab = useCallback(() => {
    if (!state) return;
    window.open(state.url, '_blank', 'noopener,noreferrer');
    close();
  }, [state, close]);

  const openInNewWindow = useCallback(() => {
    if (!state) return;
    const width = Math.min(1180, Math.round(window.screen.availWidth * 0.7));
    const height = Math.min(860, Math.round(window.screen.availHeight * 0.75));
    const left = Math.round((window.screen.availWidth - width) / 2);
    const top = Math.round((window.screen.availHeight - height) / 2);
    const features = [
      'popup=yes',
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'location=yes',
      'status=no',
    ].join(',');

    const win = window.open(state.url, `atl-${Date.now()}`, features);
    if (!win) window.open(state.url, '_blank', 'noopener,noreferrer');
    close();
  }, [state, close]);

  const openInSplitView = useCallback(() => {
    if (!state) return;
    // Half-screen window (left pane) — the closest web equivalent of the
    // browser "split view": a resizable side-by-side window on the same page.
    const width = Math.max(320, Math.floor(window.screen.availWidth / 2));
    const height = window.screen.availHeight;
    const features = [
      'popup=yes',
      `width=${width}`,
      `height=${height}`,
      'left=0',
      'top=0',
      'toolbar=no',
      'menubar=no',
      'location=yes',
      'status=no',
    ].join(',');

    const win = window.open(state.url, `atl-split-${Date.now()}`, features);
    if (win) {
      try {
        win.moveTo(0, 0);
        win.resizeTo(width, height);
      } catch {
        // Position/size restrictions are browser-dependent: ignore.
      }
    } else {
      window.open(state.url, '_blank', 'noopener,noreferrer');
    }
    close();
  }, [state, close]);

  const handleCopy = useCallback(() => {
    if (!state) return;
    void copyText(state.url).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(close, 1400);
      }
    });
  }, [state, close]);

  const items = [
    { key: 'tab', label: 'Ouvrir le lien dans un nouvel onglet', icon: ExternalLink, onClick: openInNewTab },
    { key: 'window', label: 'Ouvrir le lien dans une nouvelle fenêtre', icon: Maximize2, onClick: openInNewWindow },
    { key: 'split', label: 'Ouvrir le lien en vue fractionnée', icon: SquareSplitHorizontal, onClick: openInSplitView },
    { key: 'copy', label: "Copier l'adresse du lien", icon: copied ? Check : Copy, onClick: handleCopy },
  ];

  return (
    <>
      {children}

      {state && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Actions sur le lien"
          className="link-context-menu fixed z-[9999] w-[300px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15"
          style={{ left: state.x, top: state.y }}
        >
          {state.label && (
            <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-2 border-b border-slate-100 mb-1 min-w-0">
              <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 truncate">{state.label}</span>
            </div>
          )}

          {items.map(({ key, label, icon: Icon, onClick }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={onClick}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-medium transition-colors ${
                key === 'copy'
                  ? copied
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${key === 'copy' && copied ? 'text-emerald-600' : 'text-slate-400'}`}
              />
              <span className="truncate">{label}</span>
            </button>
          ))}

          <div className="mt-1 px-2.5 pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 truncate font-mono" title={state.url}>
              {state.url}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default LinkContextMenuProvider;
