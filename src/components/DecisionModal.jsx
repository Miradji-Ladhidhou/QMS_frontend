import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import AutoTextarea from './AutoTextarea.jsx';

export default function DecisionModal({ workflowId, decision, onClose, onDecided }) {
  const isApproval = decision === 'approved';
  const [password, setPassword] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isApproval) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const email = session?.user?.email;

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError('Mot de passe incorrect.');
          setSubmitting(false);
          return;
        }
      }

      const { data } = await api.post(`/workflows/${workflowId}/decide`, {
        decision,
        comment: comment || undefined,
      });
      onDecided(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la décision.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isApproval ? "Confirmer l'approbation" : 'Rejeter le document'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isApproval ? (
            <div>
              <p className="mb-3 text-sm text-slate-600">
                Pour valoir signature électronique, ressaisissez votre mot de passe afin de confirmer votre identité.
              </p>
              <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Motif du rejet</label>
              <AutoTextarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-md py-3 font-medium text-white transition-colors disabled:opacity-60 ${
              isApproval ? 'bg-primary hover:bg-primary-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? 'Envoi...' : isApproval ? 'Confirmer et signer' : 'Confirmer le rejet'}
          </button>
        </form>
      </div>
    </div>
  );
}
