import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { COMPLAINT_STATUS_LABELS } from '../lib/complaintStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import ComplaintStatusBadge from '../components/ComplaintStatusBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const COMPLAINT_SORT_OPTIONS = [
  { key: 'received_date', label: 'date de réception' },
  { key: 'customer_name', label: 'client' },
  { key: 'assigned', label: 'responsable' },
  { key: 'severity', label: 'gravité' },
  { key: 'status', label: 'statut' },
];

function getComplaintSortValue(complaint, key) {
  if (key === 'assigned') return complaint.assigned?.full_name || '';
  return complaint[key];
}

function NewComplaintModal({ users, services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_contact: '',
    received_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    description: '',
    product_service: '',
    severity: 'medium',
    service_id: '',
    category_id: '',
    assigned_to: '',
  });
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || undefined;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('complaint');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      customer_name: form.customer_name,
      customer_contact: form.customer_contact || undefined,
      received_date: form.received_date,
      due_date: form.due_date || undefined,
      description: form.description,
      product_service: form.product_service || undefined,
      severity: form.severity,
      service_id: form.service_id || undefined,
      category_id: categoryId,
      assigned_to: form.assigned_to || undefined,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/complaints', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la réclamation.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle réclamation</h2>
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
                placeholder="Email ou téléphone"
                value={form.customer_contact}
                onChange={(e) => updateField('customer_contact', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de la réclamation</label>
            <AutoTextarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Produit / service concerné</label>
            <input
              type="text"
              value={form.product_service}
              onChange={(e) => updateField('product_service', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de réception</label>
              <input
                type="date"
                required
                value={form.received_date}
                onChange={(e) => updateField('received_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
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
            {submitting ? 'Création...' : 'Enregistrer la réclamation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [complaintsRes, usersRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/complaints', { params: statusFilter ? { status: statusFilter } : {} }),
        api.get('/users'),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'complaint' } }),
      ]);
      setComplaints(complaintsRes.data);
      setUsers(usersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les réclamations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const { sorted: sortedComplaints, sortKey, direction, setSortKey, toggleSort } = useSort(
    complaints,
    getComplaintSortValue,
    'received_date',
    'desc'
  );

  function handleCreated(complaint) {
    setIsModalOpen(false);
    navigate(`/complaints/${complaint.id}`);
  }

  function handleExportCsv() {
    const headers = ['Client', 'Description', 'Gravité', 'Statut', 'Date de réception', 'Échéance de réponse', 'Assigné'];
    const rows = complaints.map((complaint) => [
      complaint.customer_name,
      complaint.description || '',
      CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
      COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
      formatDate(complaint.received_date),
      formatDate(complaint.due_date),
      complaint.assigned?.full_name || '',
    ]);
    exportToCsv(`reclamations-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'customer_name', label: 'Client', width: 0.2 },
        { key: 'description', label: 'Description', width: 0.32 },
        { key: 'severity', label: 'Gravité', width: 0.12 },
        { key: 'status', label: 'Statut', width: 0.14 },
        { key: 'due_date', label: 'Échéance', width: 0.12 },
        { key: 'assigned', label: 'Assigné', width: 0.1 },
      ];
      const rows = complaints.map((complaint) => ({
        customer_name: complaint.customer_name,
        description: complaint.description || '',
        severity: CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
        status: COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
        due_date: formatDate(complaint.due_date),
        assigned: complaint.assigned?.full_name || '',
      }));
      await exportToPdf(`reclamations-${new Date().toISOString().slice(0, 10)}.pdf`, 'Réclamations clients', columns, rows, {
        subtitle: `${complaints.length} réclamation${complaints.length > 1 ? 's' : ''}`,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Réclamations clients</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={complaints.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || complaints.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouvelle réclamation
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={COMPLAINT_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucune réclamation pour l'instant</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Enregistrer la première réclamation
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedComplaints.map((complaint) => (
            <div
              key={complaint.id}
              onClick={() => navigate(`/complaints/${complaint.id}`)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{complaint.customer_name}</p>
                <p className="truncate text-sm text-slate-500">
                  {formatDate(complaint.received_date)}
                  {complaint.assigned ? ` · ${complaint.assigned.full_name}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CapaPriorityBadge priority={complaint.severity} />
                <ComplaintStatusBadge status={complaint.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewComplaintModal
          users={users}
          services={services}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
