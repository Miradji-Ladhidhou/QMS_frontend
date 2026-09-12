import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PackageX, Siren } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Accidents = lazy(() => import('./Accidents.jsx'));
const NonconformingOutputs = lazy(() => import('./NonconformingOutputs.jsx'));

const TABS = [
  { key: 'accidents', to: '/accidents', menuKey: 'accidents', label: 'Accidents du travail', icon: Siren },
  {
    key: 'nonconforming-outputs',
    to: '/nonconforming-outputs',
    menuKey: 'nonconforming-outputs',
    label: 'Non-conformités produit/service',
    icon: PackageX,
  },
];

// Fusionne Accidents du travail et Non-conformités produit/service sous un seul lien de menu
// ("Signalements", voir Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx : même
// mécanique de formulaire (signaler un événement, l'investiguer, éventuellement créer une
// CAPA), ouverte à tous les rôles dans les deux cas, mais deux domaines réglementaires
// distincts (sécurité au travail vs qualité produit/service) — d'où des données et workflows
// indépendants, réutilisés tels quels via deux onglets calés sur les URLs historiques
// (/accidents, /nonconforming-outputs) pour ne rien casser des liens existants.
export default function Incidents() {
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
        {activeTab.key === 'accidents' ? <Accidents /> : <NonconformingOutputs />}
      </Suspense>
    </div>
  );
}
