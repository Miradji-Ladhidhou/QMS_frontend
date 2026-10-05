export const PROBLEM_GUIDE_MODULES = [
  {
    id: 'complaints',
    label: 'Réclamations',
    path: '/complaints',
    description: 'Enregistrez et traitez une réclamation client.',
    keywords: [
      ['réclamation', 110], ['réclamations', 110], ['plainte client', 105],
      ['client mécontent', 105], ['client est mécontent', 105], ['client insatisfait', 100],
      ['insatisfaction client', 100],
      ['retour client', 90], ['mécontentement', 85],
    ],
  },
  {
    id: 'customer-satisfaction',
    label: 'Satisfaction client',
    path: '/customer-satisfaction',
    description: 'Suivez les retours et le niveau de satisfaction de vos clients.',
    keywords: [
      ['satisfaction client', 110], ['client mécontent', 90], ['client est mécontent', 90],
      ['client insatisfait', 90],
      ['avis client', 90], ['enquête client', 85], ['retour client', 70],
      ['réclamation client', 80], ['réclamation', 80], ['insatisfaction', 75],
    ],
  },
  {
    id: 'nonconforming-outputs',
    label: 'Non-conformités produit/service',
    path: '/nonconforming-outputs',
    description: 'Enregistrez un produit, un service ou une opération non conforme.',
    keywords: [
      ['non conformité', 110], ['non conforme', 110], ['défectueux', 100],
      ['défectueuse', 100], ['produit abîmé', 100], ['erreur de préparation', 105],
      ['erreur pendant la préparation', 105], ['erreur', 55], ['défaut produit', 95],
      ['problème qualité', 70],
    ],
  },
  {
    id: 'capas',
    label: 'CAPA',
    path: '/capas',
    description: 'Définissez, attribuez et suivez une action corrective ou préventive.',
    keywords: [
      ['capa', 115], ['action corrective', 110], ['action préventive', 105],
      ['problème récurrent', 100], ['récurrent', 75], ['répétitif', 85],
      ['se répète', 80], ['éviter que cela se reproduise', 100], ['cause racine', 90],
      ['corriger durablement', 95], ['réclamation', 60], ['non conformité', 50],
      ['erreur de préparation', 60], ['erreur pendant la préparation', 60],
    ],
  },
  {
    id: 'qqoqccp',
    label: 'QQOQCCP',
    path: '/qqoqccp',
    description: 'Structurez les faits et décrivez précisément la situation à analyser.',
    keywords: [
      ['qqoqccp', 115], ['analyser le problème', 90], ['analyse du problème', 90],
      ['comprendre le problème', 80], ['décrire les faits', 85], ['clarifier les faits', 85],
      ['problème récurrent', 55], ['erreur de préparation', 60],
      ['erreur pendant la préparation', 60], ['non conformité', 50], ['réclamation', 70],
    ],
  },
  {
    id: 'suppliers',
    label: 'Évaluation fournisseurs',
    path: '/suppliers',
    description: 'Consultez et évaluez les performances de vos fournisseurs.',
    keywords: [
      ['fournisseur', 110], ['fournisseurs', 110], ['prestataire', 90],
      ['produit reçu', 75], ['produits reçus', 75], ['livraison fournisseur', 100],
      ['retard de livraison', 65], ['retards de livraison', 65],
    ],
  },
  {
    id: 'accidents',
    label: 'Accidents du travail',
    path: '/accidents',
    description: 'Déclarez et suivez un accident ou un incident au travail.',
    keywords: [
      ['accident', 115], ['blessure', 105], ['incident de travail', 110],
      ['accident du travail', 120], ['presque accident', 100], ['salarié blessé', 110],
    ],
  },
  {
    id: 'risks',
    label: 'Registre des risques',
    path: '/risks',
    description: 'Évaluez un risque identifié et suivez son traitement.',
    keywords: [
      ['risque', 110], ['risques', 110], ['danger', 95], ['risque identifié', 120],
      ['situation dangereuse', 105], ['prévenir un risque', 100],
    ],
  },
  {
    id: 'trainings',
    label: 'Formations',
    path: '/trainings',
    description: 'Planifiez et suivez les formations et compétences requises.',
    keywords: [
      ['formation', 110], ['former', 95], ['besoin de formation', 115],
      ['besoin de former', 105], ['compétence', 90], ['compétences', 90],
      ['formé', 100], ['formée', 100], ['ne maîtrise pas', 95], ['ne maîtrisent pas', 95],
      ['manque de compétence', 100],
    ],
  },
  {
    id: 'employees',
    label: 'Personnel',
    path: '/employees',
    description: 'Consultez les informations et compétences du personnel.',
    keywords: [
      ['personnel', 85], ['salarié', 80], ['salariés', 80], ['employé', 80],
      ['employés', 80], ['collaborateur', 75], ['collaborateurs', 75],
    ],
  },
  {
    id: 'procedures',
    label: 'Procédures',
    path: '/procedures',
    description: 'Consultez et gérez les procédures applicables.',
    keywords: [
      ['procédure', 110], ['procédures', 110], ['mode opératoire', 100],
      ['instruction de travail', 100], ['procédure non respectée', 120],
      ['non respect de la procédure', 120], ['respecter la procédure', 100],
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    path: '/documents',
    description: 'Retrouvez les documents et enregistrements associés à votre activité.',
    keywords: [
      ['document qualité', 85], ['documents qualité', 85], ['enregistrement', 70],
      ['document associé', 70],
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    path: '/planning',
    description: 'Planifiez les tâches et échéances liées au traitement du problème.',
    keywords: [
      ['planifier', 100], ['planning', 100], ['échéance', 85], ['plan d’action', 95],
      ['plan d action', 95], ['suivre les actions', 90], ['action à réaliser', 90],
      ['retard de livraison', 60], ['retards de livraison', 60],
    ],
  },
  {
    id: 'kpis',
    label: 'KPIs',
    path: '/kpis',
    description: 'Suivez les indicateurs et l’évolution du problème dans le temps.',
    keywords: [
      ['indicateur', 100], ['kpi', 100], ['évolution', 90], ['tendance', 90],
      ['beaucoup de', 60], ['fréquence', 85], ['problème récurrent', 65],
      ['retards de livraison', 55], ['erreurs répétées', 85],
    ],
  },
  {
    id: 'pdca',
    label: 'PDCA',
    path: '/pdca',
    description: 'Organisez une démarche d’amélioration continue et suivez ses étapes.',
    keywords: [
      ['amélioration continue', 105], ['démarche d’amélioration', 100],
      ['cycle pdca', 110], ['pdca', 110],
    ],
  },
  {
    id: 'audits',
    label: 'Audits internes',
    path: '/audits',
    description: 'Vérifiez la conformité des pratiques au cours d’un audit interne.',
    keywords: [
      ['audit interne', 110], ['auditer', 90], ['vérifier la conformité', 85],
      ['écart d’audit', 100], ['écart audit', 100],
    ],
  },
  {
    id: 'haccp',
    label: 'HACCP',
    path: '/haccp',
    description: 'Consignez et suivez les éléments de maîtrise sanitaire HACCP.',
    keywords: [
      ['haccp', 115], ['hygiène alimentaire', 110], ['sécurité alimentaire', 110],
      ['contamination alimentaire', 110], ['chaîne du froid', 100],
    ],
  },
];

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[’']/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getProblemRecommendations(query, { appModules, visibleMenuKeys } = {}) {
  const normalizedQuery = normalizeText(query || '');
  if (!normalizedQuery || !Array.isArray(visibleMenuKeys)) return [];

  const queryWords = new Set(normalizedQuery.split(' '));

  return PROBLEM_GUIDE_MODULES
    .filter((module) => appModules?.[module.id] !== false && visibleMenuKeys.includes(module.id))
    .map((module) => {
      const score = module.keywords.reduce((total, [keyword, weight]) => {
        const normalizedKeyword = normalizeText(keyword);
        const matches = normalizedKeyword.includes(' ')
          ? normalizedQuery.includes(normalizedKeyword)
          : queryWords.has(normalizedKeyword);
        return matches ? total + weight : total;
      }, 0);
      return { ...module, score };
    })
    .filter((module) => module.score >= 50)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'fr'));
}

export function getRelevanceLabel(score) {
  if (score >= 100) return 'Très élevée';
  if (score >= 75) return 'Élevée';
  return 'Pertinente';
}
