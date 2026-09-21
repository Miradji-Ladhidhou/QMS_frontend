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
      <>
        <p>
          Le catalogue des formations et qui les a suivies. La <strong>matrice</strong> croise le personnel et les
          formations obligatoires par poste pour repérer les <strong>manques</strong> et les{' '}
          <strong>recyclages en retard</strong>.
        </p>
      </>
    ),
    more: (
      <>
        <p>
          Chaque « Enregistrer » crée une <strong>session</strong> (une date, un groupe de personnes formées ensemble) :
          la carte affiche « X sessions · Y réalisations ». Pour <strong>ranger une réalisation existante</strong>{' '}
          (« Sans session »), dépliez la carte, cliquez sur le crayon de la réalisation puis choisissez sa{' '}
          <strong>Session</strong>, ou « + Nouvelle session » pour en créer une à une autre date.
        </p>
        <p>
          <strong>Résumé et QCM :</strong> saisissez un <strong>résumé</strong> dans « Modifier la formation », puis créez le{' '}
          <strong>QCM</strong> (questions, réponses, bonnes réponses, seuil de réussite) avec le bouton « Créer le QCM » de la carte :
          il sert pour toutes les sessions et se modifie quand la procédure évolue. Dans une session, « Envoyer le QCM » envoie à
          chaque personne un lien par email <strong>valable 48 h</strong> (pour un salarié sans compte, saisissez son email à
          l'envoi). Elle saisit son email, lit le résumé, répond au QCM, et la réalisation passe automatiquement à{' '}
          <strong>réussie ou non</strong>. Une formation cochée « qualifiante pour les auditeurs internes » alimente la page{' '}
          <strong>Audits</strong> (qualification de l'auditeur désigné). Les boutons « QCM Word » et « QCM PDF » exportent le détail (questions, réponses, taux de réussite) à
          conserver pour les audits : il reprend l'<strong>objet et le contenu</strong> de la formation, l'
          <strong>historique des essais</strong> de la personne pour la session (échecs et réussites, aussi visibles avec le bouton
          « Essais »), porte la{' '}
          <strong>signature du salarié</strong> (dessinée à l'écran avant de valider) et, si le QCM est réussi, la{' '}
          <strong>signature électronique du formateur</strong> — à enregistrer une fois dans « Modifier la formation ».
        </p>
      </>
    ),
    example:
      "formation « Habilitation électrique B1V », recyclage tous les 3 ans, obligatoire pour les électriciens → la matrice montre que 2 électriciens sur 5 sont en retard.",
  },
  kpis: {
    title: 'Piloter par les indicateurs',
    body: (
      <>
        <p>
          Un KPI est une valeur suivie dans le temps, comparée à un <strong>objectif</strong>. Alimentation au choix :
          saisie manuelle, import Excel, ou <strong>calcul automatique</strong> depuis un autre module.
        </p>
      </>
    ),
    more: (
      <>
        <p>
          Un KPI peut porter plusieurs <strong>séries</strong> (courbes) : menu ⋮ de la carte → « Séries (courbes) ». À
          partir de <strong>deux séries</strong>, choisissez pour chacune : garder l'<strong>unité</strong>, l'
          <strong>objectif cible</strong> et le <strong>sens de l'objectif</strong> du KPI (<strong>global</strong>), ou
          les définir à part (<strong>propre à la série</strong>) si elle ne se mesure pas comme les autres. Chaque série
          est alors comparée à son propre objectif.
        </p>
      </>
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
      <>
        <p>
          Planifier les audits, les conduire, consigner les <strong>constats</strong> (points forts, écarts,
          non-conformités) et les transformer en actions.
        </p>
      </>
    ),
    more: (
      <>
        <p>
          <strong>Auditeurs qualifiés :</strong> dans « Formations », cochez « Formation qualifiante pour les auditeurs internes » sur votre
          formation d'audit interne (avec son QCM). Chaque auditeur est alors signalé <strong>qualifié</strong>, <strong>à recycler</strong> ou{' '}
          <strong>non qualifié</strong> selon sa formation et son QCM — un repère (ISO 9001 §9.2), jamais un blocage. Cliquez sur la
          formation pour la retrouver dans la page Formations.
        </p>
      </>
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
    more: (
      <>
        <p>
          <strong>Seuil d'acceptabilité :</strong> au-dessus du score fixé par l'admin, le risque est <strong>inacceptable</strong> — il est
          signalé, et une CAPA liée est exigée avant de le passer traité, accepté ou clôturé. « Voir ceux à traiter » filtre ceux qui n'ont pas
          encore de CAPA.
        </p>
        <p>
          <strong>À revoir</strong> ouvre les risques dont la revue est dépassée, proche (90 jours) ou jamais planifiée : cochez ceux que vous
          avez revus, ajustez la cotation si besoin, choisissez la prochaine revue, et validez tout d'un coup. Le bandeau{' '}
          <strong>KPI hors objectif</strong> propose de créer un risque pour un indicateur qui n'atteint pas son objectif ; le risque créé
          reste rattaché à ce KPI.
        </p>
      </>
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
    more: (
      <>
        <p>
          <strong>Relevés du jour</strong> est la liste de travail des opérateurs : les points critiques des plans actifs, le plus en retard d'abord,
          avec la saisie du relevé et le verdict immédiat — pensée pour le téléphone. Chaque CCP peut avoir un <strong>rappel</strong> : son
          responsable est prévenu (email et cloche) quand un relevé est en retard, entre 6 h et 20 h. Le bandeau rouge ci-dessus signale les relevés
          en retard et les points critiques en <strong>dérive répétée</strong> (3 relevés hors limites en 7 jours).
        </p>
        <p>
          Un plan devient <strong>actif</strong> quand chaque danger significatif a son CCP ; sa revue annuelle est alors programmée et une version du plan
          est conservée. « Exporter l'analyse complète » produit le rapport d'audit en PDF ; le Word d'un plan s'exporte depuis sa fiche.
        </p>
      </>
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
    more: (
      <>
        <p>
          La <strong>synthèse</strong> en tête de page signale ce qui demande une action : évaluations en retard, fournisseurs jamais évalués (surtout
          les critiques), surveillance qui dure depuis plus de 6 mois, certificats à renouveler. Chaque compteur filtre la liste ; le{' '}
          <strong>classement</strong> range les fournisseurs par note.
        </p>
        <p>
          La prochaine évaluation est <strong>datée automatiquement</strong> après chaque évaluation, selon la criticité (par exemple tous les 6 mois pour
          un fournisseur critique), et le responsable du suivi est prévenu 30 jours avant, 7 jours avant, le jour même puis chaque semaine de retard. L'admin règle
          le rythme, les <strong>seuils de décision</strong> et le <strong>poids des critères</strong> avec « Réglages ».
        </p>
      </>
    ),
    example:
      "« Emballages Martin » évalué chaque année : qualité 18/20, délais 15/20, réactivité 16/20 → maintenu. Sous 12/20 → plan de progrès ou changement de fournisseur.",
  },
  'management-reviews': {
    title: 'Préparer et acter la revue de direction',
    body: (
      <>
        <p>
          Rassembler les <strong>entrées</strong> (indicateurs, résultats d'audit, réclamations, actions en cours…) et
          enregistrer les <strong>décisions et actions</strong> qui en sortent.
        </p>
      </>
    ),
    more: (
      <>
        <p>
          Définissez la <strong>fréquence</strong> des revues (bandeau ci-dessous, admin) : le planning vous rappelle « revue à programmer »
          quand la prochaine est attendue et qu'aucune n'est prévue.
        </p>
      </>
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
    more: (
      <>
        <p>
          <strong>Évolution de la cotation :</strong> chaque changement de cotation, de résiduel ou de statut (et chaque revue) est
          conservé avec sa date, son auteur et son motif ; la courbe montre l'avant / après traitement face au{' '}
          <strong>seuil d'acceptabilité</strong>. Le champ « Motif du changement » de la modification explique pourquoi la cotation bouge.
        </p>
        <p>
          <strong>Marquer revu</strong> enregistre que vous avez réexaminé le risque (même inchangé) et fixe la prochaine revue ; le
          responsable reçoit un rappel 7 jours avant, le jour même, puis chaque semaine de retard. <strong>Éléments liés</strong> rattache
          un audit, un fournisseur, un KPI ou une procédure. <strong>Exporter</strong> produit la fiche du risque en PDF ou Word.
        </p>
      </>
    ),
    example: "gravité 4, probabilité 2 → criticité 8 → traitement « réduire » → action « doubler le stock de sécurité ».",
  },
  auditDetail: {
    title: "Déroulé d'un audit",
    body: (
      <>
        <p>
          <strong>Planifié → En cours → Terminé.</strong> Consignez chaque <strong>constat</strong> avec son type ; un
          constat de type non-conformité peut être transformé en CAPA depuis la fiche.
        </p>
      </>
    ),
    more: (
      <>
        <p>
          <strong>Check-list (QCM) :</strong> préparez les questions de l'audit — saisies une à une, collées en liste, ou{' '}
          <strong>générées par l'IA</strong> d'après le périmètre de l'audit (vous relisez et corrigez avant d'ajouter). Pendant l'audit,
          répondez <strong>Conforme</strong>, <strong>Non conforme</strong> ou <strong>Sans objet</strong> avec une observation : le{' '}
          <strong>taux de conformité</strong> se calcule tout seul. Le bouton <strong>Exporter</strong> produit la fiche PDF (avec la
          qualification de l'auditeur), Excel, Word ou l'enregistre sur le Drive.
        </p>
      </>
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
    more: (
      <>
        <p>
          La <strong>note globale est pondérée</strong> : chaque critère compte selon son poids pour la criticité du fournisseur (réglages de l'admin), et
          ces poids sont conservés avec l'évaluation. L'application <strong>propose la décision</strong> d'après des seuils ; s'en écarter en étant plus
          indulgent exige un commentaire. « À remplacer » suspend automatiquement le fournisseur.
        </p>
        <p>
          La <strong>courbe</strong> montre l'évolution des quatre critères et de la note globale face aux seuils. <strong>Certificats et pièces</strong> :
          ajoutez un certificat ISO, un agrément sanitaire ou une assurance avec sa date d'expiration (fichier facultatif) — vous êtes prévenu avant
          l'échéance. <strong>Exporter</strong> produit la fiche du fournisseur en PDF ou Word, pièce d'audit.
        </p>
      </>
    ),
    example: "qualité 16, délais 12, réactivité 14 → note globale 14/20 → statut « qualifié sous surveillance ».",
  },
  managementReviewDetail: {
    title: 'Contenu de la revue de direction',
    body: (
      <>
        <p>
          Passez en revue les <strong>entrées</strong> requises, puis enregistrez les <strong>décisions</strong> et les{' '}
          <strong>actions</strong> avec leurs responsables et leurs échéances.
        </p>
      </>
    ),
    more: (
      <>
        <p>
          Chaque action a un <strong>responsable</strong>, une <strong>échéance</strong> (elle apparaît alors dans le planning) et un{' '}
          <strong>statut</strong> ; une action dont la CAPA liée est clôturée est comptée réalisée. La revue reprend seule les{' '}
          <strong>actions de la revue précédente</strong> et leur état : « Reporter dans le suivi écrit » remplit la rubrique exigée à la
          clôture. Le bouton <strong>Générer un brouillon</strong> propose conclusions, opportunités et décisions d'après les chiffres de la
          période (vous relisez avant d'appliquer). <strong>Exporter</strong> produit le compte rendu en PDF, Word, Excel ou sur le Drive.
        </p>
        <p>
          <strong>Convoquer</strong> envoie l'ordre du jour et une invitation calendrier ; une fois la revue clôturée, l'admin{' '}
          <strong>valide et signe</strong> à l'écran : la revue est alors verrouillée (seul le suivi des actions reste modifiable) et{' '}
          <strong>Envoyer le compte rendu</strong> transmet le PDF signé. « Rouvrir » efface la validation. Les entrées couvrent aussi la
          satisfaction client, les fournisseurs, les sorties non conformes, les accidents, les compétences et la politique qualité.
          Un KPI à plusieurs courbes est détaillé <strong>courbe par courbe</strong> (valeur, unité, objectif et sens propres) : il compte comme « hors objectif » dès qu'une courbe rate son objectif, jamais sur une moyenne des courbes.
        </p>
      </>
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
  moduleKpis: {
    title: 'Les indicateurs qui comptent, calculés pour vous',
    body: (
      <p>
        Pour chaque domaine du système qualité, quelques <strong>indicateurs essentiels</strong> calculés automatiquement depuis vos données :
        valeur, état face à l'<strong>objectif</strong> (que vous pouvez modifier) et <strong>comparaison</strong> avec la période précédente,
        l'an dernier ou la moyenne récente.
      </p>
    ),
    more: (
      <>
        <p>
          <strong>Suivre l'essentiel</strong> met en place d'un coup la trentaine d'indicateurs choisis ; « Suivre » ajoute un indicateur seul,
          y compris parmi les <strong>autres indicateurs disponibles</strong> de chaque domaine. Un indicateur « à ce jour » (par exemple
          les CAPA en retard) mesure l'état du moment : il construit son historique mois après mois, la comparaison apparaît donc au bout de
          deux mois. Les indicateurs d'activité (CAPA clôturées, réclamations reçues) ont leur historique tout de suite.
        </p>
        <p>
          <strong>Modifier l'objectif</strong> : choisissez le sens (« ne pas dépasser » ou « atteindre au moins ») et la valeur ; l'application
          suggère un objectif réaliste d'après vos 6 dernières périodes, et permet de revenir à l'objectif par défaut. Coche jusqu'à 4
          indicateurs puis « Comparer » pour les voir côte à côte, chacun avec son objectif. Ils sont aussi rangés dans le dossier
          « Indicateurs des modules » de la page KPI.
        </p>
      </>
    ),
    example: "« CAPA clôturées dans les délais » : objectif ≥ 90 %, résultat 82 % ce mois-ci contre 76 % le mois dernier → à surveiller, en progrès.",
  },
  haccpToday: {
    title: 'Saisir les relevés du jour',
    body: (
      <p>
        Ouvrez un point critique, saisissez la <strong>valeur relevée</strong> : le verdict « dans / hors limites » s'affiche aussitôt et le serveur le
        confirme. Hors limites, notez l'<strong>action corrective immédiate</strong> (obligatoire).
      </p>
    ),
    more: (
      <>
        <p>
          Les points critiques sont classés du plus en retard au moins urgent ; « Voir mes CCP » ne garde que ceux dont vous êtes le responsable de
          surveillance. Un CCP sans limites chiffrées se relève avec « Conforme » / « Non conforme ». Après 3 relevés hors limites en 7 jours sur un même
          CCP, le responsable et l'auteur du plan sont prévenus : c'est la cause qu'il faut traiter (CAPA ou risque), pas seulement l'incident.
        </p>
        <p>Pas de réseau en atelier ? Imprimez la <strong>fiche de relevés vierge</strong> depuis la page du plan (onglet Surveillance) et reportez les valeurs ensuite.</p>
      </>
    ),
    example: "chambre froide n°2, limite ≤ 4 °C : vous saisissez 5,2 → « Hors limites » → action corrective : « lot mis en quarantaine, groupe froid signalé ».",
  },
  haccpDetail: {
    title: "Plan HACCP d'un produit",
    body: (
      <p>
        Décrivez les <strong>dangers</strong>, les <strong>CCP</strong> et leurs limites critiques, puis les relevés de
        surveillance et les actions correctives en cas de dépassement.
      </p>
    ),
    more: (
      <>
        <p>
          Renseignez les <strong>limites chiffrées</strong> du CCP (min, max, unité) : chaque relevé reçoit alors un verdict automatique, la courbe du
          tableau de bord se trace et le serveur ne se fie jamais au verdict envoyé. L'<strong>intervalle de rappel</strong> prévient le responsable quand un
          relevé est en retard. Trois relevés hors limites en 7 jours signalent une <strong>dérive répétée</strong> : ouvrez une CAPA ou un risque.
        </p>
        <p>
          <strong>Revue du plan :</strong> la revue annuelle est programmée à l'activation (rappel 7 jours avant, le jour même, puis chaque semaine de
          retard). « Marquer revu » conserve une <strong>version</strong> du plan ; « Versions » montre ce qui a changé, quand et par qui.{' '}
          <strong>Éléments liés</strong> rattache fournisseurs, procédures et formations requises — l'application vérifie que les responsables de surveillance
          sont formés. <strong>Exporter</strong> : PDF ou Word du plan ; fiche PDF de chaque point critique et fiche de relevés vierge à imprimer (onglet Surveillance).
        </p>
      </>
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
