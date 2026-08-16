import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import {
  CAPA_EFFECTIVENESS_LABELS,
  CAPA_PRIORITY_LABELS,
  CAPA_SEVERITY_LABELS,
  CAPA_STATUS_LABELS,
} from '../lib/capaStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CapaSeverityBadge from '../components/CapaSeverityBadge.jsx';
import CapaStatusBadge from '../components/CapaStatusBadge.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Ajoute `days` jours à la date du jour, au format yyyy-mm-dd attendu par <input type="date">.
function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function CounterCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function NewCapaModal({ users, priorityDelays, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    service: '',
    description: '',
    origin: '',
    severity: 'medium',
    priority: 'medium',
    due_date: priorityDelays ? addDaysToToday(priorityDelays.medium) : '',
    assigned_to: '',
  });
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Le champ Échéance se met à jour tout seul en fonction de la priorité et du délai
  // paramétré (Paramètres > CAPA), tant que l'utilisateur ne l'a pas modifié à la main.
  function handlePriorityChange(priority) {
    setForm((prev) => ({
      ...prev,
      priority,
      due_date: !dueDateTouched && priorityDelays ? addDaysToToday(priorityDelays[priority]) : prev.due_date,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        service: form.service || undefined,
        description: form.description || undefined,
        severity: form.severity,
        priority: form.priority,
        origin: form.origin || undefined,
        due_date: form.due_date || undefined,
        assigned_to: form.assigned_to || undefined,
      };
      const { data } = await api.post('/capas', payload);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle CAPA</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
            <input
              type="text"
              placeholder="Production, Qualité, Logistique..."
              value={form.service}
              onChange={(e) => updateField('service', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de la non-conformité</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Origine</label>
            <input
              type="text"
              placeholder="Audit, réclamation client, non-conformité..."
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
              <select
                value={form.severity}
                onChange={(e) => updateField('severity', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(CAPA_SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Échéance
              {!dueDateTouched && <span className="ml-1 font-normal text-slate-400">(suggérée selon la priorité)</span>}
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => {
                setDueDateTouched(true);
                updateField('due_date', e.target.value);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Responsable assigné</label>
            <select
              value={form.assigned_to}
              onChange={(e) => updateField('assigned_to', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Non assigné</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer la CAPA'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Capas() {
  const navigate = useNavigate();
  const [capas, setCapas] = useState([]);
  const [users, setUsers] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [capasRes, usersRes, delaysRes] = await Promise.all([
        api.get('/capas'),
        api.get('/users'),
        api.get('/capas/priority-delays'),
      ]);
      setCapas(capasRes.data);
      setUsers(usersRes.data);
      setPriorityDelays(delaysRes.data);
    } catch {
      setError('Impossible de charger les CAPA.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const counters = useMemo(
    () => ({
      open: capas.filter((capa) => capa.status === 'open').length,
      in_progress: capas.filter((capa) => capa.status === 'in_progress').length,
      closed: capas.filter((capa) => capa.status === 'closed').length,
    }),
    [capas]
  );

  function handleExportCsv() {
    const headers = [
      'Numéro',
      'Date',
      'Service',
      'Description de la non-conformité',
      'Gravité',
      'Priorité',
      'Délai de traitement',
      'Cause identifiée',
      'Action corrective',
      'Action préventive',
      'Responsable',
      'Statut',
      'Vérification efficacité',
      'Date clôture',
      'Commentaire',
    ];
    const rows = capas.map((capa) => [
      capa.number,
      formatDate(capa.created_at),
      capa.service || '',
      capa.description || '',
      CAPA_SEVERITY_LABELS[capa.severity] || capa.severity,
      CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
      formatDate(capa.due_date),
      capa.root_cause || '',
      capa.corrective_action || '',
      capa.preventive_action || '',
      capa.assigned?.full_name || '',
      CAPA_STATUS_LABELS[capa.status] || capa.status,
      CAPA_EFFECTIVENESS_LABELS[capa.effectiveness_verified] || '',
      formatDate(capa.closed_at),
      capa.comment || '',
    ]);

    exportToCsv(`capa-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function handleCreated(newCapa) {
    setCapas((prev) => [newCapa, ...prev]);
    setIsModalOpen(false);
  }

  async function handleStatusChange(event, capa) {
    event.stopPropagation();
    const status = event.target.value;
    setUpdatingId(capa.id);

    try {
      const { data } = await api.patch(`/capas/${capa.id}`, { status });
      setCapas((prev) => prev.map((item) => (item.id === capa.id ? data : item)));
    } catch {
      setError('Impossible de mettre à jour le statut.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">CAPA</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={capas.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouvelle CAPA
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <CounterCard label="Ouvertes" value={counters.open} accent="text-blue-700" />
        <CounterCard label="En cours" value={counters.in_progress} accent="text-amber-700" />
        <CounterCard label="Clôturées" value={counters.closed} accent="text-emerald-700" />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : capas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune CAPA pour l'instant.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {capas.map((capa) => (
              <div
                key={capa.id}
                onClick={() => navigate(`/capas/${capa.id}`)}
                className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm ${
                  capa.status === 'overdue' ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{capa.title}</p>
                    <p className="text-sm text-slate-500">
                      {capa.number} · {capa.service || 'Service non précisé'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <CapaSeverityBadge severity={capa.severity} />
                    <CapaPriorityBadge priority={capa.priority} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <CapaStatusBadge status={capa.status} />
                  <span className="text-sm text-slate-500">Échéance : {formatDate(capa.due_date)}</span>
                </div>
                <select
                  value={capa.status}
                  disabled={updatingId === capa.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleStatusChange(e, capa)}
                  className="mt-3 w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {Object.entries(CAPA_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Objet</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Gravité</th>
                  <th className="px-4 py-3">Priorité</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {capas.map((capa) => (
                  <tr
                    key={capa.id}
                    onClick={() => navigate(`/capas/${capa.id}`)}
                    className={`cursor-pointer hover:bg-slate-50 ${capa.status === 'overdue' ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{capa.number}</td>
                    <td className="px-4 py-3 text-slate-700">{capa.title}</td>
                    <td className="px-4 py-3 text-slate-600">{capa.service || '—'}</td>
                    <td className="px-4 py-3">
                      <CapaSeverityBadge severity={capa.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <CapaPriorityBadge priority={capa.priority} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(capa.due_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CapaStatusBadge status={capa.status} />
                        <select
                          value={capa.status}
                          disabled={updatingId === capa.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(e, capa)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          {Object.entries(CAPA_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <NewCapaModal
          users={users}
          priorityDelays={priorityDelays}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
