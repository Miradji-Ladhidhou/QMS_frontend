import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import {
  RISK_TYPE_LABELS,
  RISK_STATUS_LABELS,
  LIKELIHOOD_LABELS,
  IMPACT_LABELS,
  riskLevel,
  RISK_LEVEL_CELL_STYLES,
} from '../lib/riskStatus.js';
import RiskStatusBadge from '../components/RiskStatusBadge.jsx';
import RiskScoreBadge from '../components/RiskScoreBadge.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Matrice 5x5 : gravité en ligne (5 en haut, 1 en bas — convention standard), probabilité en
// colonne (1 à gauche, 5 à droite). Compte les risques actifs (hors clôturé/accepté) par
// cellule likelihood x impact, colorée selon la bande de score de cette cellule.
function RiskMatrix({ risks }) {
  const counts = {};
  for (const risk of risks) {
    if (risk.status === 'closed' || risk.status === 'accepted') continue;
    const key = `${risk.likelihood}-${risk.impact}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  const impacts = [5, 4, 3, 2, 1];
  const likelihoods = [1, 2, 3, 4, 5];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Matrice des risques</h2>
      <div className="inline-block">
        <div className="flex">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-xs font-medium text-slate-500">Probabilité →</div>
        </div>
        {impacts.map((impact) => (
          <div key={impact} className="flex items-center">
            <div className="w-24 shrink-0 pr-2 text-right text-xs text-slate-500">{IMPACT_LABELS[impact]}</div>
            {likelihoods.map((likelihood) => {
              const score = likelihood * impact;
              const level = riskLevel(score);
              const count = counts[`${likelihood}-${impact}`] || 0;
              return (
                <div
                  key={likelihood}
                  title={`Probabilité ${likelihood} × Gravité ${impact} = ${score}`}
                  className={`flex h-14 w-14 shrink-0 items-center justify-center border border-white text-sm font-semibold text-slate-800 ${RISK_LEVEL_CELL_STYLES[level]}`}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-1 flex">
          <div className="w-24 shrink-0" />
          {likelihoods.map((likelihood) => (
            <div key={likelihood} className="w-14 shrink-0 text-center text-xs text-slate-400">
              {likelihood}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Gravité ↑ — les risques traités/acceptés/clôturés n'apparaissent pas ici.</p>
    </div>
  );
}

function NewRiskModal({ users, services, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    type: 'risk',
    category: '',
    description: '',
    service_id: '',
    owner: '',
    likelihood: '3',
    impact: '3',
    review_date: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        type: form.type,
        category: form.category || undefined,
        description: form.description || undefined,
        service_id: form.service_id || undefined,
        owner: form.owner || undefined,
        likelihood: Number(form.likelihood),
        impact: Number(form.impact),
        review_date: form.review_date || undefined,
      };
      const { data } = await api.post('/risks', payload);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le risque.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau risque / opportunité</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              placeholder="Ex : Dépendance à un fournisseur unique"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(RISK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
              <input
                type="text"
                placeholder="Ex : Fournisseurs, Processus..."
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Probabilité</label>
              <select
                value={form.likelihood}
                onChange={(e) => updateField('likelihood', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(LIKELIHOOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} — {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
              <select
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(IMPACT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} — {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service concerné</label>
              <select
                value={form.service_id}
                onChange={(e) => updateField('service_id', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Aucun</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
              <select
                value={form.owner}
                onChange={(e) => updateField('owner', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">À désigner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine date de revue</label>
            <input
              type="date"
              value={form.review_date}
              onChange={(e) => updateField('review_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Risks() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [risks, setRisks] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const [risksRes, usersRes, servicesRes] = await Promise.all([
        api.get('/risks', { params }),
        api.get('/users'),
        api.get('/services'),
      ]);
      setRisks(risksRes.data);
      setUsers(usersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
    } catch {
      setError('Impossible de charger le registre des risques.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter]);

  function handleCreated(risk) {
    setIsModalOpen(false);
    navigate(`/risks/${risk.id}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Registre des risques</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouveau risque
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!loading && risks.length > 0 && (
        <div className="mt-4">
          <RiskMatrix risks={risks} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les types</option>
          {Object.entries(RISK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(RISK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : risks.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucun risque enregistré pour l'instant</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Créer le premier risque
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {risks.map((risk) => (
            <div
              key={risk.id}
              onClick={() => navigate(`/risks/${risk.id}`)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{risk.title}</p>
                <p className="truncate text-sm text-slate-500">
                  {RISK_TYPE_LABELS[risk.type]}
                  {risk.category ? ` · ${risk.category}` : ''}
                  {risk.owner_user ? ` · ${risk.owner_user.full_name}` : ''}
                  {risk.review_date ? ` · Revue le ${formatDate(risk.review_date)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <RiskScoreBadge score={risk.risk_score} />
                <RiskStatusBadge status={risk.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewRiskModal users={users} services={services} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
