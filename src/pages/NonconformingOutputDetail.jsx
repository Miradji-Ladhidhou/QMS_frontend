import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import {
  NONCONFORMING_OUTPUT_STATUS_LABELS,
  NONCONFORMING_OUTPUT_DISPOSITION_LABELS,
} from '../lib/nonconformingOutputStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import NonconformingOutputStatusBadge from '../components/NonconformingOutputStatusBadge.jsx';
import NonconformingOutputDispositionBadge from '../components/NonconformingOutputDispositionBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function EditOutputModal({ output, users, services, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: output.title,
    description: output.description || '',
    detected_at: output.detected_at,
    service_id: output.service_id || '',
    disposition: output.disposition,
    action_taken: output.action_taken || '',
    concession_reference: output.concession_reference || '',
    customer_informed: output.customer_informed,
    decided_by: output.decided_by || '',
    category_id: output.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(output.is_private_to_me));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || null;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('nonconforming_output');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le parent ne doit jamais se faire passer pour un échec de la modification.
    let data;
    try {
      ({ data } = await api.patch(`/nonconforming-outputs/${output.id}`, {
        title: form.title,
        description: form.description || null,
        detected_at: form.detected_at,
        service_id: form.service_id || null,
        disposition: form.disposition,
        action_taken: form.action_taken || null,
        concession_reference: form.concession_reference || null,
        customer_informed: form.customer_informed,
        decided_by: form.decided_by || null,
        category_id: categoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette non-conformité.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
  }

  const isConcession = form.disposition === 'concession';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier la non-conformité</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de détection</label>
            <input
              type="date"
              required
              value={form.detected_at}
              onChange={(e) => updateField('detected_at', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <AutoTextarea
              rows={2}
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

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
            <label className="mb-1 block text-sm font-medium text-slate-700">Traitement (disposition)</label>
            <select
              value={form.disposition}
              onChange={(e) => updateField('disposition', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(NONCONFORMING_OUTPUT_DISPOSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {isConcession && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Référence de la dérogation{' '}
                <span className="font-normal text-slate-400">(requise pour clôturer)</span>
              </label>
              <input
                type="text"
                required={isConcession}
                placeholder="Ex : DER-2026-014"
                value={form.concession_reference}
                onChange={(e) => updateField('concession_reference', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Action menée <span className="font-normal text-slate-400">(requise pour clôturer)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.action_taken}
              onChange={(e) => updateField('action_taken', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Décidé par</label>
            <select
              value={form.decided_by}
              onChange={(e) => updateField('decided_by', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Non renseigné (par défaut, le clôturant)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.customer_informed}
                onChange={(e) => updateField('customer_informed', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Client informé
            </label>
          </div>

          <CategoryVisibilityField
            categories={categories}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateOutputCapaModal({ outputId, output, users, services, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: `Non-conformité produit/service — ${output.title}`,
    service_id: output.service_id || '',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    root_cause: '',
    corrective_action: output.action_taken || '',
    preventive_action: '',
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

    const payload = {
      title: form.title,
      service_id: form.service_id || undefined,
      priority: form.priority,
      severity: form.priority,
      assigned_to: form.assigned_to || undefined,
      due_date: form.due_date || undefined,
      root_cause: form.root_cause || undefined,
      corrective_action: form.corrective_action || undefined,
      preventive_action: form.preventive_action || undefined,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post(`/nonconforming-outputs/${outputId}/create-capa`, payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cette non-conformité</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet de la CAPA</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause identifiée</label>
            <AutoTextarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => updateField('root_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>
            <AutoTextarea
              rows={2}
              value={form.corrective_action}
              onChange={(e) => updateField('corrective_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
            <AutoTextarea
              rows={2}
              value={form.preventive_action}
              onChange={(e) => updateField('preventive_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Assigné à</label>
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

export default function NonconformingOutputDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [output, setOutput] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);

  async function loadOutput() {
    setLoading(true);
    try {
      const { data } = await api.get(`/nonconforming-outputs/${id}`);
      setOutput(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger cette non-conformité.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOutput();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'nonconforming_output' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/nonconforming-outputs/${id}`, { status });
      setOutput((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le statut.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${output.title}" ?`)) return;
    try {
      await api.delete(`/nonconforming-outputs/${id}`);
      navigate('/nonconforming-outputs');
    } catch {
      setError('Impossible de supprimer cette non-conformité.');
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !output) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!output) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/nonconforming-outputs')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{output.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <NonconformingOutputDispositionBadge disposition={output.disposition} />
          {canManage ? (
            <select
              value={output.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(NONCONFORMING_OUTPUT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <NonconformingOutputStatusBadge status={output.status} />
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                aria-label="Modifier"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Supprimer"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Date de détection</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(output.detected_at)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{output.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Décidé par</p>
          <p className="text-sm font-medium text-slate-800">{output.decider?.full_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Client informé</p>
          <p className="text-sm font-medium text-slate-800">{output.customer_informed ? 'Oui' : 'Non'}</p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-500">Description</p>
          <p className="text-sm text-slate-700">{output.description}</p>
        </div>
        {output.action_taken && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Action menée</p>
            <p className="text-sm text-slate-700">{output.action_taken}</p>
          </div>
        )}
        {output.disposition === 'concession' && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Référence de la dérogation</p>
            <p className="text-sm text-slate-700">{output.concession_reference || '—'}</p>
          </div>
        )}
        {output.closed_at && (
          <div>
            <p className="text-xs text-slate-500">Clôturée le</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(output.closed_at)}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {output.linked_capa ? (
          <Link
            to={`/capas/${output.linked_capa.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ClipboardCheck size={18} />
            Voir la CAPA liée — {output.linked_capa.number}
          </Link>
        ) : (
          canManage && (
            <button
              type="button"
              onClick={() => setIsCapaModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <ClipboardCheck size={18} />
              Créer une CAPA
            </button>
          )
        )}
      </div>

      {isEditModalOpen && (
        <EditOutputModal
          output={output}
          users={users}
          services={services}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setOutput((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isCapaModalOpen && (
        <CreateOutputCapaModal
          outputId={id}
          output={output}
          users={users}
          services={services}
          onClose={() => setIsCapaModalOpen(false)}
          onCreated={(capa) => {
            setOutput((prev) => ({ ...prev, linked_capa: capa }));
            setIsCapaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
