import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Ban, Building2, CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

function TenantRow({ tenant, onToggleSuspend, togglingId }) {
  return (
    <tr className={tenant.is_suspended ? 'bg-red-50/50' : ''}>
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
          onClick={() => onToggleSuspend(tenant)}
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

export default function SuperAdmin() {
  const currentUser = useCurrentUser();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!currentUser?.is_super_admin) return;
    api
      .get('/super-admin/tenants')
      .then(({ data }) => setTenants(data))
      .catch(() => setError('Impossible de récupérer les tenants.'))
      .finally(() => setLoading(false));
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
    } catch {
      setError('Impossible de modifier ce tenant.');
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
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Tenants</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Toutes les entreprises clientes de la plateforme, tous tenants confondus.</p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

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
                  <TenantRow key={tenant.id} tenant={tenant} onToggleSuspend={handleToggleSuspend} togglingId={togglingId} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
