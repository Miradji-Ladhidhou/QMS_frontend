// Contenu des encadrés d'aide en tête de page (composant components/PageGuide.jsx).
// Clé = `id` passé à <PageGuide />. Pages de module : la clé de menu (Layout.jsx).
// Pages de détail : `<module>Detail`. Garder court : 2-3 phrases, gras sur les mots-clés.

export const PAGE_GUIDES = {
  // ------- Pages de module -------
  planning: {
    title: 'Toutes vos échéances au même endroit',
    body: (
      <p>
        Agenda unique qui regroupe <strong>automatiquement</strong> les échéances de toute l'application (CAPA, revues de
        documents, formations, audits, risques…), plus les <strong>tâches</strong> libres que vous créez ici. Rien à
        ressaisir ailleurs.
      </p>
    ),
  },
  documents: {
    title: 'La bibliothèque documentaire du SMQ',
    body: (
      <p>
        Procédures, formulaires, enregistrements — avec <strong>gestion des versions</strong> et piste d'audit. Chaque
        document vit dans un <strong>dossier</strong> laissé ouvert à tous ou restreint à certaines personnes. <em>ISO 9001 §7.5.</em>
      </p>
    ),
  },
  capas: {
    title: "Traiter un problème pour qu'il ne revienne pas",
    body: (
      <p>
        Une CAPA sert à identifier la <strong>cause racine</strong> d'un problème, décider une <strong>action corrective</strong>,
        puis <strong>vérifier son efficacité</strong> avant de clôturer. <em>ISO 9001 §10.2.</em>
      </p>
    ),
  },
  complaints: {
    title: "Suivre les réclamations clients jusqu'au bout",
    body: (
      <p>
        De la réception à la résolution, en gardant la trace de la <strong>satisfaction du client</strong> une fois la
        réclamation traitée. Une réclamation grave peut déclencher une CAPA. <em>ISO 9001 §9.1.2.</em>
      </p>
    ),
  },
  trainings: {
    title: 'Formations et compétences du personnel',
    body: (
      <p>
        Le catalogue des formations et qui les a suivies. La <strong>matrice</strong> croise le personnel et les formations
        obligatoires par poste pour repérer les <strong>manques</strong> et les <strong>recyclages en retard</strong>. <em>ISO 9001 §7.2.</em>
      </p>
    ),
  },
  kpis: {
    title: 'Piloter par les indicateurs',
    body: (
      <p>
        Un KPI est une valeur suivie dans le temps, comparée à un <strong>objectif</strong>. Alimentation au choix : saisie
        manuelle, import Excel, ou <strong>calcul automatique</strong> depuis un autre module. <em>ISO 9001 §9.1.</em>
      </p>
    ),
  },
  qqoqccp: {
    title: "Cadrer un problème avant d'agir",
    body: (
      <p>
        Analyse d'une situation par questions — <strong>Q</strong>uoi, <strong>Q</strong>ui, <strong>O</strong>ù,{' '}
        <strong>Q</strong>uand, <strong>C</strong>omment, <strong>C</strong>ombien, <strong>P</strong>ourquoi. Souvent
        utilisée en amont d'une CAPA pour ne rien oublier.
      </p>
    ),
  },
  audits: {
    title: 'Programmer et mener les audits internes',
    body: (
      <p>
        Planifier les audits, les conduire, consigner les <strong>constats</strong> (points forts, écarts,
        non-conformités) et les transformer en actions. <em>ISO 9001 §9.2.</em>
      </p>
    ),
  },
  risks: {
    title: 'Le registre des risques et opportunités',
    body: (
      <p>
        Identifier un risque, le <strong>coter</strong> (gravité × probabilité), décider un traitement — accepter,
        réduire, éviter ou transférer — puis suivre le plan d'action. <em>ISO 9001 §6.1.</em>
      </p>
    ),
  },
  haccp: {
    title: 'Maîtrise sanitaire des aliments',
    body: (
      <p>
        Démarche HACCP : recenser les <strong>dangers</strong>, définir les <strong>points critiques (CCP)</strong> et
        leurs limites, organiser la surveillance et les actions correctives. Pour l'agroalimentaire.
      </p>
    ),
  },
  suppliers: {
    title: 'Évaluer les fournisseurs critiques',
    body: (
      <p>
        Notation périodique des fournisseurs (qualité, délais, réactivité) et trace des décisions de{' '}
        <strong>(re)qualification</strong>. <em>ISO 9001 §8.4.</em>
      </p>
    ),
  },
  'management-reviews': {
    title: 'Préparer et acter la revue de direction',
    body: (
      <p>
        Rassembler les <strong>entrées</strong> (indicateurs, audits, réclamations, actions en cours…) et enregistrer les{' '}
        <strong>décisions et actions</strong> qui en sortent. <em>ISO 9001 §9.3.</em>
      </p>
    ),
  },
  procedures: {
    title: 'Rédiger et faire vivre les procédures',
    body: (
      <p>
        Écriture assistée d'une procédure et circuit de <strong>relecture / approbation</strong>. Complémentaire de
        Documents, orienté rédaction.
      </p>
    ),
  },
  accidents: {
    title: 'Accidents et presqu’accidents du travail',
    body: (
      <p>
        Déclarer un accident, analyser sa cause et suivre les <strong>jours d'arrêt</strong>. Volet santé-sécurité au
        travail.
      </p>
    ),
  },
  pdca: {
    title: 'Piloter une amélioration en 4 étapes',
    body: (
      <p>
        Conduire un projet d'amélioration selon le cycle <strong>Plan – Do – Check – Act</strong>, étape après étape
        jusqu'à la clôture.
      </p>
    ),
  },
  'quality-objectives': {
    title: "Les objectifs qualité de l'entreprise",
    body: (
      <p>
        Un objectif <strong>mesurable</strong>, avec une échéance, un responsable et un suivi d'avancement. Peut être
        relié à un KPI pour se mettre à jour tout seul. <em>ISO 9001 §6.2.</em>
      </p>
    ),
  },
  'measuring-equipment': {
    title: "Suivi d'étalonnage des équipements de mesure",
    body: (
      <p>
        Inventaire des équipements de mesure et de contrôle, échéances de <strong>vérification / étalonnage</strong> et
        certificats associés. <em>ISO 9001 §7.1.5.</em>
      </p>
    ),
  },
  'nonconforming-outputs': {
    title: 'Produits / services non conformes',
    body: (
      <p>
        Enregistrer une non-conformité détectée sur un produit ou service et la <strong>décision</strong> prise : rebut,
        retouche, dérogation, tri… <em>ISO 9001 §8.7.</em>
      </p>
    ),
  },
  'order-reviews': {
    title: "Vérifier avant de s'engager",
    body: (
      <p>
        Avant d'accepter une commande ou un devis : s'assurer que les exigences sont <strong>comprises</strong>, qu'on a
        la <strong>capacité de livrer</strong> et que les écarts éventuels sont traités. <em>ISO 9001 §8.2.3.</em>
      </p>
    ),
  },
  'qms-changes': {
    title: 'Modifier le système de façon maîtrisée',
    body: (
      <p>
        Planifier une modification du système de management : objet, <strong>impact</strong>, ressources nécessaires,
        approbation. <em>ISO 9001 §6.3.</em>
      </p>
    ),
  },
  'customer-satisfaction': {
    title: 'Mesurer la perception des clients',
    body: (
      <p>
        Recueillir enquêtes et notes de satisfaction <strong>en dehors des réclamations</strong>, pour suivre la
        tendance. <em>ISO 9001 §9.1.2.</em>
      </p>
    ),
  },
  'communication-plan': {
    title: 'Qui communique quoi, à qui, quand',
    body: (
      <p>
        Les communications <strong>internes et externes</strong> du système de management : sujet, cible, fréquence,
        canal, responsable. <em>ISO 9001 §7.4.</em>
      </p>
    ),
  },
  'my-approvals': {
    title: "Votre file d'attente d'approbations",
    body: (
      <p>
        Les documents et éléments qui attendent <strong>votre</strong> relecture ou votre approbation, regroupés au même
        endroit.
      </p>
    ),
  },
  services: {
    title: "Les services de l'entreprise",
    body: (
      <p>
        Les entités auxquelles on <strong>rattache</strong> CAPA, risques, personnel, formations… Elles servent aussi à
        filtrer ce que voit chaque manager.
      </p>
    ),
  },
  employees: {
    title: 'Le personnel sans compte utilisateur',
    body: (
      <p>
        Opérateurs et autres personnes suivies pour les <strong>formations et compétences</strong>, mais qui ne se
        connectent pas à l'application. Distinct des comptes utilisateurs.
      </p>
    ),
  },

  // ------- Pages de détail (cycle de vie / statuts) -------
  capaDetail: {
    title: "Cycle de vie d'une CAPA",
    body: (
      <p>
        <strong>Ouverte → En cours → En vérification → Clôturée.</strong> La clôture exige une action corrective
        renseignée <strong>et</strong> une vérification d'efficacité positive (§10.2.1 f).
      </p>
    ),
  },
  complaintDetail: {
    title: "Cycle de vie d'une réclamation",
    body: (
      <p>
        <strong>Reçue → En investigation → Résolue → Clôturée.</strong> « Résolue » exige la description de la
        résolution ; « Clôturée » exige d'avoir <strong>demandé l'avis du client</strong>.
      </p>
    ),
  },
  riskDetail: {
    title: 'Coter puis traiter',
    body: (
      <p>
        Renseignez <strong>gravité</strong> et <strong>probabilité</strong> : la criticité en découle. Choisissez ensuite
        le traitement (accepter / réduire / éviter / transférer) et suivez le plan d'action.
      </p>
    ),
  },
  auditDetail: {
    title: "Déroulé d'un audit",
    body: (
      <p>
        <strong>Planifié → En cours → Terminé.</strong> Consignez chaque <strong>constat</strong> et son type ; une
        non-conformité peut être transformée en CAPA depuis la fiche.
      </p>
    ),
  },
  accidentDetail: {
    title: "Suivi d'un accident",
    body: (
      <p>
        <strong>Déclaré → En analyse → Clôturé.</strong> Renseignez la cause, la gravité et les <strong>jours d'arrêt</strong> ;
        une action corrective peut être ouverte depuis la fiche.
      </p>
    ),
  },
  nonconformingOutputDetail: {
    title: 'Statuer sur la non-conformité',
    body: (
      <p>
        Enregistrez la <strong>disposition</strong> décidée (rebut, retouche, dérogation, tri…) et qui l'a décidée. La
        clôture n'est possible qu'une fois la disposition traitée. <em>ISO 9001 §8.7.2.</em>
      </p>
    ),
  },
  orderReviewDetail: {
    title: 'Revue avant engagement',
    body: (
      <p>
        Statuez <strong>Accepté</strong> ou <strong>Rejeté</strong> une fois les exigences vérifiées. La date de décision
        se recale si le statut change.
      </p>
    ),
  },
  qmsChangeDetail: {
    title: "Cycle d'une modification",
    body: (
      <p>
        <strong>Planifiée → Approuvée → Mise en œuvre</strong> (ou Annulée). Chaque passage d'étape est daté ; on ne
        saute pas d'étape. <em>ISO 9001 §6.3.</em>
      </p>
    ),
  },
  pdcaDetail: {
    title: 'Avancer dans le cycle PDCA',
    body: (
      <p>
        <strong>Plan → Do → Check → Act → Clôturé.</strong> On avance une étape à la fois ; chaque étape se documente
        avant de passer à la suivante.
      </p>
    ),
  },
  qualityObjectiveDetail: {
    title: "Suivi d'un objectif",
    body: (
      <p>
        Fixez la <strong>cible</strong> et l'échéance, mettez à jour l'avancement (ou reliez un <strong>KPI</strong> pour
        qu'il se mette à jour seul). <em>ISO 9001 §6.2.</em>
      </p>
    ),
  },
  supplierDetail: {
    title: "Évaluation d'un fournisseur",
    body: (
      <p>
        Notez le fournisseur sur les critères retenus ; la <strong>note globale</strong> et le statut de qualification en
        découlent. Ré-évaluez à la fréquence définie. <em>ISO 9001 §8.4.</em>
      </p>
    ),
  },
  managementReviewDetail: {
    title: 'Contenu de la revue de direction',
    body: (
      <p>
        Passez en revue les <strong>entrées</strong> requises, puis enregistrez les <strong>décisions</strong> et les{' '}
        <strong>actions</strong> avec leurs responsables. <em>ISO 9001 §9.3.</em>
      </p>
    ),
  },
  customerSatisfactionDetail: {
    title: "Une mesure de satisfaction",
    body: (
      <p>
        Enregistrez la <strong>note</strong>, la méthode et la date. Un score bas peut justifier l'ouverture d'une CAPA
        depuis la fiche.
      </p>
    ),
  },
  documentDetail: {
    title: 'Versions et cycle de validation',
    body: (
      <p>
        Chaque révision crée une <strong>nouvelle version</strong> ; l'historique et la piste d'audit sont conservés.
        Selon la configuration, une version peut passer par un circuit d'approbation.
      </p>
    ),
  },
  procedureDetail: {
    title: "Rédaction d'une procédure",
    body: (
      <p>
        <strong>Brouillon → En relecture → Approuvée.</strong> La procédure approuvée peut être publiée comme document du
        SMQ.
      </p>
    ),
  },
  haccpDetail: {
    title: "Plan HACCP d'un produit",
    body: (
      <p>
        Décrivez les <strong>dangers</strong>, les <strong>CCP</strong> et leurs limites critiques, puis les relevés de
        surveillance et les actions correctives en cas de dépassement.
      </p>
    ),
  },
  measuringEquipmentDetail: {
    title: "Suivi d'un équipement",
    body: (
      <p>
        Renseignez la <strong>périodicité</strong> d'étalonnage/vérification : la prochaine échéance et le statut (à jour
        / bientôt / dépassé) en découlent. Joignez les certificats. <em>ISO 9001 §7.1.5.</em>
      </p>
    ),
  },
  qqoqccpDetail: {
    title: "Remplir l'analyse",
    body: (
      <p>
        Répondez à chaque question (<strong>Q</strong>uoi, <strong>Q</strong>ui, <strong>O</strong>ù…). L'analyse
        terminée peut servir de base à une CAPA.
      </p>
    ),
  },
};
