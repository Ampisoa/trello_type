import React, { useState } from 'react';
import { SimpleVisual, SimpleVisualType } from '../types';
import { SimpleCardVisual, BG_COLOR_MAP } from './SimpleCardVisual';
import { Smile, Film, Image as ImageIcon, MessageSquare, Upload, X, Check } from 'lucide-react';

interface SimpleVisualPickerProps {
  visual?: SimpleVisual;
  onChange: (newVisual: SimpleVisual | undefined) => void;
  titlePreview?: string;
}

const PRESET_EMOJIS = [
  '📌', '⚡', '💡', '🚀', '🔥', '⚠️', '✅', '⏳',
  '🧵', '✂️', '👗', '👔', '🧥', '🪡', '👕', '👜',
  '💬', '📝', '📅', '🔔', '🏷️', '📦', '🎨', '🎯',
];

const PRESET_GIFS = [
  { name: 'En cours', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
  { name: 'Approuvé', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { name: 'Attention', url: 'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif' },
  { name: 'Fusée', url: 'https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif' },
  { name: 'Couture', url: 'https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/giphy.gif' },
];

const COLOR_OPTIONS: { id: string; label: string; bg: string; ring: string }[] = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', ring: 'ring-indigo-500' },
  { id: 'emerald', label: 'Émeraude', bg: 'bg-emerald-100', ring: 'ring-emerald-500' },
  { id: 'amber', label: 'Ambre', bg: 'bg-amber-100', ring: 'ring-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-100', ring: 'ring-rose-500' },
  { id: 'sky', label: 'Ciel', bg: 'bg-sky-100', ring: 'ring-sky-500' },
  { id: 'purple', label: 'Violet', bg: 'bg-purple-100', ring: 'ring-purple-500' },
  { id: 'slate', label: 'Gris ardoise', bg: 'bg-slate-200', ring: 'ring-slate-500' },
];

export const SimpleVisualPicker: React.FC<SimpleVisualPickerProps> = ({
  visual,
  onChange,
  titlePreview = 'Titre de la carte',
}) => {
  const [activeTab, setActiveTab] = useState<SimpleVisualType>(visual?.type || 'emoji');
  const [customEmoji, setCustomEmoji] = useState(visual?.type === 'emoji' ? visual.content : '');
  const [customMessage, setCustomMessage] = useState(visual?.type === 'message' ? visual.content : '');
  const [gifUrl, setGifUrl] = useState(visual?.type === 'gif' ? visual.content : '');
  const [photoUrl, setPhotoUrl] = useState(visual?.type === 'photo' ? visual.content : '');
  const [selectedColor, setSelectedColor] = useState(visual?.bgColor || 'amber');

  const handleSelectEmoji = (emoji: string) => {
    setCustomEmoji(emoji);
    onChange({
      type: 'emoji',
      content: emoji,
      bgColor: selectedColor,
    });
  };

  const handleCustomEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomEmoji(val);
    if (val.trim()) {
      onChange({
        type: 'emoji',
        content: val.trim(),
        bgColor: selectedColor,
      });
    } else {
      onChange(undefined);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCustomMessage(val);
    if (val.trim()) {
      onChange({
        type: 'message',
        content: val.trim(),
        bgColor: selectedColor,
      });
    } else {
      onChange(undefined);
    }
  };

  const handleColorChange = (colorId: string) => {
    setSelectedColor(colorId);
    if (visual && (visual.type === 'emoji' || visual.type === 'message')) {
      onChange({
        ...visual,
        bgColor: colorId,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'gif') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ce fichier dépasse la taille maximale autorisée (8 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'photo') {
        setPhotoUrl(dataUrl);
        onChange({
          type: 'photo',
          content: dataUrl,
        });
      } else {
        setGifUrl(dataUrl);
        onChange({
          type: 'gif',
          content: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectGif = (url: string) => {
    setGifUrl(url);
    onChange({
      type: 'gif',
      content: url,
    });
  };

  return (
    <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-indigo-600" />
          Visuel de la carte (remplace le Frame)
        </label>
        {visual && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setCustomEmoji('');
              setCustomMessage('');
              setGifUrl('');
              setPhotoUrl('');
            }}
            className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" /> Supprimer le visuel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setActiveTab('emoji');
            if (customEmoji) {
              onChange({ type: 'emoji', content: customEmoji, bgColor: selectedColor });
            }
          }}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'emoji'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Smile className="w-3.5 h-3.5 text-amber-500" />
          <span>Emoji</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('gif');
            if (gifUrl) {
              onChange({ type: 'gif', content: gifUrl });
            }
          }}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'gif'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-indigo-500" />
          <span>GIF</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('photo');
            if (photoUrl) {
              onChange({ type: 'photo', content: photoUrl });
            }
          }}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'photo'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span>Photo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('message');
            if (customMessage) {
              onChange({ type: 'message', content: customMessage, bgColor: selectedColor });
            }
          }}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'message'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
          <span>Message</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {/* TAB 1: EMOJI */}
        {activeTab === 'emoji' && (
          <div className="space-y-2.5">
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                Choisissez un emoji rapide ou tapez le vôtre :
              </span>
              <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {PRESET_EMOJIS.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => handleSelectEmoji(emo)}
                    className={`h-8 text-lg rounded flex items-center justify-center transition-all cursor-pointer ${
                      visual?.type === 'emoji' && visual.content === emo
                        ? 'bg-indigo-600 text-white scale-110 shadow-xs'
                        : 'bg-white hover:bg-indigo-50 border border-slate-200 hover:scale-105'
                    }`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customEmoji}
                onChange={handleCustomEmojiChange}
                placeholder="Ou collez un emoji personnalisé (ex: 🎨, 👔, 🌟)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Background Color Picker */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                Couleur de fond :
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleColorChange(c.id)}
                    className={`w-6 h-6 rounded-full ${c.bg} border border-slate-300 flex items-center justify-center transition-all cursor-pointer ${
                      selectedColor === c.id ? `ring-2 ${c.ring} scale-110` : 'hover:scale-105'
                    }`}
                    title={c.label}
                  >
                    {selectedColor === c.id && <Check className="w-3 h-3 text-slate-800" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GIF */}
        {activeTab === 'gif' && (
          <div className="space-y-2.5">
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                Stickers GIF animés suggérés :
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_GIFS.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => handleSelectGif(g.url)}
                    className={`p-1 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      visual?.type === 'gif' && visual.content === g.url
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={g.url}
                      alt={g.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain rounded"
                    />
                    <span className="text-[9px] font-bold text-slate-700 truncate w-full text-center">
                      {g.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Ou importer un fichier GIF / coller une URL GIF :
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={gifUrl}
                  onChange={(e) => {
                    setGifUrl(e.target.value);
                    if (e.target.value.trim()) {
                      onChange({ type: 'gif', content: e.target.value.trim() });
                    }
                  }}
                  placeholder="https://.../mon-animation.gif"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Fichier</span>
                  <input
                    type="file"
                    accept=".gif,image/gif"
                    onChange={(e) => handleFileUpload(e, 'gif')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PHOTO */}
        {activeTab === 'photo' && (
          <div className="space-y-2.5">
            <div className="p-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/70 text-center hover:bg-slate-100/70 transition-colors">
              <label className="cursor-pointer block space-y-1">
                <ImageIcon className="w-6 h-6 text-indigo-500 mx-auto" />
                <span className="text-xs font-bold text-slate-800 block">
                  Téléverser une photo pour la carte
                </span>
                <span className="text-[10px] text-slate-500 block">
                  PNG, JPG, WebP jusqu'à 8 Mo
                </span>
                <span className="inline-block mt-1 px-3 py-1 bg-white text-indigo-600 font-bold text-xs rounded-md border border-slate-200 shadow-2xs">
                  Parcourir...
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'photo')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value);
                  if (e.target.value.trim()) {
                    onChange({ type: 'photo', content: e.target.value.trim() });
                  }
                }}
                placeholder="Ou coller une URL d'image (https://...)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* TAB 4: MESSAGE */}
        {activeTab === 'message' && (
          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Petit message d'accroche ou mémo :
              </label>
              <textarea
                value={customMessage}
                onChange={handleMessageChange}
                maxLength={120}
                rows={2}
                placeholder="ex: Brief avant lancement, Attention métrage tissu, Relance client..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium resize-none"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
                <span>Apparaîtra en encart visuel sur la carte Kanban</span>
                <span>{customMessage.length} / 120</span>
              </div>
            </div>

            {/* Background Color Picker */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                Couleur de la bannière message :
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleColorChange(c.id)}
                    className={`w-6 h-6 rounded-full ${c.bg} border border-slate-300 flex items-center justify-center transition-all cursor-pointer ${
                      selectedColor === c.id ? `ring-2 ${c.ring} scale-110` : 'hover:scale-105'
                    }`}
                    title={c.label}
                  >
                    {selectedColor === c.id && <Check className="w-3 h-3 text-slate-800" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview Box */}
      {visual && (
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Aperçu en colonne Kanban
            </span>
          </div>
          <div className="w-48 mx-auto p-2 bg-slate-50 rounded-lg border border-slate-200/80 shadow-2xs">
            <SimpleCardVisual visual={visual} title={titlePreview} size="md" />
          </div>
        </div>
      )}
    </div>
  );
};
