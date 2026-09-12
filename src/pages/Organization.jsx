import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Contact, Wrench } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Services = lazy(() => import('./Services.jsx'));
const Employees = lazy(() => import('./Employees.jsx'));

const TABS = [
  { key: 'services', to: '/services', menuKey: 'services', label: 'Services', icon: Wrench },
  { key: 'employees', to: '/employees', menuKey: 'employees', label: 'Personnel', icon: Contact },
];

// Fusionne Services et Personnel sous un seul lien de menu ("Organisation", voir
// Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx : deux référentiels simples,
// gérés par l'admin, masqués par défaut pour manager/member (voir DEFAULT_HIDDEN_FOR_ROLE côté
// backend, déjà identique pour les deux clés), réutilisés tels quels via deux onglets calés
// sur les URLs historiques (/services, /employees) pour ne rien casser des liens existants
// (sélecteurs de service/personne dans les autres modules).
export default function Organization() {
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
        {activeTab.key === 'services' ? <Services /> : <Employees />}
      </Suspense>
    </div>
  );
}
