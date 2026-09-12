import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Users2 } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Audits = lazy(() => import('./Audits.jsx'));
const ManagementReviews = lazy(() => import('./ManagementReviews.jsx'));

const TABS = [
  { key: 'audits', to: '/audits', menuKey: 'audits', label: 'Audits internes', icon: ClipboardCheck },
  { key: 'management-reviews', to: '/management-reviews', menuKey: 'management-reviews', label: 'Revues de direction', icon: Users2 },
];

// Fusionne Audits internes et Revues de direction sous un seul lien de menu ("Pilotage du
// SMQ", voir Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx : deux mécanismes
// de supervision périodique du système qualité (ISO 9001 §9.2 vs §9.3), aux données et
// workflows indépendants, réutilisés tels quels via deux onglets calés sur les URLs
// historiques (/audits, /management-reviews) pour ne rien casser des liens existants.
export default function QmsOversight() {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleMenuKeys = useMenuVisibility();

  // null tant que non chargé => on affiche les deux onglets par défaut, comme ailleurs (voir
  // Capas.jsx#qqoqccpVisible), pour ne pas faire clignoter l'interface le temps du chargement.
  const visibleTabs = TABS.filter((tab) => !visibleMenuKeys || visibleMenuKeys.includes(tab.menuKey));
  const activeTab = visibleTabs.find((tab) => location.pathname.startsWith(tab.to)) || visibleTabs[0];

  if (!activeTab) return null;

  return (
    <div>
      {visibleTabs.length > 1 && (
        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(tab.to)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <Suspense fallback={<div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />}>
        {activeTab.key === 'audits' ? <Audits /> : <ManagementReviews />}
      </Suspense>
    </div>
  );
}
