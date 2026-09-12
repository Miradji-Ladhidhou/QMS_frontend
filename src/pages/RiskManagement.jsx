import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Thermometer } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Risks = lazy(() => import('./Risks.jsx'));
const Haccp = lazy(() => import('./Haccp.jsx'));

const TABS = [
  { key: 'risks', to: '/risks', menuKey: 'risks', label: 'Registre des risques', icon: ShieldAlert },
  { key: 'haccp', to: '/haccp', menuKey: 'haccp', label: 'HACCP', icon: Thermometer },
];

// Fusionne Registre des risques et HACCP sous un seul lien de menu ("Gestion des risques",
// voir Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx : deux outils de la même
// famille conceptuelle (identifier un danger/risque, l'évaluer, le maîtriser), aux structures
// de données et workflows indépendants (HACCP est hiérarchique : étapes → dangers → CCP, quand
// Risks reste une liste plate notée probabilité/gravité), réutilisés tels quels via deux
// onglets calés sur les URLs historiques (/risks, /haccp) pour ne rien casser des liens
// existants (créer une CAPA depuis un risque ou un plan HACCP, navigation des fiches détail).
export default function RiskManagement() {
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
        {activeTab.key === 'risks' ? <Risks /> : <Haccp />}
      </Suspense>
    </div>
  );
}
