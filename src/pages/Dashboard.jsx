import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Filter,
  MessageSquareWarning,
  ShieldAlert,
  Thermometer,
  TrendingDown,
  Truck,
  Users2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

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

// Neutre (gris) plutôt que rouge/vert : le sens "mieux/moins bien" d'une variation dépend du
// compteur (plus de CAPA clôturées = bien, plus de CAPA en retard = mal) — pas de règle unique
// fiable à coder en dur sans se tromper sur au moins un widget. delta undefined/null (pas
// d'instantané assez ancien, ou vue filtrée par service) => rien affiché.
function TrendBadge({ delta }) {
  if (delta === undefined || delta === null || delta === 0) return null;
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
      <Icon size={11} />
      {Math.abs(delta)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent, trend }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <TrendBadge delta={trend} />
        </div>
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
function WidgetCard({ title, to, children }) {
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
  haccp: 'HACCP',
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
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
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

function BigNumber({ value, suffix, trend }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-semibold text-slate-900">{value}</span>
      <span className="text-sm text-slate-500">{suffix}</span>
      <TrendBadge delta={trend} />
    </div>
  );
}

const SPARKLINE_WIDTH = 72;
const SPARKLINE_HEIGHT = 24;

// SVG à la main plutôt que recharts : ce widget n'a besoin que d'un tracé minimal (pas d'axes,
// pas d'infobulle), et Dashboard.jsx ne charge sinon aucun morceau du gros chunk recharts —
// pas de raison de l'y faire entrer pour trois points de données.
function Sparkline({ values, stroke }) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = SPARKLINE_WIDTH / (values.length - 1);
  const points = values
    .map((value, i) => `${i * step},${SPARKLINE_HEIGHT - ((value - min) / range) * SPARKLINE_HEIGHT}`)
    .join(' ');
  const lastX = (values.length - 1) * step;
  const lastY = SPARKLINE_HEIGHT - ((values[values.length - 1] - min) / range) * SPARKLINE_HEIGHT;

  return (
    <svg width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT} viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={stroke} />
    </svg>
  );
}

function KpiPreviewRow({ kpi }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-700">{kpi.name}</p>
        <p className="text-xs text-slate-400">
          {kpi.average} {kpi.unit || ''}
        </p>
      </div>
      <Sparkline values={kpi.sparkline} stroke="#dc2626" />
    </div>
  );
}

export default function Dashboard() {
  const currentUser = useCurrentUser();
  const role = currentUser?.role;
  const isMember = role === 'member';
  // null tant que non chargé => tout afficher, comme Layout.jsx (évite un flash "carte visible
  // puis disparaît" pendant le court instant avant que /tenant/menu ait répondu).
  const visibleMenuKeys = useMenuVisibility();
  const isModuleVisible = (key) => !visibleMenuKeys || visibleMenuKeys.includes(key);
  const canFilterByService = role === 'admin' || role === 'manager';
  const now = useLiveClock();

  const [stats, setStats] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState(null);

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

  const capaCards = [
    { id: 'open', label: 'Ouvertes', icon: ClipboardList, accent: 'bg-blue-100 text-blue-700' },
    { id: 'in_progress', label: 'En cours', icon: ClipboardList, accent: 'bg-amber-100 text-amber-700' },
    { id: 'overdue', label: 'En retard', icon: AlertTriangle, accent: 'bg-red-100 text-red-700' },
    { id: 'closed', label: 'Clôturées', icon: ClipboardList, accent: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        {currentUser?.full_name ? `Bonjour, ${currentUser.full_name.split(' ')[0]} — ` : ''}
        {capitalize(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
        {' · '}
        {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>

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

      {loading || !stats ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : (
        <Link
          to="/planning"
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
              <TrendBadge delta={stats.trends?.['overdue.total']} />
            </div>
            <p className="text-sm text-slate-600">
              {stats.overdue.total > 0
                ? `Élément${stats.overdue.total > 1 ? 's' : ''} en retard, tous outils confondus — voir le planning`
                : 'Rien en retard, tous outils confondus'}
            </p>
          </div>
        </Link>
      )}

      {isModuleVisible('capas') && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-slate-900 sm:text-base">{capaTitle}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {loading || !stats
              ? [0, 1, 2, 3].map((key) => <StatSkeleton key={key} />)
              : capaCards.map((card) => (
                  <StatCard key={card.id} {...card} value={stats.capas[card.id]} trend={stats.trends?.[`capas.${card.id}`]} />
                ))}
          </div>
        </>
      )}

      <div className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${isMember ? '' : 'lg:grid-cols-3'}`}>
        {!isMember &&
          isModuleVisible('documents') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Documents à réviser" to="/documents">
              <BigNumber value={stats.documents.to_review} suffix="document(s) à réviser sous 30 jours" trend={stats.trends?.['documents.to_review']} />
            </WidgetCard>
          ))}

        {isModuleVisible('trainings') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={trainingsTitle} to="/trainings">
              <BigNumber value={stats.trainings.to_renew} suffix="formation(s) à renouveler sous 60 jours" trend={stats.trends?.['trainings.to_renew']} />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('kpis') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="KPI hors objectif" to="/kpis">
              <div className="flex items-baseline gap-2">
                <TrendingDown size={20} className={stats.kpis.off_target > 0 ? 'text-red-600' : 'text-slate-300'} />
                <BigNumber value={stats.kpis.off_target} suffix="indicateur(s) sous l'objectif" trend={stats.trends?.['kpis.off_target']} />
              </div>
              {stats.kpis.preview?.length > 0 && (
                <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
                  {stats.kpis.preview.map((kpi) => (
                    <KpiPreviewRow key={kpi.id} kpi={kpi} />
                  ))}
                </div>
              )}
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('haccp') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Plans HACCP actifs" to="/haccp">
              <div className="flex items-baseline gap-2">
                <Thermometer size={20} className="text-slate-300" />
                <BigNumber value={stats.haccp.active_plans} suffix="plan(s) actif(s)" trend={stats.trends?.['haccp.active_plans']} />
              </div>
            </WidgetCard>
          ))}

        {isModuleVisible('audits') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={auditsTitle} to="/audits">
              <div className="flex items-baseline gap-2">
                <ClipboardCheck size={20} className="text-slate-300" />
                <BigNumber value={stats.audits.active} suffix="audit(s) en cours" trend={stats.trends?.['audits.active']} />
              </div>
              <OverdueNote count={stats.audits.overdue} />
            </WidgetCard>
          ))}

        {isModuleVisible('complaints') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={complaintsTitle} to="/complaints">
              <div className="flex items-baseline gap-2">
                <MessageSquareWarning size={20} className="text-slate-300" />
                <BigNumber value={stats.complaints.active} suffix="réclamation(s) ouverte(s)" trend={stats.trends?.['complaints.active']} />
              </div>
              <OverdueNote count={stats.complaints.overdue} />
            </WidgetCard>
          ))}

        {isModuleVisible('risks') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title={risksTitle} to="/risks">
              <div className="flex items-baseline gap-2">
                <ShieldAlert size={20} className="text-slate-300" />
                <BigNumber value={stats.risks.active} suffix="risque(s) actif(s)" trend={stats.trends?.['risks.active']} />
              </div>
              <OverdueNote count={stats.risks.overdue} />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('suppliers') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Fournisseurs à évaluer" to="/suppliers">
              <div className="flex items-baseline gap-2">
                <Truck size={20} className="text-slate-300" />
                <BigNumber value={stats.suppliers.active} suffix="évaluation(s) à planifier" trend={stats.trends?.['suppliers.active']} />
              </div>
              <OverdueNote count={stats.suppliers.overdue} />
            </WidgetCard>
          ))}

        {!isMember &&
          isModuleVisible('management-reviews') &&
          (loading || !stats ? (
            <WidgetSkeleton />
          ) : (
            <WidgetCard title="Revues de direction à clôturer" to="/management-reviews">
              <div className="flex items-baseline gap-2">
                <Users2 size={20} className="text-slate-300" />
                <BigNumber
                  value={stats.management_reviews.draft}
                  suffix="revue(s) en attente de clôture"
                  trend={stats.trends?.['management_reviews.draft']}
                />
              </div>
            </WidgetCard>
          ))}
      </div>

      {canFilterByService && <RecentActivityPanel items={recentActivity} />}
    </div>
  );
}
