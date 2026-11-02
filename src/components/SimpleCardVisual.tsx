import React from 'react';
import { SimpleVisual } from '../types';
import { MessageSquare, FileText, Sparkles, Image as ImageIcon } from 'lucide-react';

interface SimpleCardVisualProps {
  visual?: SimpleVisual;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BG_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
  slate: { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-800' },
};

export const SimpleCardVisual: React.FC<SimpleCardVisualProps> = ({
  visual,
  title = '',
  size = 'md',
  className = '',
}) => {
  const colorKey = visual?.bgColor && BG_COLOR_MAP[visual.bgColor] ? visual.bgColor : 'indigo';
  const theme = BG_COLOR_MAP[colorKey];

  const heightClass =
    size === 'sm' ? 'h-16' : size === 'lg' ? 'h-28' : 'h-20';

  if (!visual || !visual.content) {
    return (
      <div
        className={`w-full ${heightClass} rounded-md border border-dashed border-slate-200 bg-slate-50/80 flex flex-col items-center justify-center text-slate-400 p-1.5 ${className}`}
      >
        <FileText className="w-5 h-5 opacity-40 mb-0.5" />
        <span className="text-[9px] font-medium opacity-60">Note simple</span>
      </div>
    );
  }

  // 1. Emoji Visual
  if (visual.type === 'emoji') {
    const emojiSizeClass = size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-3xl';
    return (
      <div
        className={`w-full ${heightClass} rounded-md border ${theme.border} ${theme.bg} flex items-center justify-center shadow-2xs relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02] ${className}`}
      >
        <span className={`${emojiSizeClass} select-none drop-shadow-xs transition-transform duration-200 group-hover:scale-110`}>
          {visual.content}
        </span>
      </div>
    );
  }

  // 2. Short Message Visual
  if (visual.type === 'message') {
    const textSize = size === 'sm' ? 'text-[9.5px]' : 'text-[11px]';
    return (
      <div
        className={`w-full ${heightClass} rounded-md border ${theme.border} ${theme.bg} p-2 flex flex-col justify-center items-center text-center shadow-2xs relative overflow-hidden transition-all group-hover:shadow-xs ${className}`}
      >
        <MessageSquare className={`w-3 h-3 ${theme.text} opacity-50 mb-0.5 shrink-0`} />
        <p className={`${textSize} font-semibold ${theme.text} leading-snug line-clamp-3 italic break-words`}>
          « {visual.content} »
        </p>
      </div>
    );
  }

  // 3. Photo or GIF Visual
  return (
    <div
      className={`w-full ${heightClass} rounded-md border border-slate-200/90 bg-white/90 p-0.5 flex items-center justify-center relative overflow-hidden shadow-2xs ${className}`}
    >
      <img
        src={visual.content}
        alt={title || 'Visuel carte simple'}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain rounded transition-transform duration-300 group-hover:scale-105"
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.currentTarget;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="flex flex-col items-center justify-center text-slate-400 text-[9px] gap-0.5 w-full h-full bg-slate-50">
                <span class="text-xs">⚠️</span>
                <span>Image indisponible</span>
              </div>
            `;
          }
        }}
      />
      {visual.type === 'gif' && (
        <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-white font-extrabold text-[7.5px] uppercase tracking-wider backdrop-blur-xs">
          GIF
        </span>
      )}
    </div>
  );
};
