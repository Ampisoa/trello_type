import React, { useState, useRef, useEffect } from 'react';
import { PRESET_BOARD_BACKGROUNDS } from '../data/presetBackgrounds';
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Check,
  RotateCcw,
  X,
  Sparkles,
} from 'lucide-react';

interface KanbanBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBackground: string;
  onSaveBackground: (bgUrl: string) => void;
}

export const KanbanBackgroundModal: React.FC<KanbanBackgroundModalProps> = ({
  isOpen,
  onClose,
  currentBackground,
  onSaveBackground,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [selectedBg, setSelectedBg] = useState<string>(currentBackground || '');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedBg(currentBackground || '');
      setCustomUrlInput(currentBackground && !PRESET_BOARD_BACKGROUNDS.some(p => p.url === currentBackground) ? currentBackground : '');
    }
  }, [isOpen, currentBackground]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("L'image est trop volumineuse (maximum 8 Mo).");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedBg(base64);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) return;
    setSelectedBg(customUrlInput.trim());
  };

  const handleSave = () => {
    onSaveBackground(selectedBg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Photo d'Arrière-Plan du Tableau Kanban
              </h2>
              <p className="text-xs text-slate-400">
                Personnalisez le fond en Full View pour tous les modèles et cartes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Aperçu en direct</label>
              {selectedBg && (
                <button
                  type="button"
                  onClick={() => setSelectedBg('')}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Enlever le fond (défaut sobre)</span>
                </button>
              )}
            </div>

            <div className="relative h-32 rounded-xl overflow-hidden border border-slate-300 shadow-inner flex items-center justify-between p-4 group">
              {selectedBg ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${selectedBg})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
              )}

              {/* Sample Mini Kanban Column Preview */}
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-28 p-2 rounded-lg bg-white/90 backdrop-blur-md border border-white/60 shadow-md">
                  <div className="w-12 h-2 bg-indigo-600 rounded-sm mb-1.5" />
                  <div className="w-full h-3 bg-slate-200 rounded-xs mb-1" />
                  <div className="w-3/4 h-2.5 bg-slate-100 rounded-xs" />
                </div>
                <div className="w-28 p-2 rounded-lg bg-white/90 backdrop-blur-md border border-white/60 shadow-md hidden sm:block">
                  <div className="w-10 h-2 bg-emerald-600 rounded-sm mb-1.5" />
                  <div className="w-full h-3 bg-slate-200 rounded-xs mb-1" />
                  <div className="w-2/3 h-2.5 bg-slate-100 rounded-xs" />
                </div>
              </div>

              <div className="relative z-10 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-right">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Vue Kanban
                </span>
                <span className="text-xs font-bold text-white">
                  {selectedBg ? 'Arrière-plan personnalisé actif' : 'Arrière-plan standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs for Background Mode */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Choisir une photo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Télécharger une photo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'url'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Ajouter par URL</span>
            </button>
          </div>

          {/* Tab 1: Presets Gallery */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Sélectionnez une photo d'atelier de couture, matière ou textile haute définition :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
                {PRESET_BOARD_BACKGROUNDS.map((preset) => {
                  const isSelected = selectedBg === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedBg(preset.url)}
                      className={`relative rounded-xl overflow-hidden h-24 border-2 cursor-pointer transition-all group/preset shadow-xs ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-400 scale-[1.02]'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={preset.thumbnail}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover/preset:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                        <span className="text-[11px] font-bold text-white truncate drop-shadow-xs">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Importez une image depuis votre ordinateur (JPG, PNG, WebP) :
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUploading ? 'Chargement en cours...' : 'Cliquez pour sélectionner une photo'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Glissez-déposez ou choisissez un fichier (max 8 Mo)
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Tab 3: URL Input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Collez l'adresse web directe d'une image (https://...) :
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Enregistrer le fond</span>
          </button>
        </div>
      </div>
    </div>
  );
};
