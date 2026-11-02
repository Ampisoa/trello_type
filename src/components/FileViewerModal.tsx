import React from 'react';
import { CardAttachment } from '../types';
import { X, ExternalLink, Download, FileText, Image as ImageIcon } from 'lucide-react';

interface FileViewerModalProps {
  attachment: CardAttachment | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  const isImage = attachment.mimeType.startsWith('image/') || attachment.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i);
  const isPdf = attachment.mimeType === 'application/pdf' || attachment.fileUrl.match(/\.pdf$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-indigo-600 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate">{attachment.name}</h3>
              <p className="text-xs text-slate-500">
                Ajouté le {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')} par {attachment.uploadedBy}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.fileUrl}
              download={attachment.name}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
            <a
              href={attachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir nouvel onglet
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-900/5 p-4 flex items-center justify-center overflow-auto min-h-[400px]">
          {isImage ? (
            <img
              src={attachment.fileUrl}
              alt={attachment.name}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200"
            />
          ) : isPdf ? (
            <div className="w-full h-[70vh] flex flex-col">
              <object
                data={attachment.fileUrl}
                type="application/pdf"
                className="w-full flex-1 rounded-lg border border-slate-300 bg-white"
              >
                <iframe
                  src={attachment.fileUrl}
                  title={attachment.name}
                  className="w-full h-full rounded-lg border border-slate-300 bg-white"
                />
              </object>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Aperçu direct non disponible pour ce type de fichier</p>
              <a
                href={attachment.fileUrl}
                download={attachment.name}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 shadow-xs"
              >
                <Download className="w-4 h-4" /> Télécharger le fichier ({attachment.name})
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
