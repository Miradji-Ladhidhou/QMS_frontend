import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';

// Variante de BulkMoveCategoryModal.jsx pour les documents : ce module utilise un système de
// catégories distinct (document_categories, sans notion de catégorie personnelle "Uniquement
// moi"), d'où un simple sélecteur plutôt que CategoryVisibilityField.
export default function DocumentBulkMoveModal({ categories, selectedIds, onClose, onMoved }) {
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let response;
    try {
      response = await api.patch('/documents/bulk-category', { ids: selectedIds, category_id: categoryId || null });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de déplacer ces documents.');
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
            Déplacer {selectedIds.length} document{selectedIds.length > 1 ? 's' : ''}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Aucune catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

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
