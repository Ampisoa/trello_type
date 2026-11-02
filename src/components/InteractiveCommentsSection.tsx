import React, { useState, useRef, useEffect } from 'react';
import { CardComment, UserProfile } from '../types';
import { MoreVertical, Edit2, Trash2, Send, MessageSquare, AlertTriangle, X } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { FormattedText } from './FormattedText';

interface InteractiveCommentsSectionProps {
  cardId?: string;
  comments: CardComment[];
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  onCommentsChange: (updatedComments: CardComment[]) => void;
  isReadOnly?: boolean;
}

export const InteractiveCommentsSection: React.FC<InteractiveCommentsSectionProps> = ({
  cardId,
  comments,
  currentUser,
  allUsers = [],
  onCommentsChange,
  isReadOnly = false,
}) => {
  // New comment state
  const [newCommentText, setNewCommentText] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  // Active menu dropdown for ⋮ button
  const [activeMenuCommentId, setActiveMenuCommentId] = useState<string | null>(null);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Delete confirmation modal/inline state
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuCommentId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format dynamic relative timestamp
  const formatTimestamp = (rawTs: string): string => {
    if (!rawTs) return '';
    if (rawTs === "à l'instant" || rawTs === "À l'instant") return "Il y a quelques secondes";

    let dateObj: Date | null = null;
    if (rawTs.includes('T')) {
      const d = new Date(rawTs);
      if (!isNaN(d.getTime())) dateObj = d;
    }
    if (!dateObj) {
      const match = rawTs.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+à\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (match) {
        const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match;
        dateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
      }
    }
    if (!dateObj) {
      const isoMatch = rawTs.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+à\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (isoMatch) {
        const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = isoMatch;
        dateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) return rawTs;

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();

    if (diffMs < 0 || diffMs < 30 * 1000) {
      return "Il y a quelques secondes";
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }

    return dateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Submit a new comment
  const handlePublishComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim()) return;

    const createdComment: CardComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      cardId: cardId || '',
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorPoste: currentUser.posteLabel || (currentUser.role === 'commercial' ? 'Commercial' : 'Admin / Direction'),
      authorAvatar: currentUser.avatar,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
      isEdited: false,
    };

    onCommentsChange([createdComment, ...comments]);
    setNewCommentText('');
    setIsWriting(false);
  };

  // Start editing a comment
  const handleStartEdit = (comment: CardComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
    setActiveMenuCommentId(null);
  };

  // Save modified comment
  const handleSaveEdit = (commentId: string) => {
    if (!editText.trim()) return;

    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          content: editText.trim(),
          isEdited: true,
        };
      }
      return c;
    });

    onCommentsChange(updated);
    setEditingCommentId(null);
    setEditText('');
  };

  // Cancel modification
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  // Confirm and delete comment
  const handleConfirmDelete = (commentId: string) => {
    const updated = comments.filter((c) => c.id !== commentId);
    onCommentsChange(updated);
    setDeletingCommentId(null);
    setActiveMenuCommentId(null);
  };

  return (
    <div className="bg-white border border-slate-200 text-slate-900 rounded-xl p-5 sm:p-6 space-y-6 shadow-2xs">
      {/* Section Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Commentaires & Échanges</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Formatez votre texte, mentionnez (@), insérez des fichiers ou images et des emojis
            </p>
          </div>
        </div>
      </div>

      {/* 1. ÉCRIRE UN COMMENTAIRE AVEC ÉDITEUR RICHE OU BANNIÈRE LECTURE SEULE */}
      {isReadOnly ? (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-amber-200/90 text-xs flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-amber-300">Mode observation visiteur (Lecture seule)</p>
            <p className="text-[11px] text-amber-200/70">
              En tant que visiteur invité, vous pouvez consulter l'historique et les commentaires de fabrication sans droit de modification ni de publication.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all">
          <form onSubmit={handlePublishComment} className="space-y-3">
            <div className="flex items-start gap-3">
              {/* User Avatar */}
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500 shrink-0 mt-1 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  {currentUser.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 space-y-2.5">
                <RichTextEditor
                  value={newCommentText}
                  onChange={setNewCommentText}
                  placeholder="Écrire un commentaire... (@mention, liens, images, emojis)"
                  minRows={isWriting || newCommentText.length > 0 ? 3 : 2}
                  isDark={false}
                  users={allUsers}
                  onKeyDownSubmit={handlePublishComment}
                />

                {/* Action buttons (Annuler & Envoyer) */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    Astuce : <kbd className="px-1.5 py-0.5 bg-white rounded text-slate-600 border border-slate-200">Ctrl+Enter</kbd> pour envoyer
                  </span>

                  <div className="flex items-center gap-2 ml-auto">
                    {newCommentText.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewCommentText('');
                          setIsWriting(false);
                        }}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
                      >
                        Effacer
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publier</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 2. LISTE DES COMMENTAIRES */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1.5">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Aucun commentaire pour le moment</p>
            <p className="text-[11px] text-slate-400">
              Soyez le premier à laisser une remarque, instruction ou question sur ce modèle.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            // Check if current user is the author
            const isMyComment =
              comment.authorId === currentUser.id ||
              comment.authorName.toLowerCase() === currentUser.name.toLowerCase();

            const isEditingThis = editingCommentId === comment.id;
            const isMenuOpen = activeMenuCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:bg-slate-100/70 space-y-3 shadow-2xs"
              >
                {/* Header: Avatar, Name, Timestamp & Options ⋮ */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {comment.authorAvatar ? (
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {comment.authorName.charAt(0)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{comment.authorName}</span>
                        {comment.authorRole && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                            {comment.authorPoste || comment.authorRole}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <span>{formatTimestamp(comment.createdAt)}</span>
                        {comment.isEdited && <span className="text-slate-400">· modifié</span>}
                      </div>
                    </div>
                  </div>

                  {/* ⋮ Button (Only visible for user's own comments and when not read-only) */}
                  {!isReadOnly && isMyComment && !isEditingThis && (
                    <div className="relative" ref={isMenuOpen ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuCommentId((prev) => (prev === comment.id ? null : comment.id))
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Options du commentaire"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(comment)}
                            className="w-full px-3 py-1.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuCommentId(null);
                              setDeletingCommentId(comment.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. MODIFIER UN COMMENTAIRE (Inline Rich Editing Mode) */}
                {isEditingThis ? (
                  <div className="space-y-2 pt-1">
                    <RichTextEditor
                      value={editText}
                      onChange={setEditText}
                      placeholder="Modifier le commentaire..."
                      minRows={3}
                      isDark={false}
                      users={allUsers}
                      onKeyDownSubmit={() => handleSaveEdit(comment.id)}
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
                      >
                        Annuler
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editText.trim()}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-40 transition-colors"
                      >
                        Enregistrer les modifications
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formatted Rich Comment Body */
                  <div className="pl-1 pt-0.5">
                    <FormattedText content={comment.content} isDark={false} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL / CONFIRMATION DE SUPPRESSION */}
      {deletingCommentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Supprimer le commentaire ?</h4>
              <p className="text-xs text-slate-500">
                Voulez-vous vraiment supprimer ce commentaire ?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCommentId(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex-1"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDelete(deletingCommentId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex-1"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
