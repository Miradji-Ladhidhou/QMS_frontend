// Contenu des encadrés d'aide en tête de page (composant components/PageGuide.jsx).
// Clé = `id` passé à <PageGuide />. Pages de module : la clé de menu (Layout.jsx).
// Pages de détail : `<module>Detail`. Chaque entrée : { title, body, example }.
// `body` = à quoi sert la page (2-3 phrases, gras sur les mots-clés).
// `example` = un cas concret, court, du métier.

export const PAGE_GUIDES = {
  // ------- Pages de module -------
  planning: {
    title: 'Toutes vos échéances au même endroit',
    body: (
      <p>
        Agenda unique qui rassemble <strong>automatiquement</strong> les échéances de toute l'application (CAPA, revues de
        documents, formations, audits, risques…). Vous pouvez aussi y ajouter des <strong>tâches</strong> libres qui
        n'existent nulle part ailleurs.
      </p>
    ),
    example:
      "vous voyez que la procédure « Contrôle réception » est à réviser le 15, que Marie doit renouveler son habilitation CACES avant le 30, et vous ajoutez la tâche « Préparer l'audit blanc ».",
  },
  documents: {
    title: 'La bibliothèque documentaire',
    body: (
      <p>
        Toutes vos procédures, formulaires et enregistrements, avec <strong>gestion des versions</strong> et piste
        d'audit. Chaque document est rangé dans un <strong>dossier</strong> laissé ouvert à tous ou restreint à certaines
        personnes.
      </p>
    ),
    example:
      "« Manuel qualité v3 », formulaire « Fiche de non-conformité », procédure « Gestion des achats » — rangés dans les dossiers Qualité, Production, RH.",
  },
  capas: {
    title: "Traiter un problème pour qu'il ne revienne pas",
    body: (
      <p>
        Une CAPA (action corrective / préventive) sert à remonter à la <strong>cause racine</strong> d'un problème,
        décider une <strong>action</strong>, puis <strong>vérifier qu'elle a marché</strong> avant de clôturer.
      </p>
    ),
    example:
      "un client reçoit un colis abîmé → cause : palettes mal filmées → action : nouveau standard de filmage + contrôle avant expédition → vérification : aucune récidive sur 2 mois, on clôture.",
  },
  complaints: {
    title: 'Suivre les réclamations clients',
    body: (
      <p>
        De la réception à la résolution, en gardant la trace de la <strong>satisfaction du client</strong> une fois la
        réclamation traitée. Une réclamation grave peut déclencher une CAPA depuis la fiche.
      </p>
    ),
    example:
      "« Le lot 2024-08 avait un défaut d'étiquetage » → investigation → geste commercial + correction du poste étiquetage → on demande au client s'il est satisfait avant de clôturer.",
  },
  trainings: {
    title: 'Formations et compétences du personnel',
    body: (
      <p>
        Le catalogue des formations et qui les a suivies. La <strong>matrice</strong> croise le personnel et les
        formations obligatoires par poste pour repérer les <strong>manques</strong> et les{' '}
        <strong>recyclages en retard</strong>.
      </p>
    ),
    example:
      "formation « Habilitation électrique B1V », recyclage tous les 3 ans, obligatoire pour les électriciens → la matrice montre que 2 électriciens sur 5 sont en retard.",
  },
  kpis: {
    title: 'Piloter par les indicateurs',
    body: (
      <p>
        Un KPI est une valeur suivie dans le temps, comparée à un <strong>objectif</strong>. Alimentation au choix :
        saisie manuelle, import Excel, ou <strong>calcul automatique</strong> depuis un autre module.
      </p>
    ),
    example:
      "« Taux de livraison à l'heure », objectif ≥ 95 %, relevé chaque mois → la courbe affiche 92 % en mars, sous l'objectif, on creuse.",
  },
  qqoqccp: {
    title: "Cadrer un problème avant d'agir",
    body: (
      <p>
        Analyse d'une situation en répondant à sept questions — <strong>Q</strong>uoi, <strong>Q</strong>ui,{' '}
        <strong>O</strong>ù, <strong>Q</strong>uand, <strong>C</strong>omment, <strong>C</strong>ombien,{' '}
        <strong>P</strong>ourquoi. Souvent utilisée en amont d'une CAPA pour ne rien oublier.
      </p>
    ),
    example:
      "problème « retards de livraison » → Quoi : commandes de plus de 50 lignes · Où : préparation · Quand : fin de mois · Pourquoi : pic de charge non anticipé.",
  },
  audits: {
    title: 'Programmer et mener les audits internes',
    body: (
      <p>
        Planifier les audits, les conduire, consigner les <strong>constats</strong> (points forts, écarts,
        non-conformités) et les transformer en actions.
      </p>
    ),
    example:
      "audit du processus Achats le 12 mars → point fort « fournisseurs bien suivis », écart « 2 commandes sans bon signé » → une CAPA est ouverte sur l'écart.",
  },
  risks: {
    title: 'Le registre des risques et opportunités',
    body: (
      <p>
        Identifier un risque, le <strong>coter</strong> (gravité × probabilité), décider un traitement — accepter,
        réduire, éviter ou transférer — puis suivre le plan d'action.
      </p>
    ),
    example:
      "risque « départ du seul soudeur qualifié » : gravité 4 × probabilité 3 = criticité 12 → action : former un second soudeur d'ici juin.",
  },
  haccp: {
    title: 'Maîtrise sanitaire des aliments',
    body: (
      <p>
        Démarche HACCP : recenser les <strong>dangers</strong>, définir les <strong>points critiques (CCP)</strong> et
        leurs limites, organiser la surveillance et les actions correctives. Pour l'agroalimentaire.
      </p>
    ),
    example:
      "danger Listeria sur produits tranchés → CCP : chambre froide < 4 °C → relevé 2 fois par jour → au-dessus de 4 °C, le lot est mis en quarantaine.",
  },
  suppliers: {
    title: 'Évaluer les fournisseurs',
    body: (
      <p>
        Notation périodique des fournisseurs critiques (qualité, délais, réactivité) et trace des décisions de{' '}
        <strong>(re)qualification</strong>.
      </p>
    ),
    example:
      "« Emballages Martin » évalué chaque année : qualité 18/20, délais 15/20, réactivité 16/20 → maintenu. Sous 12/20 → plan de progrès ou changement de fournisseur.",
  },
  'management-reviews': {
    title: 'Préparer et acter la revue de direction',
    body: (
      <p>
        Rassembler les <strong>entrées</strong> (indicateurs, résultats d'audit, réclamations, actions en cours…) et
        enregistrer les <strong>décisions et actions</strong> qui en sortent.
      </p>
    ),
    example:
      "revue annuelle : on présente les KPI, les audits et les réclamations de l'année → décision « investir dans une 2ᵉ ligne de conditionnement », action confiée au responsable production.",
  },
  procedures: {
    title: 'Rédiger et faire vivre les procédures',
    body: (
      <p>
        Écriture assistée d'une procédure et circuit de <strong>relecture / approbation</strong>. Complémentaire de
        Documents, orienté rédaction.
      </p>
    ),
    example:
      "rédiger « PR-07 Gestion des non-conformités » : brouillon → relecture par le responsable qualité → approbation → publication comme document officiel.",
  },
  accidents: {
    title: 'Accidents et presqu’accidents du travail',
    body: (
      <p>
        Déclarer un accident (ou un presqu'accident), analyser sa cause et suivre les <strong>jours d'arrêt</strong>.
        Volet santé-sécurité au travail.
      </p>
    ),
    example:
      "« coupure à la main sur la trancheuse, 3 jours d'arrêt » → cause : protection retirée → action : cadenassage de la protection + rappel de la consigne.",
  },
  pdca: {
    title: 'Piloter une amélioration en 4 étapes',
    body: (
      <p>
        Conduire un projet d'amélioration selon le cycle <strong>Plan – Do – Check – Act</strong>, étape après étape
        jusqu'à la clôture.
      </p>
    ),
    example:
      "projet « réduire les rebuts de 30 % » : Plan (analyse + objectif) → Do (nouveau réglage) → Check (mesure sur 1 mois) → Act (on standardise ou on ajuste).",
  },
  'nonconforming-outputs': {
    title: 'Produits / services non conformes',
    body: (
      <p>
        Enregistrer une non-conformité détectée sur un produit ou service et la <strong>décision</strong> prise : rebut,
        retouche, dérogation, tri…
      </p>
    ),
    example:
      "50 pièces usinées hors tolérance détectées au contrôle final → décision : tri à 100 % → 12 rebutées, 38 reprises.",
  },
  'customer-satisfaction': {
    title: 'Mesurer la perception des clients',
    body: (
      <p>
        Recueillir enquêtes et notes de satisfaction <strong>en dehors des réclamations</strong>, pour suivre la
        tendance dans le temps.
      </p>
    ),
    example:
      "enquête annuelle envoyée à 40 clients, note moyenne 4,2/5 → une réponse à 2/5 déclenche l'ouverture d'une CAPA depuis la fiche.",
  },
  'communication-plan': {
    title: 'Qui communique quoi, à qui, quand',
    body: (
      <p>
        La liste des communications <strong>internes et externes</strong> du système de management : sujet, cible,
        fréquence, canal, responsable.
      </p>
    ),
    example:
      "« résultats de la revue de direction » → à tout le personnel → 1 fois par an → affichage + réunion d'équipe → responsable : la direction.",
  },
  'my-approvals': {
    title: "Votre file d'attente d'approbations",
    body: (
      <p>
        Les documents et éléments qui attendent <strong>votre</strong> relecture ou votre approbation, regroupés au même
        endroit.
      </p>
    ),
    example: "3 éléments à valider : la procédure Achats v2, le manuel qualité v4, une fiche de poste.",
  },
  services: {
    title: "Les services de l'entreprise",
    body: (
      <p>
        Les entités auxquelles on <strong>rattache</strong> CAPA, risques, personnel, formations… Elles servent aussi à
        filtrer ce que chaque manager voit.
      </p>
    ),
    example:
      "« Production », « Logistique », « Commercial » → une CAPA rattachée à la Logistique n'apparaît que pour le responsable Logistique et les admins.",
  },
  employees: {
    title: 'Le personnel sans compte utilisateur',
    body: (
      <p>
        Les personnes suivies pour les <strong>formations et compétences</strong> mais qui ne se connectent pas à
        l'application. Distinct des comptes utilisateurs qui, eux, ont un identifiant.
      </p>
    ),
    example:
      "Jean Dupont, cariste, sans e-mail : suivi ici pour sa formation CACES et l'accueil sécurité, mais il n'ouvre jamais l'appli.",
  },

  // ------- Pages de détail (cycle de vie / statuts) -------
  capaDetail: {
    title: "Cycle de vie d'une CAPA",
    body: (
      <p>
        <strong>Ouverte → En cours → En vérification → Clôturée.</strong> La clôture n'est possible qu'avec une action
        corrective renseignée <strong>et</strong> une vérification d'efficacité positive.
      </p>
    ),
    example:
      "vous saisissez la cause et l'action, vous passez « En vérification », puis 2 mois plus tard vous confirmez « efficace » et vous clôturez.",
  },
  complaintDetail: {
    title: "Cycle de vie d'une réclamation",
    body: (
      <p>
        <strong>Reçue → En investigation → Résolue → Clôturée.</strong> « Résolue » exige la description de la résolution ;
        « Clôturée » exige d'avoir <strong>demandé l'avis du client</strong>.
      </p>
    ),
    example:
      "après avoir décrit la solution apportée, vous rappelez le client ; s'il se dit satisfait (ou non), vous pouvez clôturer.",
  },
  riskDetail: {
    title: 'Coter puis traiter',
    body: (
      <p>
        Renseignez <strong>gravité</strong> et <strong>probabilité</strong> : la criticité se calcule toute seule.
        Choisissez ensuite le traitement (accepter / réduire / éviter / transférer) et suivez le plan.
      </p>
    ),
    example: "gravité 4, probabilité 2 → criticité 8 → traitement « réduire » → action « doubler le stock de sécurité ».",
  },
  auditDetail: {
    title: "Déroulé d'un audit",
    body: (
      <p>
        <strong>Planifié → En cours → Terminé.</strong> Consignez chaque <strong>constat</strong> avec son type ; un
        constat de type non-conformité peut être transformé en CAPA depuis la fiche.
      </p>
    ),
    example: "constat « procédure d'achat non appliquée » classé « non-conformité mineure » → bouton « Créer une CAPA ».",
  },
  accidentDetail: {
    title: "Suivi d'un accident",
    body: (
      <p>
        <strong>Déclaré → En analyse → Clôturé.</strong> Renseignez la cause, la gravité et les{' '}
        <strong>jours d'arrêt</strong> ; une action corrective peut être ouverte depuis la fiche.
      </p>
    ),
    example: "chute de plain-pied, 1 jour d'arrêt → cause : sol glissant non signalé → action : marquage + procédure de nettoyage.",
  },
  nonconformingOutputDetail: {
    title: 'Statuer sur la non-conformité',
    body: (
      <p>
        Enregistrez la <strong>disposition</strong> décidée (rebut, retouche, dérogation, tri…) et qui l'a décidée. La
        clôture n'est possible qu'une fois la disposition réalisée.
      </p>
    ),
    example: "lot de 200 pièces avec un défaut d'aspect → disposition « dérogation acceptée par le client » → clôture.",
  },
  pdcaDetail: {
    title: 'Avancer dans le cycle PDCA',
    body: (
      <p>
        <strong>Plan → Do → Check → Act → Clôturé.</strong> On avance une étape à la fois ; chaque étape se documente
        avant de passer à la suivante.
      </p>
    ),
    example: "étape Check : « rebuts passés de 8 % à 5 % sur avril » → étape Act : on inscrit le nouveau réglage dans la procédure.",
  },
  supplierDetail: {
    title: "Évaluation d'un fournisseur",
    body: (
      <p>
        Notez le fournisseur sur les critères retenus : la <strong>note globale</strong> et le statut de qualification en
        découlent. Ré-évaluez à la fréquence définie.
      </p>
    ),
    example: "qualité 16, délais 12, réactivité 14 → note globale 14/20 → statut « qualifié sous surveillance ».",
  },
  managementReviewDetail: {
    title: 'Contenu de la revue de direction',
    body: (
      <p>
        Passez en revue les <strong>entrées</strong> requises, puis enregistrez les <strong>décisions</strong> et les{' '}
        <strong>actions</strong> avec leurs responsables et leurs échéances.
      </p>
    ),
    example: "entrée « 12 réclamations cette année, +30 % » → décision « renforcer le contrôle réception » → action pour le responsable qualité, échéance fin de trimestre.",
  },
  customerSatisfactionDetail: {
    title: 'Une mesure de satisfaction',
    body: (
      <p>
        Enregistrez la <strong>note</strong>, la méthode (enquête, appel…) et la date. Un score bas peut justifier
        l'ouverture d'une CAPA depuis la fiche.
      </p>
    ),
    example: "note 2/5 sur l'enquête de juin, motif « délais trop longs » → bouton « Créer une CAPA ».",
  },
  documentDetail: {
    title: 'Versions et validation',
    body: (
      <p>
        Chaque révision crée une <strong>nouvelle version</strong> ; l'historique et la piste d'audit sont conservés.
        Selon la configuration, une version peut passer par un circuit d'approbation.
      </p>
    ),
    example: "vous remplacez le fichier et notez « mise à jour du logigramme » → v4 créée, la v3 reste consultable dans l'historique.",
  },
  procedureDetail: {
    title: "Rédaction d'une procédure",
    body: (
      <p>
        <strong>Brouillon → En relecture → Approuvée.</strong> Une fois approuvée, la procédure peut être publiée comme
        document du système qualité.
      </p>
    ),
    example: "vous rédigez les sections, vous envoyez en relecture au responsable qualité, il approuve, vous publiez.",
  },
  haccpDetail: {
    title: "Plan HACCP d'un produit",
    body: (
      <p>
        Décrivez les <strong>dangers</strong>, les <strong>CCP</strong> et leurs limites critiques, puis les relevés de
        surveillance et les actions correctives en cas de dépassement.
      </p>
    ),
    example: "CCP « cuisson à cœur ≥ 72 °C » → relevé à chaque fournée → si 68 °C : recuisson et blocage du lot.",
  },
  qqoqccpDetail: {
    title: "Remplir l'analyse",
    body: (
      <p>
        Répondez à chaque question (<strong>Q</strong>uoi, <strong>Q</strong>ui, <strong>O</strong>ù…). Une fois
        complète, l'analyse peut servir de base à une CAPA.
      </p>
    ),
    example: "Quoi : fuite d'huile · Où : presse n°3 · Quand : au démarrage à froid · Pourquoi : joint durci → CAPA « remplacer le joint et réviser le plan de maintenance ».",
  },
};
