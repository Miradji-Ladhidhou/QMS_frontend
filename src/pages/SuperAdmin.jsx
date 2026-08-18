import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Activity, ArrowLeft, Ban, Building2, CheckCircle2, History, ShieldCheck, Users, X, XCircle } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';

const LINE_COLOR = '#1F3864';
const GRID_COLOR = '#e2e8f0';
const MUTED_COLOR = '#94a3b8';

const PLAN_LABELS = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', member: 'Membre' };
const ACTION_LABELS = { tenant_suspended: 'Tenant suspendu', tenant_reactivated: 'Tenant réactivé' };
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

function TenantDetailModal({ tenantId, onClose, onToggleSuspend, togglingId }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/super-admin/tenants/${tenantId}`)
      .then(({ data }) => setDetail(data))
      .catch(() => setError('Impossible de charger la fiche de ce tenant.'));
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{detail?.tenant.name || 'Fiche tenant'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!detail && !error && <div className="h-48 animate-pulse rounded-xl bg-slate-100" />}

        {detail && (
          <div className="space-y-5">
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
              <button
                type="button"
                onClick={handleToggle}
                disabled={togglingId === detail.tenant.id}
                className={`ml-auto rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  detail.tenant.is_suspended
                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    : 'border-red-300 text-red-700 hover:bg-red-50'
                }`}
              >
                {togglingId === detail.tenant.id ? '...' : detail.tenant.is_suspended ? 'Réactiver' : 'Suspendre'}
              </button>
            </div>

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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Utilisateurs ({detail.users.length})
              </h3>
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {detail.users.map((user) => (
                  <li key={user.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
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
                    </span>
                  </li>
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
    </div>
  );
}

function TenantRow({ tenant, onOpenDetail, onToggleSuspend, togglingId }) {
  return (
    <tr className={`cursor-pointer hover:bg-slate-50 ${tenant.is_suspended ? 'bg-red-50/50' : ''}`} onClick={() => onOpenDetail(tenant.id)}>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{tenant.name}</p>
        <p className="text-xs text-slate-400">{tenant.slug}</p>
      </td>
      <td className="px-4 py-3 text-slate-600">{PLAN_LABELS[tenant.plan] || tenant.plan}</td>
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
          disabled={togglingId === tenant.id}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
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

function TenantsTab({ tenants, loading, error, onOpenDetail, onToggleSuspend, togglingId }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Building2 size={20} className="text-slate-400" />
        <h2 className="text-base font-semibold text-slate-900">Tenants</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Toutes les entreprises clientes de la plateforme, tous tenants confondus. Cliquez une ligne pour la fiche détaillée.
      </p>

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
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Utilisateurs</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((tenant) => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  onOpenDetail={onOpenDetail}
                  onToggleSuspend={onToggleSuspend}
                  togglingId={togglingId}
                />
              ))}
            </tbody>
          </table>
        </div>
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

export default function SuperAdmin() {
  const currentUser = useCurrentUser();
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [detailTenantId, setDetailTenantId] = useState(null);

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
        <HealthWidget />

        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
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
              togglingId={togglingId}
            />
          )}
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'audit' && <AuditTab />}
        </div>
      </main>

      {detailTenantId && (
        <TenantDetailModal
          tenantId={detailTenantId}
          onClose={() => setDetailTenantId(null)}
          onToggleSuspend={handleToggleSuspend}
          togglingId={togglingId}
        />
      )}
    </div>
  );
}
