import { useTenant } from './useTenant.js';

export const AI_MODULE_LABELS = {
  capas: 'CAPA — suggestions partagées dans tous les modules',
  qqoqccp: 'QQOQCCP — diagnostic IA',
  pdca: 'PDCA — génération des phases',
  risks: 'Risques — identification et traitement',
  haccp: 'HACCP — dangers, maîtrise et surveillance',
  audits: 'Audits — génération de check-list',
  management_reviews: 'Revues de direction — brouillon IA',
  procedures: 'Procédures — rédaction, conformité et diffusion',
  kpis: 'KPIs — assistance aux imports',
  problem_guide: 'Guide de résolution — recherche assistée',
};

export function useAiModule(module) {
  const tenant = useTenant();
  return Boolean(tenant) && tenant.ai_modules?.[module] !== false;
}

export function withAiModule(module, Component) {
  return function AiModuleContent(props) {
    return useAiModule(module) ? <Component {...props} /> : <AiModuleNotice module={module} />;
  };
}

export function AiModuleGate({ module, children }) {
  return useAiModule(module) ? children : <AiModuleNotice module={module} />;
}

export function AiModuleNotice({ module }) {
  const tenant = useTenant();
  if (!tenant) return null;
  return <p className="text-xs text-slate-500" role="note">
    {AI_MODULE_LABELS[module]?.split(' — ')[0] || 'Module'} : assistance IA non incluse dans les accès de votre entreprise.
    {' '}Contactez votre administrateur. Les fonctions manuelles restent disponibles.
  </p>;
}

export function AiModuleFields({ settings, onChange, disabled = false }) {
  return Object.entries(AI_MODULE_LABELS).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={settings[key]} disabled={disabled}
      onChange={(event) => onChange({ ...settings, [key]: event.target.checked })} />
    {label}
  </label>);
}
