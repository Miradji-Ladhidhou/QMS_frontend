import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api.js';
import { CCP_APPROVAL_LABELS, missingCcpValidationFields } from '../../lib/haccpStatus.js';

export default function CcpApprovalCard({ ccp, canManage, onEdit, onApproved }) {
  const [confirmed, setConfirmed] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const missingFields = missingCcpValidationFields(ccp);

  async function approve() {
    setError('');
    setApproving(true);
    try {
      await api.post(`/haccp/ccps/${ccp.id}/approve`);
      await onApproved();
      setConfirmed(false);
    } catch (err) {
      const details = err.response?.data?.details;
      const messages = Array.isArray(details) ? details.map((item) => typeof item === 'string' ? item : item.msg).filter(Boolean) : [];
      setError([err.response?.data?.error || "Impossible d'approuver ce CCP.", ...messages].join(' '));
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className={`rounded-lg border p-3 ${ccp.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck size={16} /> {CCP_APPROVAL_LABELS[ccp.status] || 'Statut de validation inconnu'}</p>
      {ccp.status === 'approved' ? (
        <p className="mt-1 text-xs text-slate-600">Approbation le {ccp.approved_at ? new Date(ccp.approved_at).toLocaleString('fr-FR') : '—'}. Toute modification des mesures impose une nouvelle approbation.</p>
      ) : (
        <p className="mt-1 text-xs text-slate-600">{ccp.status === 'legacy' ? 'Suivi existant conservé, sans inventer une approbation historique. Documentez les preuves pour approuver ce CCP.' : 'Pas de relevé, de rappel ni de mise en service avant approbation. Complétez et vérifiez le dossier du CCP.'}</p>
      )}
      {ccp.validation_source && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700"><strong>Source :</strong> {ccp.validation_source}</p>}
      {ccp.validation_evidence && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700"><strong>Preuves :</strong> {ccp.validation_evidence}</p>}
      {ccp.status !== 'approved' && missingFields.length > 0 && <p className="mt-2 text-xs text-amber-900"><strong>À compléter avant approbation :</strong> {missingFields.join(', ')}.</p>}
      {canManage && (
        <div className="mt-3 space-y-2">
          <button type="button" disabled={approving} onClick={onEdit} className="min-h-[40px] rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">Compléter / modifier le CCP</button>
          {ccp.status !== 'approved' && (
            <>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={confirmed} disabled={approving} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                Je confirme, pour l’équipe HACCP, la décision CCP, les preuves de validation, les limites, la méthode, la fréquence et le responsable de surveillance.
              </label>
              <button type="button" disabled={!confirmed || approving || missingFields.length > 0} onClick={approve} className="min-h-[40px] rounded-md bg-primary px-3 text-xs font-medium text-white disabled:opacity-50">{approving ? 'Approbation...' : 'Approuver et autoriser la surveillance'}</button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
