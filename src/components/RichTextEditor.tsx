import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  AtSign,
  Smile,
  Type,
  Upload,
  Eye,
  Edit3,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { UserProfile } from '../types';
import { FormattedText } from './FormattedText';

interface RichTextEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  minRows?: number;
  isDark?: boolean;
  disabled?: boolean;
  users?: UserProfile[];
  hideMentions?: boolean;
  label?: string;
  id?: string;
  onKeyDownSubmit?: () => void;
  fillHeight?: boolean;
  className?: string;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Réactions & Essentiels',
    emojis: ['👍', '👏', '❤️', '🎉', '🔥', '✨', '🚀', '💯', '👌', '🙌'],
  },
  {
    name: 'Mode, Textile & Atelier',
    emojis: ['👗', '🧵', '🪡', '✂️', '👔', '👠', '👜', '🎨', '📐', '📦'],
  },
  {
    name: 'Statuts, Validation & Alertes',
    emojis: ['✅', '⏳', '⚠️', '🚨', '📌', '💡', '💬', '👀', '🎯', '⭐'],
  },
];

const FONT_OPTIONS = [
  { id: 'sans', label: 'Paragraphe standard', prefix: '', wrapper: null },
  { id: 'h1', label: 'Titre Principal (H1)', prefix: '# ', wrapper: null },
  { id: 'h2', label: 'Sous-Titre (H2)', prefix: '## ', wrapper: null },
  { id: 'h3', label: 'En-tête section (H3)', prefix: '### ', wrapper: null },
  { id: 'quote', label: 'Bloc Citation', prefix: '> ', wrapper: null },
  { id: 'serif', label: 'Élégant / Serif', prefix: '', wrapper: ['[font:serif]', '[/font]'] as [string, string] },
  { id: 'mono', label: 'Technique / Monospace', prefix: '', wrapper: ['[font:mono]', '[/font]'] as [string, string] },
  { id: 'cursive', label: 'Cursive / Signature', prefix: '', wrapper: ['[font:cursive]', '[/font]'] as [string, string] },
  { id: 'display', label: 'Display Majuscule', prefix: '', wrapper: ['[font:display]', '[/font]'] as [string, string] },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Saisissez votre texte...',
  minRows = 3,
  isDark = false,
  disabled = false,
  users = [],
  hideMentions = false,
  label,
  id,
  onKeyDownSubmit,
  fillHeight = false,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');

  // Persistent Active Formatting States (Highlighted on click until toggled off)
  const [isBulletListActive, setIsBulletListActive] = useState(false);
  const [isNumberedListActive, setIsNumberedListActive] = useState(false);
  const [activeFontId, setActiveFontId] = useState<string>('sans');

  // Popovers & Modal states
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Link Modal inputs
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Image Modal inputs
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rte-popover-container')) {
        setShowFontMenu(false);
        setShowEmojiPicker(false);
        setShowMentionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Sync active states with cursor position in textarea
  const updateActiveStatesFromCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const beforeCursor = text.substring(0, start);
    const afterCursor = text.substring(end);

    // Check current line prefix (Lists, Headings, Quotes)
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', start);
    const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

    if (/^[-*•]\s+/.test(currentLine.trim())) {
      setIsBulletListActive(true);
      setIsNumberedListActive(false);
    } else if (/^\d+\.\s+/.test(currentLine.trim())) {
      setIsNumberedListActive(true);
      setIsBulletListActive(false);
    } else {
      setIsBulletListActive(false);
      setIsNumberedListActive(false);
    }

    // 2. Check active font style
    if (currentLine.startsWith('# ')) {
      setActiveFontId('h1');
    } else if (currentLine.startsWith('## ')) {
      setActiveFontId('h2');
    } else if (currentLine.startsWith('### ')) {
      setActiveFontId('h3');
    } else if (currentLine.startsWith('> ')) {
      setActiveFontId('quote');
    } else if (beforeCursor.includes('[font:serif]') && afterCursor.includes('[/font]')) {
      setActiveFontId('serif');
    } else if (beforeCursor.includes('[font:mono]') && afterCursor.includes('[/font]')) {
      setActiveFontId('mono');
    } else if (beforeCursor.includes('[font:cursive]') && afterCursor.includes('[/font]')) {
      setActiveFontId('cursive');
    } else if (beforeCursor.includes('[font:display]') && afterCursor.includes('[/font]')) {
      setActiveFontId('display');
    } else {
      setActiveFontId('sans');
    }
  }, []);

  // TOGGLE BULLET LIST (PERSISTENT CLICK)
  const handleToggleBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = value;

    const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentText.indexOf('\n', end);
    const actualLineEnd = lineEnd === -1 ? currentText.length : lineEnd;
    const lines = currentText.substring(lineStart, actualLineEnd).split('\n');

    const areAllBullet = lines.every((l) => /^[-*•]\s+/.test(l.trim()));

    if (areAllBullet) {
      // Remove bullets
      const modifiedLines = lines.map((l) => l.replace(/^[-*•]\s+/, '')).join('\n');
      const newText = currentText.substring(0, lineStart) + modifiedLines + currentText.substring(actualLineEnd);
      onChange(newText);
      setIsBulletListActive(false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineStart + modifiedLines.length);
      }, 10);
    } else {
      // Add bullets to all lines
      const modifiedLines = lines
        .map((l) => {
          const clean = l.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
          return `- ${clean}`;
        })
        .join('\n');
      const newText = currentText.substring(0, lineStart) + modifiedLines + currentText.substring(actualLineEnd);
      onChange(newText);
      setIsBulletListActive(true);
      setIsNumberedListActive(false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineStart + modifiedLines.length);
      }, 10);
    }
  };

  // TOGGLE NUMBERED LIST (PERSISTENT CLICK WITH SEQUENTIAL NUMBERS 1., 2., 3., etc.)
  const handleToggleNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = value;

    const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentText.indexOf('\n', end);
    const actualLineEnd = lineEnd === -1 ? currentText.length : lineEnd;
    const lines = currentText.substring(lineStart, actualLineEnd).split('\n');

    const areAllNumbered = lines.every((l) => /^\d+\.\s+/.test(l.trim()));

    if (areAllNumbered) {
      // Remove numbering and restore standard lines
      const modifiedLines = lines.map((l) => l.replace(/^\d+\.\s+/, '')).join('\n');
      const newText = currentText.substring(0, lineStart) + modifiedLines + currentText.substring(actualLineEnd);
      onChange(newText);
      setIsNumberedListActive(false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineStart + modifiedLines.length);
      }, 10);
    } else {
      // Find starting number if previous line before selection was already numbered
      let startNumber = 1;
      if (lineStart > 0) {
        const prevText = currentText.substring(0, lineStart - 1);
        const prevLineStart = prevText.lastIndexOf('\n') + 1;
        const prevLine = prevText.substring(prevLineStart).trim();
        const prevMatch = prevLine.match(/^(\d+)\.\s+/);
        if (prevMatch) {
          startNumber = parseInt(prevMatch[1], 10) + 1;
        }
      }

      // Add consecutive incremental numbers (1., 2., 3., 4...) to each line
      const modifiedLines = lines
        .map((l, idx) => {
          const clean = l.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
          return `${startNumber + idx}. ${clean}`;
        })
        .join('\n');

      const newText = currentText.substring(0, lineStart) + modifiedLines + currentText.substring(actualLineEnd);
      onChange(newText);
      setIsNumberedListActive(true);
      setIsBulletListActive(false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineStart + modifiedLines.length);
      }, 10);
    }
  };

  // SELECT OR TOGGLE FONT STYLE (PERSISTENT)
  const handleSelectFontStyle = (fontOpt: (typeof FONT_OPTIONS)[0]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = value;

    // If clicking the currently active font, return to normal standard sans-serif
    if (activeFontId === fontOpt.id && fontOpt.id !== 'sans') {
      setActiveFontId('sans');
      setShowFontMenu(false);
      const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = currentText.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? currentText.length : lineEnd;
      const line = currentText.substring(lineStart, actualLineEnd);
      const cleanLine = line.replace(/^(#+\s+|> )/, '');
      const newText = currentText.substring(0, lineStart) + cleanLine + currentText.substring(actualLineEnd);
      onChange(newText);
      return;
    }

    setActiveFontId(fontOpt.id);
    setShowFontMenu(false);

    if (fontOpt.prefix) {
      const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = currentText.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? currentText.length : lineEnd;
      const line = currentText.substring(lineStart, actualLineEnd);
      const cleanLine = line.replace(/^(#+\s+|> )/, '');
      const formattedLine = `${fontOpt.prefix}${cleanLine}`;
      const newText = currentText.substring(0, lineStart) + formattedLine + currentText.substring(actualLineEnd);
      onChange(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + fontOpt.prefix.length, lineStart + formattedLine.length);
      }, 10);
    } else if (fontOpt.wrapper) {
      const selected = currentText.substring(start, end) || 'texte stylisé';
      const formatted = `${fontOpt.wrapper[0]}${selected}${fontOpt.wrapper[1]}`;
      const newText = currentText.substring(0, start) + formatted + currentText.substring(end);
      onChange(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + fontOpt.wrapper[0].length,
          start + fontOpt.wrapper[0].length + selected.length
        );
      }, 10);
    }
  };

  // Keyboard Shortcuts & Smart Consecutive Numbering on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isModifier = isMac ? e.metaKey : e.ctrlKey;

    // Submit Shortcut: Ctrl+Enter
    if (isModifier && e.key === 'Enter') {
      if (onKeyDownSubmit) {
        e.preventDefault();
        onKeyDownSubmit();
      }
      return;
    }

    // Direct @ trigger for mentions
    if (e.key === '@' && !hideMentions) {
      setShowMentionPicker(true);
    }

    // Smart Enter in Lists (Consecutive incremental numbering & bullet continuation)
    if (e.key === 'Enter' && !isModifier) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const currentText = value;
      const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
      const line = currentText.substring(lineStart, start);

      // 1. Numbered list: Automatically generate the NEXT consecutive number (1. -> 2. -> 3...)
      const numMatch = line.match(/^(\d+)\.\s*(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const currentNum = parseInt(numMatch[1], 10);
        const itemContent = numMatch[2].trim();

        if (itemContent === '') {
          // If user pressed enter on an empty numbered item "3. ", remove it and return to normal paragraph
          const newText = currentText.substring(0, lineStart) + currentText.substring(start);
          onChange(newText);
          setIsNumberedListActive(false);
          setTimeout(() => {
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart;
          }, 10);
        } else {
          // Add the next consecutive number (e.g., "2. ", "3. ")
          const nextPrefix = `\n${currentNum + 1}. `;
          const newText = currentText.substring(0, start) + nextPrefix + currentText.substring(start);
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = start + nextPrefix.length;
            textarea.selectionEnd = start + nextPrefix.length;
          }, 10);
        }
        return;
      }

      // 2. Bullet list continuation
      if (/^[-*•]\s*/.test(line)) {
        e.preventDefault();
        const cleanContent = line.replace(/^[-*•]\s*/, '').trim();

        if (cleanContent === '') {
          // Empty bullet item -> exit list
          const newText = currentText.substring(0, lineStart) + currentText.substring(start);
          onChange(newText);
          setIsBulletListActive(false);
          setTimeout(() => {
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = lineStart;
          }, 10);
        } else {
          // Continue bullet list
          const nextPrefix = '\n- ';
          const newText = currentText.substring(0, start) + nextPrefix + currentText.substring(start);
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = start + nextPrefix.length;
            textarea.selectionEnd = start + nextPrefix.length;
          }, 10);
        }
        return;
      }
    }
  };

  // Insert Mention (@)
  const handleInsertMention = (user: UserProfile) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const mentionTag = `@${user.name} `;
    const newText = value.substring(0, start) + mentionTag + value.substring(start);
    onChange(newText);
    setShowMentionPicker(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + mentionTag.length, start + mentionTag.length);
    }, 10);
  };

  // Insert Emoji
  const handleInsertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + `${emoji} ` + value.substring(start);
    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length + 1, start + emoji.length + 1);
    }, 10);
  };

  // Confirm Link / File
  const handleConfirmLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const title = linkTitle.trim() || linkUrl.trim();
    const tag = `[${title}](${linkUrl.trim()})`;
    const newText = value.substring(0, start) + tag + value.substring(start);
    onChange(newText);
    setLinkTitle('');
    setLinkUrl('');
    setShowLinkModal(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Confirm Image
  const handleConfirmImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const alt = imageAlt.trim() || 'Image';
    const tag = `\n![${alt}](${imageUrl.trim()})\n`;
    const newText = value.substring(0, start) + tag + value.substring(start);
    onChange(newText);
    setImageUrl('');
    setImageAlt('');
    setShowImageModal(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Direct Image File Upload
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const tag = `\n![${file.name}](${dataUrl})\n`;
      const newText = value.substring(0, start) + tag + value.substring(start);
      onChange(newText);
      setShowImageModal(false);
    };
    reader.readAsDataURL(file);
  };

  // Direct Document File Upload
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const tag = `[📎 ${file.name}](${dataUrl})`;
      const newText = value.substring(0, start) + tag + value.substring(start);
      onChange(newText);
      setShowLinkModal(false);
    };
    reader.readAsDataURL(file);
  };

  // Get current active font display label
  const currentFontOption = FONT_OPTIONS.find((f) => f.id === activeFontId) || FONT_OPTIONS[0];

  return (
    <div
      id={id}
      className={`rte-container rounded-xl border transition-all ${
        isDark
          ? 'bg-slate-900 border-slate-700/90 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${fillHeight ? 'flex flex-col ' : ''}${className}`}
    >
      {/* Optional Top Label */}
      {label && (
        <div className={`px-3 pt-2 text-xs font-bold shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </div>
      )}

      {/* RICH TEXT TOOLBAR WITH PERSISTENT CLICKABLE TOGGLES */}
      <div
        className={`rte-toolbar shrink-0 flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 border-b select-none ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Left Side: Formatting Tools with Persistent Active State */}
        <div className="flex flex-wrap items-center gap-1">
          {/* 1. Text Style / Font Dropdown (Persistent state) */}
          <div className="relative rte-popover-container">
            <button
              type="button"
              disabled={disabled || viewMode === 'preview'}
              onClick={() => setShowFontMenu((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeFontId !== 'sans'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                  : showFontMenu
                  ? isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'
                  : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
              }`}
              title="Style de police et titres (persistant au clic)"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[11px] max-w-[110px] truncate">
                {currentFontOption.label.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showFontMenu && (
              <div
                className={`absolute left-0 top-full mt-1 w-60 rounded-xl shadow-2xl border p-1.5 z-40 animate-in fade-in zoom-in-95 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase px-2 py-1 text-slate-400 flex items-center justify-between">
                  <span>Styles Typographiques</span>
                  <span className="text-[9px] lowercase font-normal opacity-70">cliquez pour basculer</span>
                </div>
                {FONT_OPTIONS.map((f) => {
                  const isPicked = activeFontId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSelectFontStyle(f)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        isPicked
                          ? 'bg-indigo-600 text-white font-bold'
                          : isDark
                          ? 'hover:bg-slate-800'
                          : 'hover:bg-indigo-50 hover:text-indigo-900'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isPicked && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                        <span>{f.label}</span>
                      </span>
                      {f.prefix && <span className="text-[10px] font-mono opacity-60">{f.prefix}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

          {/* 2. Bullet List - PERSISTENT TOGGLE */}
          <button
            type="button"
            disabled={disabled || viewMode === 'preview'}
            onClick={handleToggleBulletList}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              isBulletListActive
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/60 scale-105'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
            title={
              isBulletListActive
                ? 'Liste à puces ACTIVE (Recliquer pour désactiver)'
                : 'Liste à puces'
            }
          >
            <List className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* 3. Numbered List - PERSISTENT TOGGLE WITH CONSECUTIVE 1., 2., 3... */}
          <button
            type="button"
            disabled={disabled || viewMode === 'preview'}
            onClick={handleToggleNumberedList}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              isNumberedListActive
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/60 scale-105'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
            title={
              isNumberedListActive
                ? 'Liste numérotée ACTIVE (Recliquer pour désactiver)'
                : 'Liste numérotée (1., 2., 3... séquentiel)'
            }
          >
            <ListOrdered className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

          {/* 4. Insert Link / File */}
          <button
            type="button"
            disabled={disabled || viewMode === 'preview'}
            onClick={() => setShowLinkModal(true)}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              showLinkModal
                ? 'bg-indigo-600 text-white'
                : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
            }`}
            title="Insérer un lien ou document fichier"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* 5. Insert Image */}
          <button
            type="button"
            disabled={disabled || viewMode === 'preview'}
            onClick={() => setShowImageModal(true)}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              showImageModal
                ? 'bg-pink-600 text-white'
                : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
            }`}
            title="Insérer ou téléverser une image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          {/* 6. Mention (@) */}
          {!hideMentions && (
          <div className="relative rte-popover-container">
            <button
              type="button"
              disabled={disabled || viewMode === 'preview'}
              onClick={() => setShowMentionPicker((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-0.5 transition-all ${
                showMentionPicker
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                  : isDark ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-indigo-50'
              }`}
              title="Mentionner un collaborateur (@)"
            >
              <AtSign className="w-3.5 h-3.5" />
            </button>

            {showMentionPicker && (
              <div
                className={`absolute left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto rounded-xl shadow-2xl border p-1.5 z-40 animate-in fade-in zoom-in-95 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase px-2 py-1 text-indigo-400 flex items-center justify-between">
                  <span>Mentionner un membre</span>
                  <span className="text-[9px] lowercase font-normal opacity-70">@nom</span>
                </div>
                {users.length > 0 ? (
                  users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleInsertMention(u)}
                      className={`w-full text-left p-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'
                      }`}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate">{u.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {u.posteLabel || (u.role === 'commercial' ? 'Commercial' : 'Admin')}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">Aucun utilisateur disponible</div>
                )}
              </div>
            )}
          </div>
          )}

          {/* 7. Emojis */}
          <div className="relative rte-popover-container">
            <button
              type="button"
              disabled={disabled || viewMode === 'preview'}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                showEmojiPicker
                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/50'
                  : isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-amber-600 hover:bg-amber-50'
              }`}
              title="Ajouter un emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <div
                className={`absolute left-0 sm:left-auto right-0 sm:right-auto top-full mt-1 w-72 rounded-2xl shadow-2xl border p-2.5 z-40 animate-in fade-in zoom-in-95 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="space-y-2">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 px-1">{cat.name}</div>
                      <div className="grid grid-cols-5 gap-1">
                        {cat.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleInsertEmoji(emoji)}
                            className={`h-8 text-lg rounded-lg flex items-center justify-center transition-transform hover:scale-125 ${
                              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Tab Toggle (Write / Preview) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('write')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
              viewMode === 'write'
                ? isDark
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-600 text-white shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Écrire</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
              viewMode === 'preview'
                ? isDark
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-600 text-white shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Aperçu</span>
          </button>
        </div>
      </div>

      {/* TEXT AREA / PREVIEW BODY */}
      <div className={`p-2.5${fillHeight ? ' flex flex-col flex-1 min-h-0' : ''}`}>
        {viewMode === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={minRows}
            disabled={disabled}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              updateActiveStatesFromCursor();
            }}
            onKeyUp={updateActiveStatesFromCursor}
            onClick={updateActiveStatesFromCursor}
            onSelect={updateActiveStatesFromCursor}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full bg-transparent focus:outline-none text-xs sm:text-sm font-normal leading-relaxed font-sans ${
              fillHeight ? 'flex-1 min-h-0 resize-none' : 'resize-y'
            } ${
              isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
            }`}
          />
        ) : (
          <div
            className={`p-2 rounded-lg ${fillHeight ? 'flex-1 min-h-0 overflow-auto ' : 'min-h-[70px] '}${
              isDark ? 'bg-slate-950/50 text-slate-100' : 'bg-slate-50 text-slate-800'
            }`}
          >
            {value.trim() ? (
              <FormattedText content={value} isDark={isDark} />
            ) : (
              <p className="text-xs italic text-slate-400">Rien à prévisualiser pour le moment.</p>
            )}
          </div>
        )}
      </div>

      {/* POPUP MODAL 1: INSERT LINK / FILE */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl p-5 shadow-2xl border ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-500" /> Insérer un Lien ou Fichier
              </h4>
              <button onClick={() => setShowLinkModal(false)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLink} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Texte / Titre du lien</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Ex: Fiche technique v2, Document de style..."
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">URL Web (HTTPS)</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <div className="text-[11px] text-slate-400 mb-2">Ou importer un fichier depuis votre PC :</div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Téléverser un fichier local (PDF, doc...)
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleDocFileUpload} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  Insérer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: INSERT IMAGE */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl p-5 shadow-2xl border ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-500" /> Insérer une Image
              </h4>
              <button onClick={() => setShowImageModal(false)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmImage} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Légende / Titre de l'image</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Ex: Échantillon tissu, Croquis dos..."
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Lien direct de l'image (URL)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <div className="text-[11px] text-slate-400 mb-2">Ou importer une image locale :</div>
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Choisir une photo / image (PNG, JPG...)
                </button>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileUpload}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!imageUrl.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  Insérer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
