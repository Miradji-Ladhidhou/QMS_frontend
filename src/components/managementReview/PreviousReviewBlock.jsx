import { History } from 'lucide-react';
import { ACTION_STATUS_LABELS, ACTION_STATUS_STYLES, buildPreviousActionsText } from '../../lib/managementReviewActions.js';

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}

// Actions décidées lors de la revue clôturée précédente, avec leur statut ACTUEL (§9.3.2 a) — le suivi n'est
// plus à ressaisir : le bouton reporte cet état dans la rubrique écrite « Statut des actions de la revue
// précédente », que la clôture de la revue exige.
export default function PreviousReviewBlock({ previousReview, canApply, onApply, applying }) {
  if (!previousReview) return null;
  const done = previousReview.actions.filter((action) => action.effective_status === 'done').length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <History size={16} className="text-primary" />
            Actions de la revue précédente
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {previousReview.title} · {formatDate(previousReview.review_date)} ·{' '}
            {previousReview.actions.length === 0 ? 'aucune action décidée' : `${done}/${previousReview.actions.length} réalisée${done > 1 ? 's' : ''}`}
          </p>
        </div>
        {canApply && (
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="min-h-[40px] rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {applying ? 'Enregistrement...' : 'Reporter dans le suivi écrit'}
          </button>
        )}
      </div>

      {previousReview.actions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {previousReview.actions.map((action) => {
            const status = action.effective_status || action.status;
            return (
              <li key={action.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="break-words text-sm text-slate-800">{action.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${ACTION_STATUS_STYLES[status]}`}>{ACTION_STATUS_LABELS[status]}</span>
                  {action.status_derived && <span>CAPA liée clôturée</span>}
                  {action.is_overdue && <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">Échéance dépassée</span>}
                  {action.owner_user?.full_name && <span>· {action.owner_user.full_name}</span>}
                  {action.due_date && <span>· échéance {formatDate(action.due_date)}</span>}
                  {action.linked_capa && <span>· CAPA {action.linked_capa.number}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { buildPreviousActionsText };
