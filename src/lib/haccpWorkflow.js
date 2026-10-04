import { isDocumentedControlDecision, isOperationalCcp } from './haccpStatus.js';

export const HACCP_DOSSIER_FIELDS = [
  ['product_characteristics', 'Caractéristiques du produit', 'Composition, allergènes, conditionnement, durée de vie et conditions de conservation.'],
  ['intended_use', 'Usage prévu', 'Mode de consommation et préparation attendue.'],
  ['consumer_groups', 'Consommateurs concernés', 'Public visé, populations sensibles et restrictions éventuelles.'],
  ['prerequisites', 'Programmes prérequis', 'Hygiène, nettoyage, nuisibles, maintenance, fournisseurs, formation : références des procédures et preuves de leur application.'],
  ['flow_diagram_reference', 'Diagramme du procédé', 'Référence et version du diagramme couvrant toutes les étapes et les flux.'],
  ['flow_diagram_verification', 'Confirmation du diagramme sur site', 'Qui a confirmé le diagramme, à quelle date et selon quelles observations ?'],
  ['validation_review_notes', 'Validation des mesures de maîtrise', 'Preuves que les mesures peuvent maîtriser les dangers : études, textes applicables ou validation du procédé.'],
  ['verification_review_notes', 'Vérification du système', 'Résultats de revue des relevés, audits, contrôles et suivi des actions correctives.'],
  ['no_ccp_justification', 'Conclusion si aucun CCP identifié', 'À renseigner uniquement si l’analyse ne retient aucun CCP. Justifiez les mesures retenues et la conclusion de l’équipe, sans créer de CCP artificiel.'],
];

export const HACCP_WORKFLOW_STAGES = [
  { id: 'dossier', title: 'Dossier', description: 'Décrivez le produit, le procédé et rassemblez les preuves.' },
  { id: 'analysis', title: 'Dangers', description: 'Ajoutez un danger ou cliquez sur « Analyser ce danger ». Un seul parcours vous guide : danger, maîtrise, puis suivi si un CCP est retenu.' },
  { id: 'ccps', title: 'Préparer les CCP', description: 'Un CCP est un point critique à maîtriser. Complétez ses limites, ses preuves et son suivi, puis faites-le approuver.' },
  { id: 'surveillance', title: 'Relevés', description: 'Mesurez les CCP opérationnels, consultez les résultats et traitez les écarts.' },
];

const hasText = (value) => typeof value === 'string' && Boolean(value.trim());

export function getHaccpWorkflow(plan) {
  const hazards = plan.steps.flatMap((step) => step.hazards);
  const ccps = hazards.flatMap((hazard) => hazard.ccp ? [hazard.ccp] : []);
  const operationalCcps = ccps.filter(isOperationalCcp);
  const pendingCcps = ccps.length - operationalCcps.length;
  const dossierFields = HACCP_DOSSIER_FIELDS.slice(0, -1);
  const dossierCompleted = dossierFields.filter(([field]) => hasText(plan[field])).length;
  const undecided = hazards.filter((hazard) => !isDocumentedControlDecision(hazard)).length;

  let next;
  if (plan.status === 'archived') {
    next = { stage: 'dossier', label: 'Consulter le dossier', message: 'Ce plan est archivé. Consultez son dossier et ses relevés conservés.' };
  } else if (!['product_description', 'scope', 'team'].every((field) => hasText(plan[field])) || dossierFields.slice(0, 6).some(([field]) => !hasText(plan[field]))) {
    next = { stage: 'dossier', label: 'Ouvrir le dossier', message: 'Commencez par décrire le produit, le périmètre et le procédé.' };
  } else if (!plan.steps.length || plan.steps.some((step) => !step.hazards.length) || undecided || hazards.some((hazard) => hazard.control_type === 'process_change')) {
    next = { stage: 'analysis', label: 'Ouvrir les dangers', message: 'Analysez chaque étape et justifiez les décisions de maîtrise. Un procédé à modifier doit être réévalué.' };
  } else if (pendingCcps || hazards.some((hazard) => hazard.control_type === 'ccp' && !hazard.ccp) || ccps.some((ccp) => ccp.status === 'legacy')) {
    next = { stage: 'ccps', label: 'Préparer les CCP', message: 'Complétez les CCP et vérifiez leurs preuves avant approbation. Le suivi des CCP historiques reste accessible.' };
  } else if (dossierCompleted < dossierFields.length || (!ccps.length && !hasText(plan.no_ccp_justification))) {
    next = { stage: 'dossier', label: 'Finaliser le dossier', message: 'Documentez la validation et la vérification ; si aucun CCP n’est retenu, justifiez cette conclusion.' };
  } else if (plan.status !== 'active') {
    next = { stage: 'dossier', label: 'Revoir le dossier', message: 'Revoyez le dossier avec l’équipe HACCP, puis utilisez le statut du plan pour demander son activation. Le serveur contrôle les conditions de mise en service.' };
  } else if (!ccps.length) {
    next = { stage: 'dossier', label: 'Consulter le dossier', message: 'Aucun CCP retenu : appliquez les mesures de maîtrise documentées et poursuivez la vérification du plan.' };
  } else {
    next = { stage: 'surveillance', label: 'Saisir les relevés', message: 'Les CCP opérationnels sont accessibles pour les relevés. Poursuivez aussi la vérification et la revue du plan.' };
  }

  return { hazards: hazards.length, ccps: ccps.length, operationalCcps: operationalCcps.length, pendingCcps, undecided, dossierCompleted, dossierTotal: dossierFields.length, next };
}
