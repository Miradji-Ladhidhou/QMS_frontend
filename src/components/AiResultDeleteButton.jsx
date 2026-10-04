import { useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteAiResult } from '../lib/aiGenerations.js';

export default function AiResultDeleteButton({ endpoint, input, disabled, onDeleted, onError }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pending = useRef(false);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setDeleting(true);
    try {
      await deleteAiResult(endpoint, input);
      setConfirming(false);
      onDeleted();
    } catch (error) {
      onError(error.response?.data?.error || 'Impossible de supprimer le résultat IA enregistré.');
    } finally {
      pending.current = false;
      setDeleting(false);
    }
  }
  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <button type="button" disabled={disabled || deleting}
        onClick={confirming ? remove : () => setConfirming(true)}
        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50">
        {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        {confirming ? 'Confirmer la suppression de la proposition' : 'Supprimer la proposition enregistrée'}
      </button>
      {confirming && <button type="button" disabled={deleting} onClick={() => setConfirming(false)}
        className="text-slate-500 hover:text-slate-700">Annuler</button>}
    </div>
  );
}
