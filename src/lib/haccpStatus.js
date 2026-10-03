export const PLAN_STATUS_LABELS = {
  draft: 'Brouillon',
  active: 'Actif',
  under_review: 'En revue',
  archived: 'Archivé',
};

export const PLAN_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  under_review: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-100 text-slate-500',
};

export const HAZARD_TYPE_LABELS = {
  biological: 'Biologique',
  chemical: 'Chimique',
  physical: 'Physique',
  allergen: 'Allergène',
};

export const HAZARD_TYPE_STYLES = {
  biological: 'bg-red-100 text-red-700',
  chemical: 'bg-purple-100 text-purple-700',
  physical: 'bg-blue-100 text-blue-700',
  allergen: 'bg-amber-100 text-amber-700',
};

export const CONTROL_TYPE_LABELS = {
  undetermined: 'Décision à documenter',
  prp: 'Bonnes pratiques / prérequis',
  ccp: 'Point critique (CCP)',
  process_change: 'Procédé à modifier',
};

export const CCP_APPROVAL_LABELS = {
  draft: 'Brouillon — non opérationnel',
  approved: 'Approuvé',
  legacy: 'CCP existant — validation à documenter',
};

export function isOperationalCcp(ccp) {
  return ccp.status === 'approved' || ccp.status === 'legacy';
}

export const CCP_VALIDATION_FIELDS = [
  ['critical_limits', 'Limites critiques'],
  ['validation_source', 'Source des limites'],
  ['validation_evidence', 'Preuves de validation'],
  ['monitoring_procedure', 'Méthode de surveillance'],
  ['monitoring_frequency', 'Fréquence de surveillance'],
  ['monitoring_responsible', 'Responsable de surveillance'],
  ['corrective_action_procedure', 'Actions correctives'],
  ['verification_procedure', 'Procédure de vérification'],
  ['verification_frequency', 'Fréquence de vérification'],
  ['record_keeping_procedure', 'Enregistrements'],
];

export function missingCcpValidationFields(ccp) {
  return CCP_VALIDATION_FIELDS.flatMap(([field, label]) => {
    const text = typeof ccp[field] === 'string' ? ccp[field].trim() : '';
    if (!text) return [label];
    if (field === 'monitoring_responsible') return [];
    const minLength = field === 'validation_evidence' ? 20 : field === 'validation_source' ? 5 : 8;
    if (text.length < minLength) return [`${label} (au moins ${minLength} caractères)`];
    if (/^(?:n\/?a|none|tbd|todo|à compléter|a completer|non renseigné|non renseigne|à confirmer|a confirmer|aucun)$/i.test(text)) {
      return [`${label} (contenu à documenter)`];
    }
    return [];
  });
}
