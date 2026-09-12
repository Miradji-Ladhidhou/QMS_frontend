import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, FileCheck, FileText, ScrollText } from 'lucide-react';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';

const Documents = lazy(() => import('./Documents.jsx'));
const Procedures = lazy(() => import('./Procedures.jsx'));
const MyApprovals = lazy(() => import('./MyApprovals.jsx'));
const QualityPolicy = lazy(() => import('./QualityPolicy.jsx'));

// menuKey absent (Politique qualité) => onglet toujours affiché, jamais filtré — voir plus bas.
const TABS = [
  { key: 'documents', to: '/documents', menuKey: 'documents', label: 'Documents', icon: FileText },
  { key: 'procedures', to: '/procedures', menuKey: 'procedures', label: 'Procédures', icon: FileCheck },
  { key: 'my-approvals', to: '/my-approvals', menuKey: 'my-approvals', label: 'Mes approbations', icon: CheckSquare },
  { key: 'quality-policy', to: '/quality-policy', label: 'Politique qualité', icon: ScrollText },
];

const TAB_COMPONENTS = {
  documents: Documents,
  procedures: Procedures,
  'my-approvals': MyApprovals,
  'quality-policy': QualityPolicy,
};

// Fusionne Documents, Procédures, Mes approbations et Politique qualité sous un seul lien de
// menu, même principe que CustomerFeedback.jsx — mais avec une contrainte propre à Politique
// qualité : ISO 9001 §5.2 exige qu'elle reste "communiquée, comprise et disponible" pour tout
// le tenant, donc jamais masquable par un réglage de visibilité par rôle (voir l'ancienne
// entrée `alwaysVisible` dans Layout.jsx#NAV_ITEMS, avant cette fusion). Le lien de menu
// fusionné reprend cette garantie (alwaysVisible sur l'entrée fusionnée, voir Layout.jsx) :
// même si 'documents', 'procedures' ou 'my-approvals' sont masqués pour un rôle, le lien reste
// joignable et n'affiche alors que l'onglet Politique qualité. Chaque module reste une page
// complète et autonome, via des onglets calés sur les URLs historiques (/documents,
// /procedures, /my-approvals, /quality-policy) — le lien entre Mes approbations et les deux
// autres est réel, pas seulement thématique : /workflows/mine et
// /procedures/pending-validations (voir MyApprovals.jsx) ne portent que sur des
// documents/procédures en attente de validation.
export default function DocumentsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleMenuKeys = useMenuVisibility();

  // null tant que non chargé => on affiche tous les onglets par défaut, comme ailleurs (voir
  // Capas.jsx#qqoqccpVisible), pour ne pas faire clignoter l'interface le temps du chargement.
  // Un onglet sans menuKey (Politique qualité) n'est jamais filtré.
  const visibleTabs = TABS.filter((tab) => !tab.menuKey || !visibleMenuKeys || visibleMenuKeys.includes(tab.menuKey));
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
