import React, { useState, useRef } from 'react';
import { AVATAR_PRESETS } from '../data/avatarPresets';
import {
  Upload,
  Sparkles,
  Check,
  Trash2,
  Camera,
} from 'lucide-react';

interface AvatarPickerProps {
  currentAvatar?: string;
  userName?: string;
  onSelectAvatar: (avatarUrl: string) => void;
  onClearAvatar?: () => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatar,
  userName = 'Utilisateur',
  onSelectAvatar,
  onClearAvatar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner un fichier image valide (JPEG, PNG, WebP).');
      return;
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('L\'image ne doit pas dépasser 5 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onSelectAvatar(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const initials =
    userName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';

  return (
    <div className="space-y-4">
      {/* Aperçu de l'avatar actuel & Actions rapides */}
      <div className="flex items-center gap-4 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative group shrink-0">
          {currentAvatar ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-400 shadow-lg ring-4 ring-indigo-500/20 bg-slate-800 flex items-center justify-center">
              <img
                src={currentAvatar}
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-xl flex items-center justify-center border-2 border-white/40 shadow-lg">
              {initials}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
            title="Importer une image"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-white truncate">{userName}</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              Avatar Actif
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {currentAvatar ? 'Avatar personnalisé ou D.A sélectionné' : 'Initiales stylisées par défaut'}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer une image</span>
            </button>

            {currentAvatar && onClearAvatar && (
              <button
                type="button"
                onClick={onClearAvatar}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold rounded-lg border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                title="Supprimer la photo et revenir aux initiales"
              >
                <Trash2 className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {uploadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
          {uploadError}
        </div>
      )}

      {/* 10 Choix D.A Simples */}
      <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>10 Avatars Dessin Animé (D.A) au choix</span>
          </label>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
            10 modèles simples
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2.5 pt-1">
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = currentAvatar === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectAvatar(preset.url)}
                className={`relative flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-indigo-100/90 ring-2 ring-indigo-600 shadow-sm scale-105'
                    : 'bg-white hover:bg-slate-100 border border-slate-200/80 hover:shadow-2xs'
                }`}
                title={preset.name}
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs relative">
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-indigo-600/40 rounded-full flex items-center justify-center text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-700 truncate max-w-full mt-1.5">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone Import Rapide par Drag & Drop ou Clic */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 rounded-xl p-3.5 text-center cursor-pointer transition-all flex items-center justify-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Upload className="w-4 h-4" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-bold text-slate-800">
            Ou importer une image personnalisée
          </p>
          <p className="text-[11px] text-slate-500">
            Cliquez pour charger un fichier depuis votre appareil (JPG, PNG, WebP)
          </p>
        </div>
      </div>
    </div>
  );
};
