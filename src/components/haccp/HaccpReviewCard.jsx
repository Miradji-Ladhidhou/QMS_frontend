import { useEffect, useState } from 'react';
import { CalendarCheck, History, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { NEXT_REVIEW_OPTIONS, addMonthsIso, daysUntil, describeReviewDate, formatIsoDate } from '../../lib/riskReview.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

const KIND_LABELS = { manual: 'Version enregistrée', review: 'Revue', activation: 'Activation' };
const KIND_STYLES = { manual: 'bg-slate-100 text-slate-600', review: 'bg-emerald-100 text-emerald-700', activation: 'bg-blue-100 text-blue-700' };

const formatDateTime = (value) => new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="break-words text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// « Marquer revu » : revue annuelle du plan (principe 6, validation). Enregistre une version du plan, trace qui l'a
// revu et quand, et fixe la prochaine revue.
function MarkReviewedModal({ plan, onClose, onReviewed }) {
  const [nextMonths, setNextMonths] = useState(12);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    let response;
    try {
      response = await api.post(`/haccp/plans/${plan.id}/review`, { next_review_date: addMonthsIso(nextMonths), ...(reason.trim() ? { reason: reason.trim() } : {}) });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la revue.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onReviewed(response.data.plan);
  }

  return (
    <ModalShell title="Revue du plan HACCP" subtitle={plan.title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Vérifiez que l'analyse des dangers, les CCP et leurs limites sont toujours valables (nouveau produit, nouvel équipement, incident…). Une
          version du plan est conservée avec votre nom et la date.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine revue</label>
          <select value={nextMonths} onChange={(e) => setNextMonths(Number(e.target.value))} className={FIELD_CLASS}>
            {NEXT_REVIEW_OPTIONS.map((option) => (
              <option key={option.months} value={option.months}>
                {option.label} ({formatIsoDate(addMonthsIso(option.months))})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Motif / conclusion (facultatif)</label>
          <input type="text" maxLength={500} placeholder="Revue annuelle : aucun changement de procédé" value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_CLASS} />
        </div>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
          {submitting ? 'Enregistrement...' : 'Enregistrer la revue'}
        </button>
      </form>
    </ModalShell>
  );
}

// Historique des versions du plan : chaque version (revue, activation, enregistrement manuel) avec ce qui a changé
// depuis la précédente ; en tête, les modifications faites depuis la dernière version. Un auditeur y voit qui a
// changé quoi et quand.
function RevisionsModal({ plan, canManage, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api
      .get(`/haccp/plans/${plan.id}/revisions`)
      .then(({ data: revisions }) => setData(revisions))
      .catch(() => setError('Impossible de charger les versions du plan.'));
  }

  useEffect(load, [plan.id]);

  async function saveVersion() {
    setSaving(true);
    setError('');
    try {
      await api.post(`/haccp/plans/${plan.id}/revisions`, reason.trim() ? { reason: reason.trim() } : {});
      setReason('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la version.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Versions du plan" subtitle={plan.title} onClose={onClose}>
      {error && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!data ? (
        <div className="h-24 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <div className="space-y-3">
          {data.revisions.length > 0 && (
            <div className={`rounded-md border px-3 py-2 text-sm ${data.pending_changes.length > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {data.pending_changes.length > 0 ? (
                <>
                  <p className="font-medium">
                    {data.pending_changes.length} modification{data.pending_changes.length > 1 ? 's' : ''} depuis la version {data.revisions[0].revision_number}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                    {data.pending_changes.map((change) => (
                      <li key={change} className="break-words">
                        {change}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>Le plan est identique à sa dernière version ({data.revisions[0].revision_number}).</p>
              )}
            </div>
          )}

          {canManage && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="text" maxLength={500} placeholder="Motif de la version (facultatif)" value={reason} onChange={(e) => setReason(e.target.value)} className={`${FIELD_CLASS} sm:flex-1`} />
              <button type="button" onClick={saveVersion} disabled={saving} className="min-h-[44px] shrink-0 rounded-md border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60">
                {saving ? 'Enregistrement...' : 'Enregistrer une version'}
              </button>
            </div>
          )}

          {data.revisions.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
              Aucune version pour l'instant. Une version est enregistrée à l'activation du plan et à chaque revue.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.revisions.map((revision) => (
                <li key={revision.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-slate-900">Version {revision.revision_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLES[revision.kind]}`}>{KIND_LABELS[revision.kind]}</span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(revision.created_at)}
                      {revision.created_by_user ? ` · ${revision.created_by_user.full_name}` : ''}
                    </span>
                  </div>
                  {revision.reason && <p className="mt-0.5 break-words text-slate-700">{revision.reason}</p>}
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-500">
                    {revision.changes.map((change) => (
                      <li key={change} className="break-words">
                        {change}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// Revue annuelle du plan : prochaine revue (avec alerte quand elle approche), dernière revue, « marquer revu » et
// historique des versions. Le responsable est prévenu par email 7 jours avant, le jour même, puis chaque semaine de retard.
export default function HaccpReviewCard({ plan, canManage, onPlanChanged }) {
  const [reviewing, setReviewing] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const archived = plan.status === 'archived';
  const days = plan.review_date ? daysUntil(plan.review_date) : null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarCheck size={15} className="text-slate-400" />
            Revue du plan
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Prochaine revue : <strong>{formatIsoDate(plan.review_date)}</strong>
            {!archived && plan.review_date && days <= 30 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${days < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{describeReviewDate(plan.review_date)}</span>
            )}
            {!plan.review_date && <span className="ml-1 text-slate-400">(fixée à l'activation du plan)</span>}
          </p>
          <p className="text-xs text-slate-500">
            {plan.last_reviewed_at ? `Dernière revue le ${new Date(plan.last_reviewed_at).toLocaleDateString('fr-FR')}` : 'Jamais revu'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && !archived && (
            <button type="button" onClick={() => setReviewing(true)} className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0">
              <CalendarCheck size={14} />
              Marquer revu
            </button>
          )}
          <button type="button" onClick={() => setShowRevisions(true)} className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0">
            <History size={14} />
            Versions
          </button>
        </div>
      </div>

      {reviewing && (
        <MarkReviewedModal
          plan={plan}
          onClose={() => setReviewing(false)}
          onReviewed={(updated) => {
            setReviewing(false);
            onPlanChanged(updated);
          }}
        />
      )}
      {showRevisions && <RevisionsModal plan={plan} canManage={canManage} onClose={() => setShowRevisions(false)} />}
    </div>
  );
}
