import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';

export default function SubmitForApprovalModal({ documentId, users, onClose, onSubmitted }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleUser(userId) {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (selectedIds.length === 0) {
      setError('Sélectionnez au moins un approbateur.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.post(`/documents/${documentId}/submit-for-approval`, { approver_ids: selectedIds });
      onSubmitted(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de soumettre le document pour approbation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Soumettre pour approbation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Approbateurs requis</p>
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun autre utilisateur dans l'entreprise.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                {users.map((user) => (
                  <li key={user.id}>
                    <label className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      {user.full_name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Envoi...' : 'Soumettre'}
          </button>
        </form>
      </div>
    </div>
  );
}
