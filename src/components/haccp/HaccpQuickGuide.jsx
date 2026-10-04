import { BookOpen, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HaccpQuickGuide() {
  return (
    <details className="mt-3 rounded-xl border border-primary-100 bg-white p-4">
      <summary className="flex min-h-[40px] cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
        <BookOpen size={18} className="shrink-0" />
        <span className="flex-1">Mini-procédure HACCP : préparer et mener votre analyse</span>
        <ChevronDown size={16} className="shrink-0" />
      </summary>
      <div className="mt-3 space-y-4 text-sm text-slate-700">
        <p>Repères issus des Principes généraux d’hygiène alimentaire du Codex Alimentarius (CXC 1-1969).
          Avant l’analyse, mettez en place et vérifiez les bonnes pratiques d’hygiène : nettoyage, personnel, nuisibles,
          maintenance, fournisseurs et maîtrise des conditions de conservation. Adaptez la démarche à votre activité et aux exigences applicables.</p>
        <h3 className="font-semibold text-slate-900">1. Préparer l’étude : les 5 étapes préliminaires</h3>
        <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-primary">
          <li><strong>Constituer l’équipe HACCP et définir le périmètre.</strong> Réunissez les compétences produit, procédé et sécurité alimentaire ; précisez les activités couvertes.</li>
          <li><strong>Décrire le produit.</strong> Composition, allergènes, conditionnement, conservation, durée de vie et distribution.</li>
          <li><strong>Déterminer l’utilisation prévue.</strong> Préparation, consommation et consommateurs concernés, notamment les publics sensibles.</li>
          <li><strong>Construire le diagramme du procédé.</strong> Décrivez toutes les étapes, les entrées, les sorties et les flux pertinents.</li>
          <li><strong>Confirmer le diagramme sur site.</strong> Comparez-le au fonctionnement réel et corrigez-le avec l’équipe.</li>
        </ol>
        <p className="text-xs text-slate-500">Dans l’outil : « Nouveau plan », puis ouvrez sa fiche.
          Renseignez l’équipe et le périmètre, utilisez « Compléter le dossier » et ajoutez les étapes dans « Dangers ».</p>
        <h3 className="font-semibold text-slate-900">2. Conduire l’analyse : les 7 principes HACCP</h3>
        <ol className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-primary">
          <li>
            <strong>Analyser les dangers et identifier les mesures de maîtrise.</strong> À chaque étape, identifiez les dangers
            biologiques, chimiques (dont allergènes) et physiques. Évaluez leur gravité et leur probabilité selon le produit,
            l’usage et les consommateurs. Déterminez les dangers significatifs et documentez les mesures nécessaires.
            Ne vous limitez pas à une note : justifiez les choix et tenez compte des étapes ultérieures.
          </li>
          <li>
            <strong>Déterminer les points critiques (CCP).</strong> Justifiez où une maîtrise est essentielle pour prévenir,
            éliminer ou réduire un danger significatif à un niveau acceptable. Un danger significatif ne signifie pas automatiquement un CCP.
            Si une maîtrise nécessaire n’existe pas, modifiez le procédé et réévaluez-le avant mise en service.
            Dans « Dangers », documentez la décision : prérequis, CCP ou procédé à modifier.
          </li>
          <li>
            <strong>Établir des limites critiques validées.</strong> Pour chaque CCP, définissez des critères mesurables ou observables,
            avec leurs sources et les preuves de leur pertinence. Renseignez les bornes et l’unité quand la limite est numérique.
            Ne recopiez pas une température générique ou une proposition IA sans vérifier son applicabilité.
          </li>
          <li>
            <strong>Organiser la surveillance des CCP.</strong> Définissez quoi mesurer, comment, à quelle fréquence et par qui,
            pour détecter une perte de maîtrise à temps. Précisez les enregistrements attendus.
            Un rappel informatique ne remplace pas une fréquence de surveillance adaptée au procédé.
          </li>
          <li>
            <strong>Prévoir les actions correctives.</strong> Définissez le retour à la maîtrise, l’identification et l’isolement des
            produits concernés, leur évaluation et la décision sur leur devenir par une personne compétente.
            Documentez l’écart, les actions et le suivi de leur efficacité ; utilisez une CAPA pour suivre les causes et prévenir la récurrence.
          </li>
          <li>
            <strong>Valider le plan et organiser la vérification.</strong> Avant mise en œuvre, rassemblez les preuves que les
            mesures et limites peuvent maîtriser les dangers. Définissez ensuite la vérification : revue des relevés, étalonnage,
            audits ou essais pertinents, avec fréquence et responsables. Réexaminez le plan après un changement et périodiquement.
          </li>
          <li>
            <strong>Conserver la documentation et les enregistrements.</strong> Gardez l’analyse, les décisions, sources,
            preuves, approbations, relevés, écarts et vérifications, avec une durée de conservation adaptée.
            Les versions et exports de l’outil contribuent à la traçabilité ; ils ne remplacent pas les preuves terrain.
          </li>
        </ol>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">3. Mettre en service dans l’outil</p>
          <p className="mt-1">Enregistrez les CCP en brouillon. Dans « Préparer les CCP », rejoignez les champs manquants
            avec « Compléter ». Après examen des preuves et de la cohérence, un administrateur ou manager autorisé confirme
            et approuve chaque CCP. Activez ensuite le plan lorsque le dossier et les décisions sont complets.
            L’espace « Relevés » sépare le suivi quotidien de la préparation. Les CCP opérationnels des plans actifs apparaissent dans « Relevés du jour ».</p>
          <p className="mt-1">L’IA ne constitue pas une preuve. Le compteur de champs renseignés et le statut « Actif » ne certifient
            pas la conformité. Modifier un CCP opérationnel impose une nouvelle approbation.</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed">
          <p className="font-semibold text-slate-800">Trois mots à distinguer</p>
          <p className="mt-1"><strong>Validation :</strong> démontrer, avec des preuves, que la mesure peut maîtriser le danger.</p>
          <p><strong>Surveillance :</strong> mesurer ou observer le CCP au quotidien.</p>
          <p><strong>Vérification :</strong> contrôler que les mesures et les relevés sont bien appliqués et efficaces.</p>
        </div>
        <p className="text-xs text-slate-500">
          Aucun CCP identifié ? Documentez les mesures de maîtrise et la conclusion de l’équipe dans le dossier, sans créer de CCP artificiel.
          Ce mode d’emploi explique l’outil ; il ne remplace pas la formation HACCP, les exigences applicables ni la validation par une équipe compétente.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link to="/haccp/today" className="inline-flex min-h-[40px] items-center rounded-md border border-slate-300 px-3 font-medium text-slate-700 hover:bg-slate-50">
            Ouvrir les relevés du jour
          </Link>
          <a href="https://www.fao.org/fao-who-codexalimentarius/codex-texts/codes-of-practice/en/"
            target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Référence : Codex Alimentarius, CXC 1-1969
          </a>
        </div>
      </div>
    </details>
  );
}
