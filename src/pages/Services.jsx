import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Ban, CheckCircle2, Pencil, Plus, Trash2, UserMinus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import SortSelect from '../components/SortSelect.jsx';

const SERVICE_SORT_OPTIONS = [
  { key: 'name', label: 'nom' },
  { key: 'is_active', label: 'statut' },
];

function ServiceModal({ service, onClose, onSaved }) {
  const isNew = !service;
  const [name, setName] = useState(service?.name || '');
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    // onSaved() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = isNew
        ? await api.post('/services', { name })
        : await api.patch(`/services/${service.id}`, { name, is_active: isActive });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le service.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isNew ? 'Nouveau service' : 'Modifier le service'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {!isNew && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Service actif
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ServiceCard({ service, allManagers, onUpdated, onDeleted }) {
  const [managers, setManagers] = useState(null);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  async function loadManagers() {
    try {
      const { data } = await api.get(`/services/${service.id}/managers`);
      setManagers(data);
    } catch {
      setManagers([]);
    }
  }

  useEffect(() => {
    loadManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id]);

  async function handleToggleActive() {
    setError('');
    setToggling(true);

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.patch(`/services/${service.id}`, { is_active: !service.is_active });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le service.');
      setToggling(false);
      return;
    }
    setToggling(false);
    onUpdated(response.data);
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement le service "${service.name}" ?`)) return;

    setError('');
    setDeleting(true);

    // onDeleted() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    try {
      await api.delete(`/services/${service.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ce service.');
      setDeleting(false);
      return;
    }
    setDeleting(false);
    onDeleted(service.id);
  }

  async function handleAssign(event) {
    event.preventDefault();
    if (!selectedManagerId) return;

    setAssigning(true);
    try {
      await api.post(`/services/${service.id}/assign-user`, { user_id: selectedManagerId });
      setSelectedManagerId('');
      await loadManagers();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de rattacher ce manager.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(managerId) {
    setRemovingId(managerId);
    try {
      await api.delete(`/services/${service.id}/assign-user/${managerId}`);
      setManagers((prev) => prev.filter((m) => m.id !== managerId));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de retirer ce manager.');
    } finally {
      setRemovingId(null);
    }
  }

  const assignedIds = new Set((managers || []).map((m) => m.id));
  const availableManagers = allManagers.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{service.name}</p>
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              service.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {service.is_active ? <CheckCircle2 size={12} /> : <Ban size={12} />}
            {service.is_active ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Modifier"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Supprimer"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-60"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleToggleActive}
        disabled={toggling}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          service.is_active
            ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            : 'bg-primary text-white hover:bg-primary-700'
        }`}
      >
        <Ban size={16} />
        {toggling ? 'Mise à jour...' : service.is_active ? 'Désactiver' : 'Réactiver'}
      </button>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Managers rattachés</p>

        {managers === null ? (
          <div className="mt-2 h-8 animate-pulse rounded-md bg-slate-100" />
        ) : managers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Aucun manager rattaché.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {managers.map((manager) => (
              <li key={manager.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-700">{manager.full_name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(manager.id)}
                  disabled={removingId === manager.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                >
                  <UserMinus size={14} />
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}

        {availableManagers.length > 0 && (
          <form onSubmit={handleAssign} className="mt-3 flex gap-2">
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Ajouter un manager...</option>
              {availableManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedManagerId || assigning}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {assigning ? '...' : 'Ajouter'}
            </button>
          </form>
        )}
      </div>

      {editing && (
        <ServiceModal
          service={service}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

export default function Services() {
  const currentUser = useCurrentUser();
  const [services, setServices] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { sorted: sortedServices, sortKey, direction, setSortKey, toggleSort } = useSort(
    services,
    (service, key) => service[key],
    'name',
    'asc'
  );

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [{ data: servicesData }, { data: usersData }] = await Promise.all([api.get('/services'), api.get('/users')]);
      setServices(servicesData);
      setManagers(usersData.filter((u) => u.role === 'manager'));
    } catch {
      setError('Impossible de charger les services.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadData();
    }
  }, [currentUser?.role]);

  // currentUser === null tant que non chargé (voir useCurrentUser) : on attend avant de
  // décider d'un accès refusé, pour ne pas rediriger un admin le temps que son profil arrive.
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  function handleCreated(service) {
    setServices((prev) => [...prev, service].sort((a, b) => a.name.localeCompare(b.name)));
    setIsCreating(false);
  }

  function handleUpdated(updated) {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  }

  function handleDeleted(id) {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Services</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouveau service
        </button>
      </div>

      {services.length > 0 && (
        <div className="mt-4">
          <SortSelect
            options={SERVICE_SORT_OPTIONS}
            sortKey={sortKey}
            direction={direction}
            onChangeKey={setSortKey}
            onToggleDirection={() => toggleSort(sortKey)}
          />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 flex flex-col gap-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucun service pour l'instant.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {sortedServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              allManagers={managers}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {isCreating && <ServiceModal onClose={() => setIsCreating(false)} onSaved={handleCreated} />}
    </div>
  );
}
