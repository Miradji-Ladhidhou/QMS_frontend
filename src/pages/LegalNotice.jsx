import LegalPageLayout from '../components/LegalPageLayout.jsx';
import LegalSection from '../components/LegalSection.jsx';

export default function LegalNotice() {
  return (
    <LegalPageLayout title="Mentions légales — préproduction" updatedAt="10 octobre 2026">
      <LegalSection title="1. Édition du site">
        <p>
          QMS SaaS est un projet personnel non commercial, exploité depuis La Possession (97419), La
          Réunion, France. Il n’existe pas actuellement de société éditrice déclarée
          pour ce projet. L’identité complète de la personne éditrice et les informations de publication
          correspondantes ne sont pas affichées publiquement à ce stade.
        </p>
        <p>
          Le nom de la personne qui a créé le projet n’est pas publié à sa demande. La conformité des mentions
          légales et les informations obligatoires devront être vérifiées avant toute activité commerciale.
        </p>
      </LegalSection>

      <LegalSection title="2. Contact">
        <p>
          Pour toute question relative au site ou au pilote, écrivez à{' '}
          <a className="text-primary hover:underline" href="mailto:saas.qms@gmail.com">saas.qms@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Hébergement et services techniques">
        <p>Les prestataires déclarés pour l’architecture du pilote sont :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel : hébergement du frontend ; région du déploiement non confirmée.</li>
          <li>Render : hébergement de l’API ; région du déploiement déclarée en Europe.</li>
          <li>Supabase : authentification, base de données et stockage de fichiers ; région du projet déclarée en Europe.</li>
          <li>Google Drive : stockage des preuves photo pour les espaces qui connectent leur propre Drive.</li>
          <li>Groq : fournisseur des fonctions d’assistance par intelligence artificielle.</li>
          <li>Google Gmail API : transport d’emails transactionnels sélectionné par la configuration actuelle.</li>
        </ul>
        <p>
          Les adresses légales et coordonnées de contact propres à chaque hébergeur et sous-traitant, ainsi
          que les informations contractuelles applicables au déploiement, doivent être vérifiées et ajoutées
          avant l’ouverture commerciale.
        </p>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          Les éléments originaux du site et de QMS SaaS sont protégés par les règles applicables en matière
          de propriété intellectuelle. Toute reproduction ou réutilisation non autorisée est interdite, sous
          réserve des droits appartenant à leurs titulaires respectifs.
        </p>
      </LegalSection>

      <LegalSection title="5. Données personnelles">
        <p>
          Le pilote est en développement et certaines informations restent à valider avant une utilisation
          commerciale. Consultez la{' '}
          <a href="/legal/confidentialite" className="text-primary hover:underline">page de confidentialité</a>{' '}
          pour connaître les limites actuelles et les prestataires identifiés. Les informations légales de
          l’éditeur et du responsable du traitement devront être complétées avant tout usage en production.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
