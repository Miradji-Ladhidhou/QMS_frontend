import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareWarning, Smile } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Complaints = lazy(() => import('./Complaints.jsx'));
const CustomerSatisfaction = lazy(() => import('./CustomerSatisfaction.jsx'));

const TABS = [
  { key: 'complaints', to: '/complaints', menuKey: 'complaints', label: 'Réclamations', icon: MessageSquareWarning },
  { key: 'satisfaction', to: '/customer-satisfaction', menuKey: 'customer-satisfaction', label: 'Satisfaction', icon: Smile },
];

// Fusionne Réclamations clients et Satisfaction client sous un seul lien de menu ("Retours
// clients", voir Layout.jsx#NAV_ITEMS) : chaque module reste une page complète et autonome
// (données, formulaires, exports, permissions backend — requireMenuVisible('complaints') et
// ('customer-satisfaction') inchangés côté API) ; seule la navigation entre les deux est
// mutualisée ici, via deux onglets calés sur les URLs historiques (/complaints,
// /customer-satisfaction) pour ne rien casser des liens déjà existants (widget Dashboard,
// navigation interne des fiches détail — voir ComplaintDetail.jsx/CustomerSatisfactionDetail.jsx).
export default function CustomerFeedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleMenuKeys = useMenuVisibility();

  // null tant que non chargé => on affiche les deux onglets par défaut, comme ailleurs (voir
  // Capas.jsx#qqoqccpVisible), pour ne pas faire clignoter l'interface le temps du chargement.
  // Si un admin a masqué l'un des deux modules pour ce rôle, son onglet disparaît simplement —
  // la visibilité de chaque module reste aussi fine qu'avant la fusion.
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
        {activeTab.key === 'complaints' ? <Complaints /> : <CustomerSatisfaction />}
      </Suspense>
    </div>
  );
}
