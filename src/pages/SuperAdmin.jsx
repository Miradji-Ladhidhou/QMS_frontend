import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  History,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import SortableTh from '../components/SortableTh.jsx';
import SortSelect from '../components/SortSelect.jsx';

const TENANT_SORT_OPTIONS = [
  { key: 'created_at', label: 'date de création' },
  { key: 'name', label: 'nom' },
  { key: 'plan', label: 'plan' },
  { key: 'user_count', label: 'utilisateurs' },
  { key: 'is_suspended', label: 'statut' },
];

const LINE_COLOR = '#1F3864';
const GRID_COLOR = '#e2e8f0';
const MUTED_COLOR = '#94a3b8';

const PLAN_LABELS = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', member: 'Membre' };
const ACTION_LABELS = {
  tenant_suspended: 'Tenant suspendu',
  tenant_reactivated: 'Tenant réactivé',
  tenant_created: 'Tenant créé',
  tenant_updated: 'Tenant modifié',
  tenant_deleted: 'Tenant supprimé',
  user_created: 'Utilisateur créé',
  user_updated: 'Utilisateur modifié',
  user_deleted: 'Utilisateur supprimé',
  db_backup_created: 'Sauvegarde créée',
  db_backup_downloaded: 'Sauvegarde téléchargée',
  db_restored_from_drive: 'Base restaurée depuis Google Drive',
};
const MODULE_LABELS = {
  documents: 'Documents',
  capas: 'CAPA',
  qqoqccp: 'QQOQCCP',
  trainings: 'Formations',
  kpis: 'KPI',
  tasks: 'Tâches',
  employees: 'Personnel',
  services: 'Services',
};
const TABS = [
  { id: 'tenants', label: 'Tenants' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'audit', label: "Journal d'audit" },
  { id: 'system', label: 'Système' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function HealthWidget() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    function load() {
      api
        .get('/super-admin/health')
        .then(({ data }) => {
          if (!cancelled) setHealth(data);
        })
        .catch(() => {
          if (!cancelled) setError("Impossible de vérifier l'état du système.");
        });
    }

    load();
    // Un widget d'état, pas un vrai monitoring d'infra (voir commentaire de la route
    // backend) : 30s suffit largement à repérer une panne sans spammer l'API.
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <XCircle size={18} />
        {error}
      </div>
    );
  }

  if (!health) {
    return <div className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  const isHealthy = health.api_status === 'ok' && health.db_status === 'ok';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3 text-sm ${
        isHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <span className={`flex items-center gap-1.5 font-medium ${isHealthy ? 'text-emerald-700' : 'text-red-700'}`}>
        {isHealthy ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {isHealthy ? 'Système opérationnel' : 'Problème détecté'}
      </span>
      <span className="flex items-center gap-1.5 text-slate-600">
        <Activity size={14} />
        Latence base de données : {health.db_latency_ms} ms
      </span>
      <span className="text-slate-500">Process actif depuis {formatUptime(health.process_uptime_seconds)}</span>
      <span className="text-xs text-slate-400">Vérifié à {formatDateTime(health.checked_at)}</span>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Remplace window.confirm()/window.prompt() : certains contextes (webview mobile, PWA
// installée) ne les supportent pas du tout et lèvent une exception (constaté en pratique sur
// la suppression de tenant). Une modale maison fonctionne partout où React fonctionne.
function ConfirmModal({ title, message, confirmLabel = 'Confirmer', danger = true, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="whitespace-pre-line text-sm text-slate-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-700'
          }`}
        >
          {busy ? '...' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

// Confirmation renforcée pour une suppression à fort impact (tenant entier) : le nom exact
// doit être retapé, pas juste un clic — plus dur à déclencher par erreur qu'un simple confirm.
function ConfirmTypedModal({ title, message, expectedText, onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed === expectedText;

  async function handleConfirm() {
    if (!matches) return;
    setBusy(true);
    await onConfirm();
    setBusy(false);
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="whitespace-pre-line text-sm text-slate-600">{message}</p>
      <p className="mt-3 text-xs font-medium text-slate-500">
        Tape <span className="font-semibold text-slate-800">{expectedText}</span> pour confirmer :
      </p>
      <input
        type="text"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!matches || busy}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '...' : 'Supprimer définitivement'}
        </button>
      </div>
    </ModalShell>
  );
}

function CreateTenantModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('free');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    // onCreated() volontairement hors du try : voir KpiFormModal (Kpis.jsx) pour l'incident de
    // référence — un bug du handler parent ne doit jamais se faire passer pour un échec de l'appel API.
    let data;
    try {
      ({ data } = await api.post('/super-admin/tenants', { name, plan }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce tenant.');
      setSaving(false);
      return;
    }
    setSaving(false);
    onCreated(data);
  }

  return (
    <ModalShell title="Nouveau tenant" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nom de l'entreprise</label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Plan</label>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Création...' : 'Créer le tenant'}
        </button>
      </form>
    </ModalShell>
  );
}

function InviteUserForm({ tenantId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    // onCreated() volontairement hors du try : voir KpiFormModal (Kpis.jsx) pour l'incident de
    // référence — un bug du handler parent ne doit jamais se faire passer pour un échec de l'appel API.
    try {
      await api.post(`/super-admin/tenants/${tenantId}/users`, { email, full_name: fullName, role });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'inviter cet utilisateur.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setEmail('');
    setFullName('');
    setRole('member');
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <UserPlus size={14} />
        Inviter un utilisateur
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          required
          placeholder="Nom complet"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Envoi...' : "Envoyer l'invitation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function UserRow({ user, currentUserId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [isSuperAdmin, setIsSuperAdmin] = useState(user.is_super_admin);
  const [saving, setSaving] = useState(false);
  const isSelf = user.id === currentUserId;

  async function handleSave() {
    setSaving(true);
    const ok = await onUpdate(user.id, { role, is_active: isActive, is_super_admin: isSuperAdmin });
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <li className="space-y-2 px-3 py-2.5">
        <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={isActive} disabled={isSelf} onChange={(event) => setIsActive(event.target.checked)} />
            Actif
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isSuperAdmin}
              disabled={isSelf}
              onChange={(event) => setIsSuperAdmin(event.target.checked)}
            />
            Super admin
          </label>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? '...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="text-slate-800">
        {user.full_name}
        {user.is_super_admin && (
          <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[11px] font-medium text-purple-700">
            Super admin
          </span>
        )}
      </span>
      <span className="flex items-center gap-2 text-xs text-slate-500">
        {ROLE_LABELS[user.role] || user.role}
        {!user.is_active && <span className="text-red-500">Inactif</span>}
        <button type="button" onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Modifier">
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(user)}
          disabled={isSelf}
          className="p-1 text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </span>
    </li>
  );
}

function TenantDetailModal({ tenantId, currentUserId, onClose, onToggleSuspend, onDeleted, togglingId }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [editingTenant, setEditingTenant] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPlan, setEditPlan] = useState('free');
  const [savingTenant, setSavingTenant] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showDeleteTenant, setShowDeleteTenant] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

  function load() {
    return api
      .get(`/super-admin/tenants/${tenantId}`)
      .then(({ data }) => setDetail(data))
      .catch(() => setError('Impossible de charger la fiche de ce tenant.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // onToggleSuspend renvoie le tenant à jour (voir handleToggleSuspend) : sans réappliquer
  // le résultat ici, le badge de statut de cette fiche resterait figé sur l'ancienne valeur
  // après un clic, même si la liste des tenants derrière la modale se met bien à jour.
  async function handleToggle() {
    const updated = await onToggleSuspend(detail.tenant);
    if (updated) {
      setDetail((prev) => ({ ...prev, tenant: { ...prev.tenant, ...updated } }));
    }
  }

  function startEditTenant() {
    setEditName(detail.tenant.name);
    setEditSlug(detail.tenant.slug);
    setEditPlan(detail.tenant.plan);
    setEditingTenant(true);
  }

  async function handleSaveTenant(event) {
    event.preventDefault();
    setActionError('');
    setSavingTenant(true);
    try {
      const { data } = await api.patch(`/super-admin/tenants/${tenantId}`, {
        name: editName,
        slug: editSlug,
        plan: editPlan,
      });
      setDetail((prev) => ({ ...prev, tenant: { ...prev.tenant, ...data } }));
      setEditingTenant(false);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de modifier ce tenant.');
    } finally {
      setSavingTenant(false);
    }
  }

  async function confirmDeleteTenant() {
    setDeleting(true);
    setActionError('');

    // onDeleted() volontairement hors du try : voir KpiFormModal (Kpis.jsx) pour l'incident de
    // référence — un bug du handler parent ne doit jamais se faire passer pour un échec de l'appel API.
    try {
      await api.delete(`/super-admin/tenants/${tenantId}`);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de supprimer ce tenant.');
      setDeleting(false);
      setShowDeleteTenant(false);
      return;
    }
    onDeleted(tenantId);
  }

  async function handleUpdateUser(userId, update) {
    setActionError('');
    try {
      await api.patch(`/super-admin/users/${userId}`, update);
      await load();
      return true;
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de modifier cet utilisateur.');
      return false;
    }
  }

  async function confirmDeleteUser() {
    setActionError('');
    try {
      await api.delete(`/super-admin/users/${pendingDeleteUser.id}`);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de supprimer cet utilisateur.');
    }
    setPendingDeleteUser(null);
  }

  const isOwnTenant = detail?.users.some((u) => u.id === currentUserId) ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{detail?.tenant.name || 'Fiche tenant'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {actionError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>}

        {!detail && !error && <div className="h-48 animate-pulse rounded-xl bg-slate-100" />}

        {detail && (
          <div className="space-y-5">
            {editingTenant ? (
              <form onSubmit={handleSaveTenant} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Nom"
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(event) => setEditSlug(event.target.value)}
                    placeholder="Slug"
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <select
                  value={editPlan}
                  onChange={(event) => setEditPlan(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  {Object.entries(PLAN_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingTenant}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {savingTenant ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTenant(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>{detail.tenant.slug}</span>
                <span>·</span>
                <span>{PLAN_LABELS[detail.tenant.plan] || detail.tenant.plan}</span>
                <span>·</span>
                <span>Créé le {formatDate(detail.tenant.created_at)}</span>
                {detail.tenant.is_suspended ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    <Ban size={12} />
                    Suspendu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 size={12} />
                    Actif
                  </span>
                )}
                <div className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={startEditTenant}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil size={13} />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={handleToggle}
                    disabled={togglingId === detail.tenant.id || isOwnTenant}
                    title={isOwnTenant ? 'Impossible de suspendre votre propre tenant' : undefined}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      detail.tenant.is_suspended
                        ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        : 'border-red-300 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {togglingId === detail.tenant.id ? '...' : detail.tenant.is_suspended ? 'Réactiver' : 'Suspendre'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteTenant(true)}
                    disabled={deleting || isOwnTenant}
                    title={isOwnTenant ? 'Impossible de supprimer votre propre tenant' : undefined}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                    {deleting ? '...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Volumes par module
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(detail.module_counts).map(([key, count]) => (
                  <div key={key} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-lg font-semibold text-slate-900">{count}</p>
                    <p className="text-xs text-slate-500">{MODULE_LABELS[key] || key}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Utilisateurs ({detail.users.length})
                </h3>
                <InviteUserForm tenantId={tenantId} onCreated={load} />
              </div>
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {detail.users.map((user) => (
                  <UserRow key={user.id} user={user} currentUserId={currentUserId} onUpdate={handleUpdateUser} onDelete={setPendingDeleteUser} />
                ))}
              </ul>
            </div>

            {detail.recent_actions.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions récentes sur ce tenant
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {detail.recent_actions.map((action) => (
                    <li key={action.id} className="flex items-center justify-between gap-2">
                      <span>
                        {ACTION_LABELS[action.action] || action.action} — {action.actor?.full_name || 'Compte supprimé'}
                      </span>
                      <span className="text-xs text-slate-400">{formatDateTime(action.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteTenant && detail && (
        <ConfirmTypedModal
          title="Supprimer ce tenant"
          message={`Cette action supprime définitivement "${detail.tenant.name}" et TOUTES ses données (documents, CAPA, utilisateurs...). Irréversible.`}
          expectedText={detail.tenant.name}
          onConfirm={confirmDeleteTenant}
          onClose={() => setShowDeleteTenant(false)}
        />
      )}

      {pendingDeleteUser && (
        <ConfirmModal
          title="Supprimer cet utilisateur"
          message={`Supprimer définitivement le compte de "${pendingDeleteUser.full_name}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          onConfirm={confirmDeleteUser}
          onClose={() => setPendingDeleteUser(null)}
        />
      )}
    </div>
  );
}

function TenantCard({ tenant, onOpenDetail, onToggleSuspend, togglingId, currentTenantId }) {
  const isOwnTenant = tenant.id === currentTenantId;
  return (
    <div
      onClick={() => onOpenDetail(tenant.id)}
      className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${tenant.is_suspended ? 'bg-red-50/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{tenant.name}</p>
          <p className="truncate text-xs text-slate-400">{tenant.slug}</p>
        </div>
        {tenant.is_suspended ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            <Ban size={12} />
            Suspendu
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={12} />
            Actif
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{PLAN_LABELS[tenant.plan] || tenant.plan}</span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {tenant.user_count}
        </span>
        <span>Créé le {formatDate(tenant.created_at)}</span>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSuspend(tenant);
        }}
        disabled={togglingId === tenant.id || isOwnTenant}
        title={isOwnTenant ? 'Impossible de suspendre votre propre tenant' : undefined}
        className={`mt-3 w-full rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          tenant.is_suspended
            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            : 'border-red-300 text-red-700 hover:bg-red-50'
        }`}
      >
        {togglingId === tenant.id ? '...' : tenant.is_suspended ? 'Réactiver' : 'Suspendre'}
      </button>
    </div>
  );
}

function TenantRow({ tenant, onOpenDetail, onToggleSuspend, togglingId, currentTenantId }) {
  const isOwnTenant = tenant.id === currentTenantId;
  return (
    <tr className={`cursor-pointer hover:bg-slate-50 ${tenant.is_suspended ? 'bg-red-50/50' : ''}`} onClick={() => onOpenDetail(tenant.id)}>
      <td className="whitespace-nowrap px-4 py-3">
        <p className="font-medium text-slate-800">{tenant.name}</p>
        <p className="text-xs text-slate-400">{tenant.slug}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{PLAN_LABELS[tenant.plan] || tenant.plan}</td>
      <td className="px-4 py-3 text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Users size={14} />
          {tenant.user_count}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{formatDate(tenant.created_at)}</td>
      <td className="px-4 py-3">
        {tenant.is_suspended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            <Ban size={12} />
            Suspendu
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={12} />
            Actif
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSuspend(tenant);
          }}
          disabled={togglingId === tenant.id || isOwnTenant}
          title={isOwnTenant ? 'Impossible de suspendre votre propre tenant' : undefined}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            tenant.is_suspended
              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              : 'border-red-300 text-red-700 hover:bg-red-50'
          }`}
        >
          {togglingId === tenant.id ? '...' : tenant.is_suspended ? 'Réactiver' : 'Suspendre'}
        </button>
      </td>
    </tr>
  );
}

function TenantsTab({ tenants, loading, error, onOpenDetail, onToggleSuspend, onCreateTenant, togglingId, currentTenantId }) {
  const { sorted: sortedTenants, sortKey, direction, setSortKey, toggleSort } = useSort(
    tenants,
    (tenant, key) => tenant[key],
    'created_at',
    'desc'
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">Tenants</h2>
        </div>
        <button
          type="button"
          onClick={onCreateTenant}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
        >
          <Plus size={14} />
          Nouveau tenant
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Toutes les entreprises clientes de la plateforme, tous tenants confondus. Cliquez une ligne pour la fiche détaillée.
      </p>

      <div className="mt-3">
        <SortSelect
          options={TENANT_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-md border border-slate-200 bg-white" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucun tenant pour l'instant.</p>
      ) : (
        <>
          {/* Le tableau (colonnes Plan/Utilisateurs/Créé le/Statut/Action) ne tient pas sur un
              écran de téléphone même avec défilement horizontal : les colonnes utiles restaient
              hors champ sans aucun indice qu'il fallait faire défiler. Cartes empilées sur
              mobile, tableau complet à partir de md — même pattern que Documents/CAPA. */}
          <div className="mt-4 space-y-2 md:hidden">
            {sortedTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onOpenDetail={onOpenDetail}
                onToggleSuspend={onToggleSuspend}
                togglingId={togglingId}
                currentTenantId={currentTenantId}
              />
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortableTh label="Tenant" sortKey="name" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Plan" sortKey="plan" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Utilisateurs" sortKey="user_count" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Créé le" sortKey="created_at" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="is_suspended" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTenants.map((tenant) => (
                  <TenantRow
                    key={tenant.id}
                    tenant={tenant}
                    onOpenDetail={onOpenDetail}
                    onToggleSuspend={onToggleSuspend}
                    togglingId={togglingId}
                    currentTenantId={currentTenantId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/super-admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError('Impossible de charger les statistiques.'));
  }, []);

  if (error) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!stats) {
    return <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  const chartData = stats.tenants_created_by_month.map((entry) => ({
    name: new Date(`${entry.month}-01`).toLocaleDateString('fr-FR', { month: 'short' }),
    count: entry.count,
  }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Building2} label="Tenants au total" value={stats.total_tenants} accent="bg-blue-100 text-blue-700" />
        <StatCard icon={CheckCircle2} label="Tenants actifs" value={stats.active_tenants} accent="bg-emerald-100 text-emerald-700" />
        <StatCard icon={Ban} label="Tenants suspendus" value={stats.suspended_tenants} accent="bg-red-100 text-red-700" />
        <StatCard icon={Users} label="Utilisateurs au total" value={stats.total_users} accent="bg-purple-100 text-purple-700" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Nouveaux tenants — 6 derniers mois</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: MUTED_COLOR, fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: MUTED_COLOR, fontSize: 11 }} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Bar dataKey="count" fill={LINE_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Répartition par plan</h3>
          <ul className="space-y-2">
            {Object.entries(stats.by_plan).map(([plan, count]) => (
              <li key={plan} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{PLAN_LABELS[plan] || plan}</span>
                <span className="font-medium text-slate-900">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AuditTab() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/super-admin/audit-log')
      .then(({ data }) => setEntries(data))
      .catch(() => setError("Impossible de charger le journal d'audit."));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2">
        <History size={20} className="text-slate-400" />
        <h2 className="text-base font-semibold text-slate-900">Journal d'audit</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">Actions récentes des super administrateurs sur la plateforme.</p>

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!entries && !error && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-10 animate-pulse rounded-md border border-slate-200 bg-white" />
          ))}
        </div>
      )}

      {entries && entries.length === 0 && <p className="mt-6 text-sm text-slate-500">Aucune action journalisée pour l'instant.</p>}

      {entries && entries.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{ACTION_LABELS[entry.action] || entry.action}</p>
                <p className="text-xs text-slate-500">
                  {entry.actor?.full_name || 'Compte supprimé'}
                  {entry.details?.tenant_name ? ` · ${entry.details.tenant_name}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{formatDateTime(entry.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function SystemTab() {
  const [driveBackups, setDriveBackups] = useState([]);
  const [loadingDriveBackups, setLoadingDriveBackups] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);

  function loadDriveBackups() {
    setLoadingDriveBackups(true);
    setDriveError('');
    api
      .get('/super-admin/drive-backups')
      .then(({ data }) => setDriveBackups(data))
      .catch(() => setDriveError('Impossible de charger les sauvegardes Google Drive.'))
      .finally(() => setLoadingDriveBackups(false));
  }

  useEffect(() => {
    loadDriveBackups();
  }, []);

  async function handleManualBackup() {
    setMessage(null);
    setBusyAction('backup');
    try {
      const { data } = await api.post('/super-admin/backup');
      const response = await api.get(data.download_url, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/sql' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: `Sauvegarde "${data.filename}" téléchargée.` });
    } catch {
      setMessage({ type: 'error', text: 'Impossible de créer la sauvegarde.' });
    } finally {
      setBusyAction('');
    }
  }

  async function handleBackupToDrive() {
    setMessage(null);
    setBusyAction('backup-drive');
    try {
      const { data } = await api.post('/super-admin/backup-drive');
      setMessage({ type: 'success', text: `Sauvegarde "${data.filename}" envoyée sur Google Drive.` });
      loadDriveBackups();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || "Impossible d'envoyer la sauvegarde sur Google Drive.",
      });
    } finally {
      setBusyAction('');
    }
  }

  async function confirmRestore() {
    const file = pendingRestoreFile;
    setMessage(null);
    setBusyAction(`restore-${file.id}`);
    try {
      const { data } = await api.post('/super-admin/restore-drive', { file_id: file.id, filename: file.name });
      const orphanNote =
        data.orphaned_profiles_removed > 0
          ? ` (${data.orphaned_profiles_removed} profil${data.orphaned_profiles_removed > 1 ? 's' : ''} sans compte de connexion valide retiré${data.orphaned_profiles_removed > 1 ? 's' : ''})`
          : '';
      setMessage({ type: 'success', text: `Base de données restaurée depuis "${file.name}"${orphanNote}. Rechargement de la page...` });
      // Une restauration change potentiellement toutes les données affichées (tenants,
      // utilisateurs, stats...) partout dans l'appli — un simple refetch local ne suffit pas à
      // tout invalider correctement, un rechargement complet est le seul moyen fiable de
      // repartir d'un état cohérent avec la base restaurée.
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Impossible de restaurer cette sauvegarde.' });
      setBusyAction('');
      setPendingRestoreFile(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database size={20} className="text-slate-400" />
        <h2 className="text-base font-semibold text-slate-900">Système</h2>
      </div>
      <p className="text-sm text-slate-500">
        Sauvegarde et restauration de la base de données (données applicatives de tous les tenants). Une
        sauvegarde de sécurité est prise automatiquement juste avant chaque restauration.
      </p>

      {message && (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleManualBackup}
          disabled={busyAction !== ''}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <Download size={16} />
          {busyAction === 'backup' ? 'Sauvegarde...' : 'Sauvegarde manuelle'}
        </button>
        <button
          type="button"
          onClick={handleBackupToDrive}
          disabled={busyAction !== ''}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
        >
          <Cloud size={16} />
          {busyAction === 'backup-drive' ? 'Envoi...' : 'Sauvegarder sur Google Drive'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Cloud size={16} className="text-slate-400" />
            Sauvegardes Google Drive
          </h3>
          <button
            type="button"
            onClick={loadDriveBackups}
            disabled={loadingDriveBackups}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loadingDriveBackups ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {driveError && <p className="px-4 py-3 text-sm text-red-600">{driveError}</p>}

        {!driveError && driveBackups.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {loadingDriveBackups ? 'Chargement...' : 'Aucune sauvegarde sur Google Drive pour le moment.'}
          </p>
        )}

        {driveBackups.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Fichier</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Taille</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driveBackups.map((file) => (
                  <tr key={file.id}>
                    <td className="max-w-[220px] break-all px-4 py-3 text-slate-700">{file.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(file.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatBytes(file.size_bytes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {file.web_view_link && (
                          <a
                            href={file.web_view_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Voir sur Drive
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setPendingRestoreFile(file)}
                          disabled={busyAction !== ''}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {busyAction === `restore-${file.id}` ? 'Restauration...' : 'Restaurer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingRestoreFile && (
        <ConfirmModal
          title="Restaurer cette sauvegarde"
          message={`Restaurer "${pendingRestoreFile.name}" ? Cette action écrase les données actuelles de TOUS les tenants de la plateforme et est irréversible.`}
          confirmLabel="Restaurer"
          onConfirm={confirmRestore}
          onClose={() => setPendingRestoreFile(null)}
        />
      )}
    </div>
  );
}

export default function SuperAdmin() {
  const currentUser = useCurrentUser();
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [detailTenantId, setDetailTenantId] = useState(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);

  function loadTenants() {
    api
      .get('/super-admin/tenants')
      .then(({ data }) => setTenants(data))
      .catch(() => setError('Impossible de récupérer les tenants.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!currentUser?.is_super_admin) return;
    loadTenants();
  }, [currentUser]);

  // currentUser === null tant que non chargé (voir useCurrentUser) : on attend avant de
  // rediriger, pour ne pas éjecter un vrai super admin le temps d'un aller-retour réseau.
  if (currentUser && !currentUser.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  async function handleToggleSuspend(tenant) {
    setError('');
    setTogglingId(tenant.id);
    try {
      const { data } = await api.patch(`/super-admin/tenants/${tenant.id}`, { is_suspended: !tenant.is_suspended });
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, ...data } : t)));
      return data;
    } catch {
      setError('Impossible de modifier ce tenant.');
      return null;
    } finally {
      setTogglingId(null);
    }
  }

  function handleTenantCreated(tenant) {
    setTenants((prev) => [tenant, ...prev]);
    setShowCreateTenant(false);
  }

  function handleTenantDeleted(tenantId) {
    setTenants((prev) => prev.filter((t) => t.id !== tenantId));
    setDetailTenantId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} />
          <span className="text-base font-semibold sm:text-lg">Super Admin</span>
        </div>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
          <ArrowLeft size={16} />
          Retour à l'application
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Gardé derrière la même condition que loadTenants ci-dessus (currentUser confirmé
            super admin) plutôt que monté sans condition : appeler /super-admin/health dès le
            montage, avant même que le rôle soit vérifié, n'a pas de sens pour un utilisateur
            qui n'est pas super admin — la route backend le rejette de toute façon (403), mais
            autant ne pas déclencher l'appel du tout. */}
        {currentUser?.is_super_admin && <HealthWidget />}

        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-slate-200 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === 'tenants' && (
            <TenantsTab
              tenants={tenants}
              loading={loading}
              error={error}
              onOpenDetail={setDetailTenantId}
              onToggleSuspend={handleToggleSuspend}
              onCreateTenant={() => setShowCreateTenant(true)}
              togglingId={togglingId}
              currentTenantId={currentUser?.tenant_id}
            />
          )}
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'audit' && <AuditTab />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </main>

      {detailTenantId && (
        <TenantDetailModal
          tenantId={detailTenantId}
          currentUserId={currentUser?.id}
          onClose={() => setDetailTenantId(null)}
          onToggleSuspend={handleToggleSuspend}
          onDeleted={handleTenantDeleted}
          togglingId={togglingId}
        />
      )}

      {showCreateTenant && (
        <CreateTenantModal onClose={() => setShowCreateTenant(false)} onCreated={handleTenantCreated} />
      )}
    </div>
  );
}
