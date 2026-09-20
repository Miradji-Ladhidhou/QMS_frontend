import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import SignaturePad from '../SignaturePad.jsx';

// Validation de la revue par la direction : signature manuscrite à l'écran. La revue est ensuite verrouillée (seul
// le suivi des actions reste modifiable) ; la direction peut la rouvrir, ce qui efface la validation.
export default function ReviewValidateModal({ review, onClose, onValidated }) {
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError('');
    setSubmitting(true);
    let data;
    try {
      ({ data } = await api.post(`/management-reviews/${review.id}/validate`, { signature }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de valider la revue.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onValidated(data, signature);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ShieldCheck size={18} className="text-emerald-600" />
              Valider la revue
            </h2>
            <p className="break-words text-sm text-slate-500">{review.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          En signant, la direction valide ce compte rendu. La revue est ensuite <strong>verrouillée</strong> : textes, période et décisions ne se modifient
          plus (le suivi des actions reste possible). Vous pourrez la rouvrir si une correction est nécessaire.
        </p>

        <p className="mb-1 text-sm font-medium text-slate-700">Signature de la direction</p>
        <SignaturePad onChange={setSignature} disabled={submitting} label="Signez ici pour valider" />

        {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!signature || submitting}
          className="mt-4 w-full rounded-md bg-emerald-600 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Validation...' : 'Valider et signer'}
        </button>
      </div>
    </div>
  );
}
