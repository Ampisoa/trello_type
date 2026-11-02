import { Card, CardAttachment, HistoryLog, UserRole } from '../types';

export const MAX_UPLOAD_SIZE = 15 * 1024 * 1024;

export const MAX_UPLOAD_SIZE_LABEL = '15 Mo';

export interface UploadAuthor {
  name: string;
  role: UserRole;
}

export interface IngestResult {
  card: Card;
  logs: HistoryLog[];
  rejected: string[];
}

// Un drag externe transporte ses fichiers dans `dataTransfer.types` ('Files')
// bien avant que `dataTransfer.files` ne soit lisible : c'est ce marqueur qui
// distingue un dépôt de fichiers d'une réorganisation interne des colonnes.
export const hasDroppedFiles = (e: { dataTransfer?: { types?: unknown } | null }): boolean => {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types as ArrayLike<string>).includes('Files');
};

export const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|svg|heic|avif|bmp)$/i.test(file.name);

export const isPdfFile = (file: File): boolean =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export const isSupportedFile = (file: File): boolean => isImageFile(file) || isPdfFile(file);

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });

// Toutes les photos importées arrivent dans l'application en carré exact
// IMAGE_IMPORT_SIZE × IMAGE_IMPORT_SIZE (recadrage centré).
export const IMAGE_IMPORT_SIZE = 98;

const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = url;
  });

/**
 * Recadre une image au centre en carré exact `size` × `size` et renvoie une
 * data-URL. Le côté court de la photo sert de référence (aucune déformation),
 * les formats à fond transparent (PNG/WebP) conservent leur alpha, les autres
 * sont fondus sur blanc puis ré-encodés en JPEG. En cas d'échec de décodage,
 * le fichier d'origine est renvoyé tel quel plutôt que d'être perdu.
 */
export async function squareCropDataUrl(file: File, size: number = IMAGE_IMPORT_SIZE): Promise<string> {
  const format = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
  const keepAlpha = format !== 'image/jpeg';
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImageFromUrl(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return await readFileAsDataURL(file);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (!keepAlpha) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
    }

    const side = Math.min(img.naturalWidth, img.naturalHeight) || size;
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    return canvas.toDataURL(format, keepAlpha ? undefined : 0.9);
  } catch {
    return await readFileAsDataURL(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Data-URL prête à être stockée sur la fiche : photo recadrée 98 × 98, PDF intact. */
export const importFileDataUrl = async (file: File): Promise<string> =>
  isImageFile(file) ? squareCropDataUrl(file) : readFileAsDataURL(file);

/** Mime type réel encodé dans une data-URL (`data:image/jpeg;base64,…`). */
export const mimeTypeFromDataUrl = (dataUrl: string): string => {
  if (!dataUrl.startsWith('data:')) return '';
  const sep = dataUrl.indexOf(';');
  return sep > 5 ? dataUrl.slice(5, sep) : '';
};

const makeAttachment = (file: File, dataUrl: string, category: CardAttachment['category'], uploadedBy: string): CardAttachment => ({
  id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: file.name,
  fileUrl: dataUrl,
  mimeType: file.type,
  size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
  category,
  uploadedAt: new Date().toISOString(),
  uploadedBy,
});

const makeLog = (
  card: Card,
  author: UploadAuthor,
  action: string,
  details: string
): HistoryLog => ({
  id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  cardId: card.id,
  authorName: author.name,
  authorRole: author.role,
  action,
  details,
  timestamp: new Date().toISOString(),
});

/**
 * Dépose une liste de fichiers (drag & drop externe ou Ctrl+V) sur une carte.
 *
 * Routage non destructif :
 *  - 1ʳᵉ image  -> "Frame / Visuel Modèle" si le cadre est vide, sinon pièce jointe
 *  - 1ʳᵉe image suivante -> pièces jointes
 *  - PDF        -> "Dossier rattaché" si aucun, sinon pièce jointe
 *  - le reste   -> pièces jointes
 *
 * Aucun fichier déjà en place n'est écrasé : pour remplacer un visuel, il faut
 * d'abord le supprimer (la suppression est fiable depuis la correction serveur).
 */
export async function ingestFilesIntoCard(
  card: Card,
  files: File[] | FileList,
  author: UploadAuthor
): Promise<IngestResult> {
  const list = Array.from(files);
  const rejected: string[] = [];
  const logs: HistoryLog[] = [];
  const next: Card = { ...card };

  for (const file of list) {
    if (file.size > MAX_UPLOAD_SIZE) {
      rejected.push(`${file.name} — dépasse la taille maximale (${MAX_UPLOAD_SIZE_LABEL})`);
      continue;
    }
    if (!isSupportedFile(file)) {
      rejected.push(`${file.name} — format non pris en charge (images et PDF uniquement)`);
      continue;
    }

    let dataUrl: string;
    try {
      dataUrl = await importFileDataUrl(file);
    } catch {
      rejected.push(`${file.name} — lecture impossible`);
      continue;
    }

    if (isPdfFile(file) && !next.dossierTechnique) {
      next.dossierTechnique = makeAttachment(file, dataUrl, 'dossier_technique', author.name);
      logs.push(
        makeLog(card, author, 'Mise à jour Dossier rattaché (PDF)', `Fichier "${file.name}" importé`)
      );
    } else if (isImageFile(file) && !next.frame) {
      next.frame = makeAttachment(file, dataUrl, 'frame', author.name);
      logs.push(
        makeLog(card, author, 'Mise à jour Photo / Frame', `Fichier "${file.name}" importé`)
      );
    } else {
      next.attachments = [...(next.attachments || []), makeAttachment(file, dataUrl, 'attachement', author.name)];
      logs.push(
        makeLog(card, author, `Ajout d'attachement (${file.name})`, `Fichier "${file.name}" importé`)
      );
    }
  }

  if (logs.length) {
    next.historyLogs = [...logs].reverse().concat(card.historyLogs || []);
  }

  return { card: next, logs, rejected };
}
