import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, HelpCircle, RefreshCw } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Capas = lazy(() => import('./Capas.jsx'));
const Pdca = lazy(() => import('./Pdca.jsx'));
const Qqoqccp = lazy(() => import('./Qqoqccp.jsx'));

const TABS = [
  { key: 'capas', to: '/capas', menuKey: 'capas', label: 'CAPA', icon: ClipboardList },
  { key: 'pdca', to: '/pdca', menuKey: 'pdca', label: 'PDCA', icon: RefreshCw },
  { key: 'qqoqccp', to: '/qqoqccp', menuKey: 'qqoqccp', label: 'QQOQCCP', icon: HelpCircle },
];

const TAB_COMPONENTS = { capas: Capas, pdca: Pdca, qqoqccp: Qqoqccp };

// Fusionne CAPA, PDCA et QQOQCCP sous un seul lien de menu ("Actions d'amélioration", voir
// Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx (Réclamations/Satisfaction) :
// trois modules structurellement proches ou directement liés (QQOQCCP diagnostique un
// problème et alimente directement CAPA — bouton "Créer une CAPA depuis cette analyse", voir
// POST /qqoqccp/:id/create-capa dans QqoqccpDetail.jsx — quand CAPA et PDCA partagent la même
// mécanique de suivi : statut, échéance, actions, responsable), mais aux données et workflows
// indépendants, réutilisés tels quels via des onglets calés sur les URLs historiques (/capas,
// /pdca, /qqoqccp) pour ne rien casser des liens existants (créer une CAPA depuis
// Audits/Risks/Complaints/Accidents/NonconformingOutputs/Qqoqccp, navigation des fiches détail).
export default function ImprovementActions() {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleMenuKeys = useMenuVisibility();

  // null tant que non chargé => on affiche les trois onglets par défaut, comme ailleurs (voir
  // Capas.jsx#qqoqccpVisible), pour ne pas faire clignoter l'interface le temps du chargement.
  const visibleTabs = TABS.filter((tab) => !visibleMenuKeys || visibleMenuKeys.includes(tab.menuKey));
  const activeTab = visibleTabs.find((tab) => location.pathname.startsWith(tab.to)) || visibleTabs[0];

  if (!activeTab) return null;

  const ActiveComponent = TAB_COMPONENTS[activeTab.key];

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
        <ActiveComponent />
      </Suspense>
    </div>
  );
}
