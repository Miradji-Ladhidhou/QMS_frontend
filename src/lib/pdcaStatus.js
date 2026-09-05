export const PDCA_STATUS_LABELS = { plan: 'Plan', do: 'Do', check: 'Check', act: 'Act', closed: 'Clôturé' };

export const PDCA_STATUS_STYLES = {
  plan: 'bg-slate-100 text-slate-700',
  do: 'bg-blue-100 text-blue-700',
  check: 'bg-amber-100 text-amber-700',
  act: 'bg-purple-100 text-purple-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

// Ordre fixe du cycle (hors 'closed', qui n'est pas une phase à documenter mais l'état final) —
// utilisé pour savoir quelle phase vient après une autre et pour rendre les 4 sections dans
// l'ordre côté PdcaDetail.jsx.
export const PDCA_PHASES = ['plan', 'do', 'check', 'act'];
