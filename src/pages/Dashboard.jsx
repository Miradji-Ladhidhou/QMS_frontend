import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, ClipboardList, FileText, GraduationCap } from 'lucide-react';
import { api } from '../lib/api.js';

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
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
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-4 w-full rounded bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ documents: 0, openCapas: 0, trainings: 0, kpis: 0 });
  const [documentAlerts, setDocumentAlerts] = useState([]);
  const [overdueCapas, setOverdueCapas] = useState([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [documentsRes, capasRes, trainingsRes, kpisRes, alertsRes, renewalsRes] = await Promise.all([
          api.get('/documents'),
          api.get('/capas'),
          api.get('/trainings'),
          api.get('/kpis'),
          api.get('/documents/alerts'),
          api.get('/trainings/upcoming-renewals'),
        ]);

        if (!isMounted) return;

        const capas = capasRes.data;

        setStats({
          documents: documentsRes.data.length,
          openCapas: capas.filter((capa) => capa.status === 'open').length,
          trainings: trainingsRes.data.length,
          kpis: kpisRes.data.length,
        });
        setDocumentAlerts(alertsRes.data.slice(0, 5));
        setOverdueCapas(
          capas
            .filter((capa) => capa.status === 'overdue')
            .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))
            .slice(0, 5)
        );
        setUpcomingRenewals(renewalsRes.data.slice(0, 5));
      } catch {
        if (isMounted) setError('Impossible de charger le tableau de bord.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = [
    { key: 'documents', label: 'Documents', value: stats.documents, icon: FileText, accent: 'bg-blue-100 text-blue-700' },
    { key: 'openCapas', label: 'CAPA ouvertes', value: stats.openCapas, icon: ClipboardList, accent: 'bg-orange-100 text-orange-700' },
    { key: 'trainings', label: 'Formations actives', value: stats.trainings, icon: GraduationCap, accent: 'bg-emerald-100 text-emerald-700' },
    { key: 'kpis', label: 'KPIs suivis', value: stats.kpis, icon: BarChart3, accent: 'bg-purple-100 text-purple-700' },
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((key) => <StatSkeleton key={key} />)
          : statCards.map((card) => <StatCard key={card.key} {...card} />)}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-3">
        {loading ? (
          <>
            <WidgetSkeleton />
            <WidgetSkeleton />
            <WidgetSkeleton />
          </>
        ) : (
          <>
            <WidgetCard title="Documents à réviser">
              {documentAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun document à réviser.</p>
              ) : (
                <ul className="space-y-3">
                  {documentAlerts.map((doc) => (
                    <li key={doc.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{doc.title}</p>
                        <p className="text-slate-500">{doc.number}</p>
                      </div>
                      <span className="shrink-0 text-slate-500">{formatDate(doc.review_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            <WidgetCard title="CAPA en retard">
              {overdueCapas.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune CAPA en retard.</p>
              ) : (
                <ul className="space-y-3">
                  {overdueCapas.map((capa) => (
                    <li key={capa.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{capa.title}</p>
                        <p className="text-slate-500">{capa.number}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_STYLES[capa.priority] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {capa.priority}
                        </span>
                        <span className="text-slate-500">{formatDate(capa.due_date)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            <WidgetCard title="Formations à renouveler">
              {upcomingRenewals.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun renouvellement dans les 60 prochains jours.</p>
              ) : (
                <ul className="space-y-3">
                  {upcomingRenewals.map((renewal) => (
                    <li
                      key={`${renewal.training?.id}-${renewal.user?.id}`}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{renewal.training?.title}</p>
                        <p className="text-slate-500">{renewal.user?.full_name}</p>
                      </div>
                      <span className="shrink-0 text-slate-500">{formatDate(renewal.next_due_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>
          </>
        )}
      </div>
    </div>
  );
}
