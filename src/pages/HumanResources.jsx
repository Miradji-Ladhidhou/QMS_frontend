import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Contact, GraduationCap } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Employees = lazy(() => import('./Employees.jsx'));
const Trainings = lazy(() => import('./Trainings.jsx'));

const TABS = [
  { key: 'employees', to: '/employees', menuKey: 'employees', label: 'Personnel', icon: Contact },
  { key: 'trainings', to: '/trainings', menuKey: 'trainings', label: 'Formations', icon: GraduationCap },
];

// Fusionne Personnel et Formations sous un seul lien de menu ("Ressources humaines", voir
// Layout.jsx#NAV_ITEMS) — même principe que CustomerFeedback.jsx, mais ici les deux modules
// ont un vrai lien de données (pas seulement thématique) : chaque formation suivie est
// rattachée à une personne, et Trainings.jsx contient déjà une matrice de compétences
// (/trainings/matrix, route séparée, inchangée) qui croise employés × compétences. Chaque
// module reste néanmoins une page complète et autonome (données, formulaires, exports), via
// deux onglets calés sur les URLs historiques (/employees, /trainings).
//
// Clé de menu porteuse volontairement 'trainings', pas 'employees' : 'employees' est masqué
// par défaut pour manager/member (voir DEFAULT_HIDDEN_FOR_ROLE côté backend) alors que
// 'trainings' est visible par défaut pour tous les rôles — si le lien latéral dépendait
// d'employees, tout le menu (y compris l'onglet Formations, aujourd'hui visible pour tous)
// disparaîtrait par défaut pour manager/member. Voir Layout.jsx#NAV_ITEMS pour ce choix.
export default function HumanResources() {
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
        {activeTab.key === 'employees' ? <Employees /> : <Trainings />}
      </Suspense>
    </div>
  );
}
