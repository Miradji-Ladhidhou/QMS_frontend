import { useState } from 'react';
import ModuleCategoryManager from './ModuleCategoryManager.jsx';

const RESOURCE_TABS = [
  { id: 'capa', label: 'CAPA' },
  { id: 'complaint', label: 'Réclamations clients' },
  { id: 'qqoqccp', label: 'QQOQCCP' },
  { id: 'supplier', label: 'Fournisseurs' },
  { id: 'training', label: 'Formations' },
  { id: 'management_review', label: 'Revues de direction' },
  { id: 'audit', label: 'Audits' },
  { id: 'risk', label: 'Risques' },
  { id: 'task', label: 'Planning' },
  { id: 'kpi', label: 'KPI' },
];

export default function ModuleCategoriesSettings({ isAdmin }) {
  const [activeResource, setActiveResource] = useState('capa');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Catégories par module</h2>
      <p className="mt-1 text-sm text-slate-500">
        Regroupez les éléments d'un module et, si besoin, restreignez l'accès à une catégorie précise —
        même principe que les catégories de documents.
      </p>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {RESOURCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveResource(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeResource === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <ModuleCategoryManager resourceType={activeResource} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
