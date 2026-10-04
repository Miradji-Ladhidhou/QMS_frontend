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
};

export function useAiModule(module) {
  const tenant = useTenant();
  return Boolean(tenant) && tenant.ai_modules?.[module] !== false;
}

export function withAiModule(module, Component) {
  return function AiModuleContent(props) {
    return useAiModule(module) ? <Component {...props} /> : null;
  };
}

export function AiModuleGate({ module, children }) {
  return useAiModule(module) ? children : null;
}
