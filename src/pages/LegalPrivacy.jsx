import LegalPageLayout from '../components/LegalPageLayout.jsx';
import LegalSection from '../components/LegalSection.jsx';

export default function LegalPrivacy() {
  return (
    <LegalPageLayout title="Confidentialité — pilote en préproduction" updatedAt="10 octobre 2026">
      <LegalSection title="1. Projet personnel en phase pilote">
        <p>
          QMS SaaS est actuellement un projet personnel en préproduction. Cette page décrit les traitements
          techniques connus à cette étape ; elle n’est pas une politique finalisée pour une ouverture
          commerciale. Le contact public est saas.qms@gmail.com et le projet est exploité depuis La
          Possession (97419), La Réunion.
        </p>
        <p>
          Les informations de contact que vous envoyez pour demander un accès ou utiliser votre compte peuvent
          être réelles. Limitez le contenu du pilote au nécessaire et n’y saisissez pas de données sensibles,
          de santé, confidentielles ou concernant des tiers sans autorisation. Les bases légales, durées de
          conservation et engagements des prestataires doivent être précisés et validés avant toute offre
          commerciale.
        </p>
      </LegalSection>

      <LegalSection title="2. Responsable et contact">
        <p>
          Le pilote est actuellement exploité à titre personnel depuis La Possession (97419), La Réunion,
          France. Aucun statut de société n’est déclaré à ce stade. Conformément au souhait de l’éditeur, son
          nom n’est pas affiché publiquement sur cette page. Le contact public pour les questions
          relatives aux données est{' '}
          <a href="mailto:saas.qms@gmail.com" className="text-primary hover:underline">saas.qms@gmail.com</a>.
        </p>
        <p>
          L’identité complète du responsable du traitement n’est pas publiée sur le site. Ce point, ainsi que
          les informations obligatoires applicables, devra être examiné avant une commercialisation ou un
          traitement de données à grande échelle.
        </p>
      </LegalSection>

      <LegalSection title="3. Données susceptibles d’être traitées">
        <p>
          Le logiciel comporte des comptes utilisateurs et des espaces d’entreprise. Selon les fonctions
          utilisées, il peut traiter des identifiants de connexion, des rôles, des journaux techniques et du
          contenu saisi dans les modules qualité : documents, actions correctives, réclamations, audits,
          évaluations fournisseurs, formations, risques, indicateurs, procédures, photos et résultats
          d’assistance IA. Même pendant les essais, les coordonnées de compte réellement utilisées restent des
          données personnelles.
        </p>
        <p>Évitez de saisir des informations personnelles concernant d’autres personnes ou des données sensibles.</p>
      </LegalSection>

      <LegalSection title="4. Utilisation et prestataires techniques">
        <p>
          Les prestataires configurés dans le projet comprennent Vercel pour le frontend, Render pour l’API,
          Supabase pour l’authentification, la base PostgreSQL et certains fichiers, Google Drive pour les
          preuves photographiques lorsqu’un espace le connecte, Groq pour les fonctions IA et l’API Gmail
          pour l’envoi des emails transactionnels. Le code sélectionne Gmail API en priorité lorsque les
          identifiants correspondants sont configurés.
        </p>
        <p>
          Les régions de Render et Supabase sont déclarées comme étant en Europe. La région de Vercel et les
          conditions de localisation, de conservation et de transfert applicables aux services Google et Groq
          n’ont pas été vérifiées pour le déploiement. Les textes contractuels et mécanismes de transfert
          propres à chaque prestataire restent à confirmer avant tout traitement réel.
        </p>
        <p>
          Une requête IA transmet au fournisseur Groq les éléments nécessaires à la génération demandée.
          Un fichier photo est envoyé au Drive de l’entreprise si sa connexion Drive est configurée. Les
          modules documentaires peuvent utiliser le stockage Supabase ou Google Drive selon la configuration
          de l’espace.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies et stockage dans le navigateur">
        <p>
          Le frontend ne déclare pas de traceur publicitaire ou analytique. Supabase Auth utilise le stockage
          local du navigateur pour maintenir la session de connexion. Le site mémorise aussi localement le
          choix de fermeture de l’avis cookies et la progression de la checklist de prise en main. Ces valeurs
          restent dans le navigateur concerné. Les écrans d’autorisation Google peuvent également faire
          intervenir les technologies propres à Google.
        </p>
      </LegalSection>

      <LegalSection title="6. Conservation, accès et suppression">
        <p>
          Les durées de conservation et les délais de suppression des sauvegardes n’ont pas encore été définis
          et vérifiés pour une offre commerciale. Les contenus du pilote peuvent être modifiés ou supprimés
          pendant son évolution ; conservez toute copie nécessaire de votre côté. Pour demander le retrait
          d’un compte ou d’une information, contactez{' '}
          <a href="mailto:saas.qms@gmail.com" className="text-primary hover:underline">saas.qms@gmail.com</a>.
        </p>
        <p>
          Pour un futur service, les modalités d’exercice des droits d’accès, de rectification, d’effacement,
          de limitation, d’opposition et, lorsque applicable, de portabilité devront être complétées et
          testées avant le lancement.
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité et séparation des espaces">
        <p>
          L’application utilise l’authentification Supabase, des rôles d’accès et une séparation des espaces
          clients côté applicatif et base de données. Ces mesures ne constituent pas une garantie absolue.
        </p>
      </LegalSection>

      <LegalSection title="8. Réclamations et mise à jour">
        <p>
          Une personne concernée peut écrire à{' '}
          <a href="mailto:saas.qms@gmail.com" className="text-primary hover:underline">saas.qms@gmail.com</a>.
          L’autorité de contrôle compétente dépendra notamment du responsable du traitement et de la situation
          concernée. Cette page sera remplacée par une information complète et validée avant l’ouverture du
          service à des données réelles ou à une clientèle commerciale.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
