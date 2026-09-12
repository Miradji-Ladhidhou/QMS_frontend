import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Capas = lazy(() => import('./Capas.jsx'));
const Pdca = lazy(() => import('./Pdca.jsx'));

const TABS = [
  { key: 'capas', to: '/capas', menuKey: 'capas', label: 'CAPA', icon: ClipboardList },
  { key: 'pdca', to: '/pdca', menuKey: 'pdca', label: 'PDCA', icon: RefreshCw },
];

// Fusionne CAPA et PDCA sous un seul lien de menu ("Actions d'amélioration", voir
// Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx (Réclamations/Satisfaction) :
// deux modules structurellement proches (statut, échéance, actions, responsable) mais aux
// données et workflows indépendants, réutilisés tels quels via deux onglets calés sur les URLs
// historiques (/capas, /pdca) pour ne rien casser des liens existants (créer une CAPA depuis
// Audits/Risks/Complaints/Accidents/NonconformingOutputs/Qqoqccp, navigation des fiches détail).
export default function ImprovementActions() {
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
        {activeTab.key === 'capas' ? <Capas /> : <Pdca />}
      </Suspense>
    </div>
  );
}
