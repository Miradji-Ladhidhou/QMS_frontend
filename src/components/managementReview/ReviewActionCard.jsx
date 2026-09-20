import { Link } from 'react-router-dom';
import { ClipboardCheck, Sparkles, Trash2 } from 'lucide-react';
import { ACTION_STATUS_LABELS, ACTION_STATUS_OPTIONS, ACTION_STATUS_STYLES } from '../../lib/managementReviewActions.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Une action décidée : description, responsable, échéance, statut (modifiables par admin/manager, enregistrés
// dès le changement), CAPA liée. Les autres rôles voient les mêmes informations en lecture seule.
export default function ReviewActionCard({ action, users, canManage, onPatch, onDelete, onCreateCapa }) {
  const status = action.effective_status || action.status;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-sm text-slate-800">
          {action.description}
          {action.source === 'ai' && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-violet-700">
              <Sparkles size={10} />
              IA
            </span>
          )}
        </p>
        {canManage && (
          <button type="button" onClick={() => onDelete(action)} aria-label="Supprimer l'action" className="shrink-0 p-1 text-slate-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {canManage ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-slate-500">Responsable</label>
            <select value={action.owner || ''} onChange={(e) => onPatch(action.id, { owner: e.target.value || null })} className={FIELD_CLASS}>
              <option value="">Non assigné</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-slate-500">Échéance</label>
            <input type="date" value={action.due_date || ''} onChange={(e) => onPatch(action.id, { due_date: e.target.value || null })} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-slate-500">Statut</label>
            <select value={action.status} onChange={(e) => onPatch(action.id, { status: e.target.value })} className={FIELD_CLASS}>
              {ACTION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Responsable : {action.owner_user?.full_name || '—'}</span>
          <span>· Échéance : {action.due_date ? new Date(`${action.due_date}T12:00:00`).toLocaleDateString('fr-FR') : '—'}</span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STATUS_STYLES[status]}`}>{ACTION_STATUS_LABELS[status]}</span>
        {action.status_derived && <span className="text-xs text-slate-500">déduit : la CAPA liée est clôturée</span>}
        {action.is_overdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Échéance dépassée</span>}
      </div>

      {action.linked_capa ? (
        <Link
          to={`/capas/${action.linked_capa.id}`}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          <ClipboardCheck size={14} />
          Voir la CAPA liée — {action.linked_capa.number}
        </Link>
      ) : (
        canManage && (
          <button
            type="button"
            onClick={() => onCreateCapa(action)}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            <ClipboardCheck size={14} />
            Créer une CAPA
          </button>
        )
      )}
    </div>
  );
}
