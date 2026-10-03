import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Filter,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
  Siren,
  Thermometer,
  TrendingDown,
  Truck,
  Users2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';
import { useTenant } from '../lib/useTenant.js';
import { useUsers } from '../lib/useUsers.js';

// Se met à jour toutes les 30s plutôt qu'à chaque seconde : l'heure affichée n'a besoin
// d'être qu'approximativement fraîche ici, pas d'un vrai chronomètre — inutile de re-render
// toute la page au rythme d'une horloge.
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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

// `to` optionnel : rend la carte cliquable vers l'outil concerné (comme le bandeau "en
// retard" plus haut), sans rien changer pour les 3 widgets existants qui ne l'utilisaient pas.
function WidgetCard({ title, to, children, value, showZeroMetrics }) {
  if (value === 0 && !showZeroMetrics) return null;
  const Wrapper = to ? Link : 'div';
  const wrapperProps = to ? { to } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
        to ? 'block transition-colors hover:border-primary/40 hover:shadow-md' : ''
      }`}
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
      {children}
    </Wrapper>
  );
}

function OverdueNote({ count }) {
  if (!count) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{count} en retard</p>;
}

const ACTIVITY_MODULE_LABELS = {
  capas: 'CAPA',
  audits: 'Audit',
  complaints: 'Réclamation',
  risks: 'Risque',
  documents: 'Document',
  procedures: 'Procédure',
  haccp: 'HACCP',
};

const DUE_MODULE_LABELS = {
  capa: 'CAPA',
  document: 'Document',
  procedure: 'Procédure',
  training: 'Formation',
  task: 'Tâche',
  audit: 'Audit',
  complaint: 'Réclamation',
  risk: 'Risque',
  supplier: 'Fournisseur',
  pdca: 'PDCA',
  review_action: 'Action de revue',
  management_review: 'Revue de direction',
  register: 'Registre',
};

function formatRelativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function RecentActivityPanel({ items }) {
  const [expanded, setExpanded] = useState(false);
  if (items === null) {
    return (
      <div className="mt-6 animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 h-4 w-40 rounded bg-slate-200" />
        <div className="space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-5 rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 sm:text-base">Activité récente</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune activité récente.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {(expanded ? items : items.slice(0, 3)).map((item) => (
              <li key={`${item.module}-${item.id}`}>
                <Link to={item.link} className="flex items-center justify-between gap-3 py-2 hover:text-primary">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {ACTIVITY_MODULE_LABELS[item.module] || item.module}
                    </span>
                    <span className="truncate text-sm text-slate-700">
                      {item.action === 'created' ? 'Créé' : 'Modifié'} — {item.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(item.timestamp)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > 3 && (
            <button type="button" onClick={() => setExpanded((visible) => !visible)} aria-expanded={expanded} className="mt-2 text-xs font-medium text-primary hover:underline">
              {expanded ? 'Réduire' : `Voir les ${items.length - 3} autres activités`}
            </button>
          )}
        </>
      )}
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

// Juste le nom + un badge "Sous l'objectif" — délibérément sans valeur ni graphique : afficher
// une moyenne ou un pourcentage ici prêtait à confusion (le chiffre ne correspond à aucune
// valeur affichée ailleurs dans l'app d'un simple coup d'œil). Pour voir le détail d'un KPI
// précis (valeur, cible, historique), il faut ouvrir sa fiche — ce que fait déjà le clic sur
// la carte entière (voir WidgetCard to="/kpis" plus bas).
function KpiPreviewRow({ kpi }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <p className="min-w-0 truncate text-sm text-slate-700">{kpi.name}</p>
      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Sous l'objectif
      </span>
    </div>
  );
}

export default function Dashboard() {
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const users = useUsers();
  const role = currentUser?.role;
  const isMember = role === 'member';
  // null tant que non chargé => tout afficher, comme Layout.jsx (évite un flash "carte visible
  // puis disparaît" pendant le court instant avant que /tenant/menu ait répondu).
  const visibleMenuKeys = useMenuVisibility();
  const isModuleVisible = (key) => !visibleMenuKeys || visibleMenuKeys.includes(key);
  const canFilterByService = role === 'admin' || role === 'manager';
  const now = useLiveClock();
  const timeZone = tenant?.timezone || 'UTC';

  const [stats, setStats] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState(null);
  const [overdueItems, setOverdueItems] = useState(null);
  const [showZeroMetrics, setShowZeroMetrics] = useState(false);
  const statsRequestRef = useRef(0);

  async function loadStats(serviceIds) {
    const requestId = ++statsRequestRef.current;
    setError('');
    setOverdueItems(null);
    const params = serviceIds.length > 0 ? { service_id: serviceIds } : {};
    const [statsResult, planningResult] = await Promise.allSettled([
      api.get('/dashboard/stats', { params }),
      api.get('/planning', { params }),
    ]);
    if (requestId !== statsRequestRef.current) return;
    if (statsResult.status === 'fulfilled') setStats(statsResult.value.data);
    else setError('Impossible de charger le tableau de bord.');
    setOverdueItems(planningResult.status === 'fulfilled' && statsResult.status === 'fulfilled'
      ? planningResult.value.data.items.filter((item) => item.is_overdue).slice(0, 5)
      : []);
  }

  async function loadRecentActivity() {
    try {
      const { data } = await api.get('/dashboard/recent-activity');
      setRecentActivity(data);
    } catch {
      setRecentActivity([]);
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
      if (canFilterByService) loadRecentActivity();
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
  // Audits/réclamations/risques : un member peut être personnellement auditeur/assigné/
  // responsable (voir dashboard.js), ce widget a donc un sens pour tous les rôles — seul le
  // titre change pour refléter le scope (personnel vs entreprise), comme CAPA/formations.
  const auditsTitle = isMember ? 'Mes audits en cours' : 'Audits en cours';
  const complaintsTitle = isMember ? 'Mes réclamations ouvertes' : 'Réclamations ouvertes';
  const risksTitle = isMember ? 'Mes risques actifs' : 'Risques actifs';
  // PDCA a un porteur individuel (owner, voir dashboard.js) comme les risques ci-dessus — même
  // titre personnalisé. Accidents n'en a pas (injured_user_id désigne la personne blessée, pas
  // un porteur de suivi) : reste sur un titre fixe, comme fournisseurs/revues de direction.
  const pdcaTitle = isMember ? 'Mes projets PDCA actifs' : 'Projets PDCA actifs';

  const capaCards = [
    { id: 'open', label: 'Ouvertes', icon: ClipboardList, accent: 'bg-blue-100 text-blue-700' },
    { id: 'in_progress', label: 'En cours', icon: ClipboardList, accent: 'bg-amber-100 text-amber-700' },
    { id: 'overdue', label: 'En retard', icon: AlertTriangle, accent: 'bg-red-100 text-red-700' },
    { id: 'closed', label: 'Clôturées', icon: ClipboardList, accent: 'bg-emerald-100 text-emerald-700' },
  ];
  const zeroWidgetCount = stats ? [
    !isMember && isModuleVisible('documents') && stats.documents.to_review,
    !isMember && isModuleVisible('procedures') && stats.procedures.to_review,
    isModuleVisible('trainings') && stats.trainings.to_renew,
    !isMember && isModuleVisible('kpis') && stats.kpis.off_target,
    !isMember && isModuleVisible('haccp') && stats.haccp.active_plans,
    isModuleVisible('audits') && stats.audits.active,
    isModuleVisible('complaints') && stats.complaints.active,
    isModuleVisible('risks') && stats.risks.active,
    !isMember && isModuleVisible('suppliers') && stats.suppliers.active,
    !isMember && isModuleVisible('management-reviews') && stats.management_reviews.draft,
    !isMember && isModuleVisible('accidents') && stats.accidents.open,
    isModuleVisible('pdca') && stats.pdca.active,
  ].filter((value) => value === 0).length + (isModuleVisible('capas') ? capaCards.filter((card) => stats.capas[card.id] === 0).length : 0) : 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        {currentUser?.full_name ? `Bonjour, ${currentUser.full_name.split(' ')[0]} — ` : ''}
        {capitalize(new Intl.DateTimeFormat('fr-FR', { timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now))}
        {' · '}
        {new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(now)}
      </p>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertTriangle size={16} />
          {error}
        </p>
      )}

      {canFilterByService && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Filter size={16} />
            <span>Services</span>
          </div>
          {allServices.length === 0 ? (
            <p className="text-slate-500">Aucun service configuré</p>
          ) : (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span>
                  {selectedServiceIds.length === 0
                    ? role === 'manager'
                      ? 'Mes services par défaut'
                      : 'Vue globale'
                    : selectedServiceIds.length === 1
                      ? allServices.find((service) => service.id === selectedServiceIds[0])?.name || '1 service'
                      : `${selectedServiceIds.length} services sélectionnés`}
                </span>
                <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 z-20 mt-2 max-h-72 w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <div className="border-b border-slate-100 px-3 pb-2 pt-1">
                  <h2 className="text-sm font-semibold text-slate-800">Filtrer par service</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Sélectionnez un ou plusieurs services.</p>
                </div>
                {selectedServiceIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceIds([]);
                      loadStats([]);
                    }}
                    className="mb-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-slate-50"
                  >
                    {role === 'manager' ? 'Mes services par défaut' : 'Vue globale'}
                  </button>
                )}
                <div className="space-y-1">
                  {allServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => handleToggleService(service.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 truncate">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      )}

      {loading || !stats ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : (
        <Link
          to={stats.overdue.total > 0 ? '/planning?overdue=1' : '/planning'}
          className={`mt-4 flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors sm:p-5 ${
            stats.overdue.total > 0
              ? 'border-red-200 bg-red-50 hover:bg-red-100'
              : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
              stats.overdue.total > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {stats.overdue.total > 0 ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className={`text-2xl font-semibold ${stats.overdue.total > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {stats.overdue.total}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {stats.overdue.total > 0
                ? `Élément${stats.overdue.total > 1 ? 's' : ''} en retard, tous outils confondus — voir le planning`
                : 'Rien en retard, tous outils confondus'}
            </p>
          </div>
        </Link>
      )}

      {stats?.overdue.total > 0 && overdueItems !== null && (
        <section className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">À traiter en priorité</h2>
            <Link to="/planning?overdue=1" className="shrink-0 text-xs font-medium text-primary hover:underline">Tous les retards</Link>
          </div>
          {overdueItems.length > 0 ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {overdueItems.map((item) => {
                const assignee = users.find((user) => user.id === (item.assignee_id || item.assigned_to));
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <Link to={item.link} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm hover:text-primary">
                      <span className="w-24 shrink-0 text-xs font-medium text-slate-500 sm:w-32">{DUE_MODULE_LABELS[item.type] || item.type}</span>
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="min-w-0 break-words font-medium text-slate-800 sm:truncate">{item.title}</span>
                        {assignee && <span className="text-xs text-slate-500">{assignee.full_name}</span>}
                      </span>
                      <time dateTime={item.date} className="shrink-0 text-xs font-medium text-red-700">{item.date?.slice(0, 10).split('-').reverse().join('/')}</time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">Consultez le planning pour le détail des retards.</p>}
        </section>
      )}

      {isModuleVisible('capas') && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-slate-900 sm:text-base">{capaTitle}</h2>
          <div className={`mt-3 grid grid-cols-2 gap-3 sm:gap-4 ${loading || !stats || showZeroMetrics || capaCards.filter((card) => stats.capas[card.id] !== 0).length > 2 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
            {loading || !stats
              ? [0, 1, 2, 3].map((key) => <StatSkeleton key={key} />)
              : capaCards.filter((card) => showZeroMetrics || stats.capas[card.id] !== 0).map((card) => (
                  <StatCard key={card.id} {...card} value={stats.capas[card.id]} />
                ))}
          </div>
        </>
      )}

      {canFilterByService && <RecentActivityPanel items={recentActivity} />}

      <div className={`mt-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 ${isMember ? '' : 'lg:grid-cols-3'}`}>
        {!isMember &&
          isModuleVisible('documents') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Documents à réviser" to="/documents" value={stats.documents.to_review} showZeroMetrics={showZeroMetrics}>
              <BigNumber value={stats.documents.to_review} suffix="document(s) à réviser sous 30 jours" />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('procedures') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Procédures à réviser" to="/procedures" value={stats.procedures.to_review} showZeroMetrics={showZeroMetrics}>
              <BigNumber
                value={stats.procedures.to_review}
                suffix="procédure(s) à réviser sous 30 jours"
              />
            </WidgetCard>
          ))}

        {isModuleVisible('trainings') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={trainingsTitle} to="/trainings" value={stats.trainings.to_renew} showZeroMetrics={showZeroMetrics}>
              <BigNumber value={stats.trainings.to_renew} suffix="formation(s) à renouveler sous 60 jours" />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('kpis') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="KPI hors objectif" to="/kpis" value={stats.kpis.off_target} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <TrendingDown size={20} className={stats.kpis.off_target > 0 ? 'text-red-600' : 'text-slate-300'} />
                <BigNumber value={stats.kpis.off_target} suffix="indicateur(s) sous l'objectif" />
              </div>
              {stats.kpis.preview?.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-1">
                  <KpiPreviewRow kpi={stats.kpis.preview[0]} />
                </div>
              )}
              {stats.kpis.off_target > 1 && (
                <p className="text-xs text-slate-500">
                  + {stats.kpis.off_target - 1} autre{stats.kpis.off_target > 2 ? 's' : ''} indicateur{stats.kpis.off_target > 2 ? 's' : ''} hors objectif
                </p>
              )}
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('haccp') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Plans HACCP actifs" to="/haccp" value={stats.haccp.active_plans} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <Thermometer size={20} className="text-slate-300" />
                <BigNumber value={stats.haccp.active_plans} suffix="plan(s) actif(s)" />
              </div>
              {(stats.haccp.overdue_ccps > 0 || stats.haccp.deviating_ccps > 0) && (
                <p className="mt-2 text-xs font-medium text-red-700">
                  {stats.haccp.overdue_ccps > 0 && `${stats.haccp.overdue_ccps} relevé(s) en retard`}
                  {stats.haccp.overdue_ccps > 0 && stats.haccp.deviating_ccps > 0 && ' · '}
                  {stats.haccp.deviating_ccps > 0 && `${stats.haccp.deviating_ccps} CCP en dérive`}
                </p>
              )}
            </WidgetCard>
          ))}

        {isModuleVisible('audits') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={auditsTitle} to="/audits" value={stats.audits.active} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <ClipboardCheck size={20} className="text-slate-300" />
                <BigNumber value={stats.audits.active} suffix="audit(s) en cours" />
              </div>
              <OverdueNote count={stats.audits.overdue} />
            </WidgetCard>
          ))}

        {isModuleVisible('complaints') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={complaintsTitle} to="/complaints" value={stats.complaints.active} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <MessageSquareWarning size={20} className="text-slate-300" />
                <BigNumber value={stats.complaints.active} suffix="réclamation(s) ouverte(s)" />
              </div>
              <OverdueNote count={stats.complaints.overdue} />
            </WidgetCard>
          ))}

        {isModuleVisible('risks') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={risksTitle} to="/risks" value={stats.risks.active} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <ShieldAlert size={20} className="text-slate-300" />
                <BigNumber value={stats.risks.active} suffix="risque(s) actif(s)" />
              </div>
              <OverdueNote count={stats.risks.overdue} />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('suppliers') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Fournisseurs à évaluer" to="/suppliers" value={stats.suppliers.active} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <Truck size={20} className="text-slate-300" />
                <BigNumber value={stats.suppliers.active} suffix="évaluation(s) à planifier" />
              </div>
              <OverdueNote count={stats.suppliers.overdue} />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('management-reviews') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Revues de direction à clôturer" to="/management-reviews" value={stats.management_reviews.draft} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <Users2 size={20} className="text-slate-300" />
                <BigNumber
                  value={stats.management_reviews.draft}
                  suffix="revue(s) en attente de clôture"
                />
              </div>
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('accidents') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Accidents du travail" to="/accidents" value={stats.accidents.open} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <Siren size={20} className="text-slate-300" />
                <BigNumber value={stats.accidents.open} suffix="accident(s) ouvert(s)" />
              </div>
            </WidgetCard>
          ))}

        {isModuleVisible('pdca') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={pdcaTitle} to="/pdca" value={stats.pdca.active} showZeroMetrics={showZeroMetrics}>
              <div className="flex items-baseline gap-2">
                <RefreshCw size={20} className="text-slate-300" />
                <BigNumber value={stats.pdca.active} suffix="projet(s) actif(s)" />
              </div>
              <OverdueNote count={stats.pdca.overdue} />
            </WidgetCard>
          ))}
      </div>

      {zeroWidgetCount > 0 && (
        <button type="button" onClick={() => setShowZeroMetrics((visible) => !visible)} aria-expanded={showZeroMetrics} className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary">
          <ChevronDown size={16} className={`transition-transform ${showZeroMetrics ? 'rotate-180' : ''}`} />
          {showZeroMetrics ? 'Masquer' : 'Afficher'} {zeroWidgetCount} indicateur{zeroWidgetCount > 1 ? 's' : ''} à zéro
        </button>
      )}

    </div>
  );
}
