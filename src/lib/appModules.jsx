import { useTenant } from './useTenant.js';

export const APP_MODULE_LABELS = {
  dashboard: 'Tableau de bord',
  planning: 'Planning et tâches',
  documents: 'Documents',
  capas: 'CAPA',
  complaints: 'Réclamations',
  trainings: 'Formations',
  kpis: 'KPIs',
  qqoqccp: 'QQOQCCP',
  audits: 'Audits internes',
  risks: 'Risques',
  haccp: 'HACCP',
  suppliers: 'Fournisseurs',
  'management-reviews': 'Revues de direction',
  procedures: 'Procédures',
  accidents: 'Accidents du travail',
  pdca: 'PDCA',
  'nonconforming-outputs': 'Non-conformités produit/service',
  'customer-satisfaction': 'Satisfaction client',
  'my-approvals': 'Mes approbations',
  services: 'Services',
  employees: 'Personnel',
};

export function AppModuleFields({ settings, onChange, disabled = false }) {
  return Object.entries(APP_MODULE_LABELS).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={settings[key]} disabled={disabled}
      onChange={(event) => onChange({ ...settings, [key]: event.target.checked })} />
    {label}
  </label>);
}

export function useAppModule(module) {
  const tenant = useTenant();
  return Boolean(tenant) && tenant.app_modules?.[module] !== false;
}
