import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import CategoryVisibilityField from './CategoryVisibilityField.jsx';

// Modale partagée par toutes les listes qui supportent le déplacement en masse vers une
// catégorie (voir PATCH /<module>/bulk-category, réservé admin/manager côté backend — cette
// modale n'est donc jamais montée pour un member). `endpoint` est le chemin complet de l'API
// (ex: '/capas/bulk-category'), `resourceType` sert uniquement à résoudre la catégorie
// personnelle si "Uniquement moi" est choisi.
export default function BulkMoveCategoryModal({ resourceType, endpoint, categories, selectedIds, onClose, onMoved }) {
  const [categoryId, setCategoryId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let finalCategoryId = categoryId || null;
    if (isPrivate) {
      try {
        finalCategoryId = await resolvePersonalCategoryId(resourceType);
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onMoved() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.patch(endpoint, { ids: selectedIds, category_id: finalCategoryId });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de déplacer ces éléments.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onMoved(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Déplacer {selectedIds.length} élément{selectedIds.length > 1 ? 's' : ''}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <CategoryVisibilityField
            categories={categories}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Déplacement...' : 'Déplacer'}
          </button>
        </form>
      </div>
    </div>
  );
}
