import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ClipboardList, Filter } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-6 w-12 rounded bg-slate-200" />
        <div className="h-3 w-20 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function WidgetCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
      {children}
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 h-4 w-40 rounded bg-slate-200" />
      <div className="h-8 w-24 rounded bg-slate-200" />
    </div>
  );
}

function BigNumber({ value, suffix }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-semibold text-slate-900">{value}</span>
      <span className="text-sm text-slate-500">{suffix}</span>
    </div>
  );
}

export default function Dashboard() {
  const currentUser = useCurrentUser();
  const role = currentUser?.role;
  const isMember = role === 'member';
  const canFilterByService = role === 'admin' || role === 'manager';

  const [stats, setStats] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadStats(serviceIds) {
    setError('');
    try {
      const { data } = await api.get('/dashboard/stats', {
        params: serviceIds.length > 0 ? { service_id: serviceIds } : {},
      });
      setStats(data);
    } catch {
      setError('Impossible de charger le tableau de bord.');
    }
  }

  useEffect(() => {
    if (!role) return;

    let cancelled = false;

    async function init() {
      setLoading(true);

      if (role !== 'member') {
        try {
          const { data } = await api.get('/services');
          if (!cancelled) setAllServices(data.filter((service) => service.is_active));
        } catch {
          // Liste vide si indisponible : le sélecteur reste vide, non bloquant pour le reste.
        }
      }

      // Le montage n'envoie jamais service_id : le backend gère lui-même le filtrage par
      // défaut selon le rôle (manager -> ses services, admin -> tout le tenant). Les cases
      // cochées ci-dessous ne font que représenter visuellement ce périmètre par défaut.
      let initialSelected = [];
      if (role === 'manager') {
        try {
          const { data } = await api.get('/services/my-services');
          if (!cancelled) initialSelected = data.map((service) => service.id);
        } catch {
          // Pas de présélection si l'appel échoue — dégrade sans bloquer le dashboard.
        }
      }

      if (cancelled) return;
      setSelectedServiceIds(initialSelected);
      await loadStats([]);
      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function handleToggleService(serviceId) {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      loadStats(next);
      return next;
    });
  }

  const capaTitle = isMember ? 'Mes CAPA' : 'CAPA de l’entreprise';
  const trainingsTitle = isMember ? 'Mes formations à renouveler' : 'Formations à renouveler';

  const capaCards = [
    { id: 'open', label: 'Ouvertes', icon: ClipboardList, accent: 'bg-blue-100 text-blue-700' },
    { id: 'in_progress', label: 'En cours', icon: ClipboardList, accent: 'bg-amber-100 text-amber-700' },
    { id: 'overdue', label: 'En retard', icon: AlertTriangle, accent: 'bg-red-100 text-red-700' },
    { id: 'closed', label: 'Clôturées', icon: ClipboardList, accent: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Dashboard</h1>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertTriangle size={16} />
          {error}
        </p>
      )}

      {canFilterByService && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter size={16} />
            Filtrer par service
          </div>

          {allServices.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun service configuré.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allServices.map((service) => {
                const checked = selectedServiceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleService(service.id)}
                      className="sr-only"
                    />
                    {checked && <Check size={14} />}
                    {service.name}
                  </label>
                );
              })}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            {selectedServiceIds.length === 0
              ? role === 'manager'
                ? 'Aucune sélection : vos services par défaut.'
                : "Aucune sélection : vue globale de l'entreprise."
              : `${selectedServiceIds.length} service(s) sélectionné(s).`}
          </p>
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-900 sm:text-base">{capaTitle}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {loading || !stats
          ? [0, 1, 2, 3].map((key) => <StatSkeleton key={key} />)
          : capaCards.map((card) => <StatCard key={card.id} {...card} value={stats.capas[card.id]} />)}
      </div>

      <div className={`mt-6 grid grid-cols-1 gap-4 ${isMember ? '' : 'sm:grid-cols-2'}`}>
        {!isMember &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Documents à réviser">
              <BigNumber value={stats.documents.to_review} suffix="document(s) à réviser sous 30 jours" />
            </WidgetCard>
          ))}

        {loading || !stats ? (
          <WidgetSkeleton />
        ) : (
          <WidgetCard title={trainingsTitle}>
            <BigNumber value={stats.trainings.to_renew} suffix="formation(s) à renouveler sous 60 jours" />
          </WidgetCard>
        )}
      </div>
    </div>
  );
}
