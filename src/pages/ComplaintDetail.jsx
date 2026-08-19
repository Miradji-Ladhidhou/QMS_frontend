import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { COMPLAINT_STATUS_LABELS } from '../lib/complaintStatus.js';
import ComplaintStatusBadge from '../components/ComplaintStatusBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function EditComplaintModal({ complaint, users, services, onClose, onUpdated }) {
  const [form, setForm] = useState({
    customer_name: complaint.customer_name,
    customer_contact: complaint.customer_contact || '',
    received_date: complaint.received_date,
    due_date: complaint.due_date || '',
    description: complaint.description,
    product_service: complaint.product_service || '',
    severity: complaint.severity,
    service_id: complaint.service_id || '',
    assigned_to: complaint.assigned_to || '',
    root_cause: complaint.root_cause || '',
    resolution: complaint.resolution || '',
    resolution_date: complaint.resolution_date || '',
    customer_satisfied: complaint.customer_satisfied === null ? '' : String(complaint.customer_satisfied),
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
      const { data } = await api.patch(`/complaints/${complaint.id}`, {
        ...form,
        customer_satisfied: form.customer_satisfied === '' ? null : form.customer_satisfied === 'true',
      });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette réclamation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier la réclamation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
              <input
                type="text"
                required
                value={form.customer_name}
                onChange={(e) => updateField('customer_name', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
              <input
                type="text"
                value={form.customer_contact}
                onChange={(e) => updateField('customer_contact', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={2}
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
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
                {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Échéance de réponse</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause identifiée</label>
            <textarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => updateField('root_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Résolution apportée</label>
            <textarea
              rows={2}
              value={form.resolution}
              onChange={(e) => updateField('resolution', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de résolution</label>
              <input
                type="date"
                value={form.resolution_date}
                onChange={(e) => updateField('resolution_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client satisfait ?</label>
              <select
                value={form.customer_satisfied}
                onChange={(e) => updateField('customer_satisfied', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Non renseigné</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
          </div>

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

function CreateCapaFromComplaintModal({ complaintId, complaint, users, services, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    service_id: '',
    priority: 'medium',
    severity: 'medium',
    assigned_to: '',
    due_date: '',
    root_cause: '',
    corrective_action: '',
    preventive_action: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAiGenerated(suggestion) {
    setForm((prev) => ({
      ...prev,
      priority: suggestion.overall_priority || prev.priority,
      severity: suggestion.overall_priority || prev.severity,
      root_cause: suggestion.root_causes?.length ? suggestion.root_causes.map((c) => `- ${c}`).join('\n') : prev.root_cause,
      preventive_action: suggestion.preventive_actions?.length
        ? suggestion.preventive_actions.map((a) => `- ${a}`).join('\n')
        : prev.preventive_action,
    }));
  }

  function handleAiSelectAction(action) {
    updateField('corrective_action', action.description ? `${action.title}\n\n${action.description}` : action.title);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        service_id: form.service_id || undefined,
        priority: form.priority,
        severity: form.severity,
        assigned_to: form.assigned_to || undefined,
        due_date: form.due_date || undefined,
        root_cause: form.root_cause || undefined,
        corrective_action: form.corrective_action || undefined,
        preventive_action: form.preventive_action || undefined,
      };
      const { data } = await api.post(`/complaints/${complaintId}/create-capa`, payload);
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
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cette réclamation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

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

          <AiCapaSuggestion
            context={`Réclamation client de ${complaint.customer_name} : ${complaint.description}`}
            onGenerated={handleAiGenerated}
            onSelectAction={handleAiSelectAction}
          />

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
            <textarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => updateField('root_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>
            <textarea
              rows={2}
              value={form.corrective_action}
              onChange={(e) => updateField('corrective_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
            <textarea
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

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [complaint, setComplaint] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);

  async function loadComplaint() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/complaints/${id}`);
      setComplaint(data);
    } catch {
      setError('Impossible de charger cette réclamation.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaint();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/complaints/${id}`, { status });
      setComplaint((prev) => ({ ...prev, ...data }));
    } catch {
      setError('Impossible de mettre à jour le statut.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement la réclamation de "${complaint.customer_name}" ?`)) return;
    try {
      await api.delete(`/complaints/${id}`);
      navigate('/complaints');
    } catch {
      setError('Impossible de supprimer cette réclamation.');
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !complaint) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!complaint) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/complaints')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{complaint.customer_name}</h1>
        <div className="flex items-center gap-2">
          <CapaPriorityBadge priority={complaint.severity} />
          {canManage ? (
            <select
              value={complaint.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <ComplaintStatusBadge status={complaint.status} />
          )}
          {!canManage && <span className="text-xs text-slate-400">Lecture seule</span>}
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

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Reçue le</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(complaint.received_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Échéance de réponse</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(complaint.due_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{complaint.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Assigné à</p>
          <p className="text-sm font-medium text-slate-800">{complaint.assigned?.full_name || 'Non assigné'}</p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-500">Description</p>
          <p className="text-sm text-slate-700">{complaint.description}</p>
        </div>
        {complaint.product_service && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Produit / service concerné</p>
            <p className="text-sm text-slate-700">{complaint.product_service}</p>
          </div>
        )}
      </div>

      {(complaint.root_cause || complaint.resolution) && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
          {complaint.root_cause && (
            <div>
              <p className="text-xs text-slate-500">Cause identifiée</p>
              <p className="text-sm text-slate-700">{complaint.root_cause}</p>
            </div>
          )}
          {complaint.resolution && (
            <div>
              <p className="text-xs text-slate-500">Résolution apportée</p>
              <p className="text-sm text-slate-700">{complaint.resolution}</p>
              {complaint.resolution_date && (
                <p className="mt-1 text-xs text-slate-400">Le {formatDate(complaint.resolution_date)}</p>
              )}
            </div>
          )}
          {complaint.customer_satisfied !== null && (
            <div>
              <p className="text-xs text-slate-500">Client satisfait</p>
              <p className="text-sm text-slate-700">{complaint.customer_satisfied ? 'Oui' : 'Non'}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {complaint.linked_capa ? (
          <Link
            to={`/capas/${complaint.linked_capa.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ClipboardCheck size={18} />
            Voir la CAPA liée — {complaint.linked_capa.number}
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
        <EditComplaintModal
          complaint={complaint}
          users={users}
          services={services}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setComplaint((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isCapaModalOpen && (
        <CreateCapaFromComplaintModal
          complaintId={id}
          complaint={complaint}
          users={users}
          services={services}
          onClose={() => setIsCapaModalOpen(false)}
          onCreated={(capa) => {
            setComplaint((prev) => ({ ...prev, linked_capa: capa }));
            setIsCapaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
