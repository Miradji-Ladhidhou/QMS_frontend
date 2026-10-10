import LegalPageLayout from '../components/LegalPageLayout.jsx';
import LegalSection from '../components/LegalSection.jsx';

export default function LegalTerms() {
  return (
    <LegalPageLayout title="Conditions d’utilisation du pilote" updatedAt="10 octobre 2026">
      <LegalSection title="1. Statut du service">
        <p>
          QMS SaaS est un projet personnel en phase de préproduction, accessible sur invitation pour des essais.
          Il ne s’agit pas actuellement d’une offre commerciale, d’un abonnement ou d’un service assorti d’un
          engagement de disponibilité. Aucun prix ni niveau de service n’est proposé dans le cadre de ce pilote.
        </p>
        <p>
          Ces conditions décrivent uniquement les règles d’utilisation du pilote. Elles ne constituent pas les
          conditions d’une future offre commerciale, qui devra faire l’objet de documents distincts et validés
          avant sa commercialisation.
        </p>
      </LegalSection>

      <LegalSection title="2. Objet et fonctionnalités">
        <p>
          Le pilote permet d’évaluer des fonctions de gestion de la qualité : documents et procédures, actions
          correctives (CAPA), réclamations, audits, risques, formations, indicateurs, fournisseurs, revues de
          direction, planning, preuves photographiques et assistance par intelligence artificielle.
        </p>
        <p>
          Les fonctionnalités, interfaces et données de démonstration peuvent évoluer, être réinitialisées ou
          devenir temporairement indisponibles pendant les essais.
        </p>
      </LegalSection>

      <LegalSection title="3. Accès au pilote">
        <p>
          L’accès est accordé sur demande et peut être limité, suspendu ou retiré pendant la phase de test.
          Chaque utilisateur doit protéger ses identifiants et informer le contact du pilote s’il soupçonne un
          accès non autorisé.
        </p>
      </LegalSection>

      <LegalSection title="4. Utilisation des données pendant le pilote">
        <p>
          Vous pouvez communiquer les informations de contact nécessaires à votre demande d’accès et à
          l’utilisation du compte pilote. Limitez les informations enregistrées dans les modules aux besoins
          de l’évaluation. N’y ajoutez pas de données sensibles, de données de santé, de documents
          confidentiels ou d’informations personnelles concernant des salariés, clients ou fournisseurs sans
          autorisation et sans cadre adapté.
        </p>
        <p>
          Le pilote ne doit pas être utilisé comme preuve de conformité réglementaire ni comme registre
          opérationnel officiel. Pour toute question concernant une information enregistrée, contactez{' '}
          <a href="mailto:saas.qms@gmail.com" className="text-primary hover:underline">saas.qms@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="5. Assistance par intelligence artificielle">
        <p>
          Lorsqu’une fonction IA est utilisée, les éléments saisis dans cette fonction sont transmis au
          fournisseur technique Groq afin de produire une proposition. Les propositions peuvent être
          incomplètes ou inexactes : elles doivent être vérifiées et adaptées par l’utilisateur. Elles ne
          remplacent ni une expertise professionnelle ni une validation réglementaire.
        </p>
        <p>
          N’envoyez pas de données sensibles, confidentielles ou concernant des tiers à ces fonctions. La
          disponibilité de l’assistance IA dépend de la configuration du pilote.
        </p>
      </LegalSection>

      <LegalSection title="6. Photos et fichiers">
        <p>
          Les preuves photographiques ajoutées au pilote sont transférées vers Google Drive lorsqu’une
          connexion Drive est configurée. D’autres documents peuvent être hébergés par les prestataires
          techniques du service selon la configuration de l’espace. Assurez-vous d’avoir le droit de
          téléverser les fichiers et évitez les contenus confidentiels ou identifiants sans autorisation.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriété intellectuelle">
        <p>
          Les interfaces, le code et les contenus originaux de QMS SaaS restent protégés par les règles
          applicables. Les présentes conditions n’accordent qu’un droit personnel, limité, révocable et
          temporaire d’utiliser le pilote pour son évaluation. L’utilisateur reste responsable des contenus
          qu’il ajoute et des autorisations nécessaires à leur utilisation.
        </p>
      </LegalSection>

      <LegalSection title="8. Confidentialité et suppression">
        <p>
          Les traitements techniques utilisés pour le pilote et leurs limites sont décrits dans la{' '}
          <a href="/legal/confidentialite" className="text-primary hover:underline">page de confidentialité</a>.
          Pour demander la suppression d’un compte ou poser une question sur vos données, écrivez à{' '}
          <a href="mailto:saas.qms@gmail.com" className="text-primary hover:underline">saas.qms@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilité et évolution">
        <p>
          Le pilote est fourni à des fins d’évaluation, sans garantie de disponibilité, de conservation des
          données ou d’adéquation à un usage particulier. Dans les limites autorisées par la loi, l’utilisateur
          demeure responsable de ses essais et de la sauvegarde des contenus qu’il ajoute.
        </p>
        <p>
          Ces conditions devront être remplacées et validées avant toute ouverture commerciale ou utilisation
          avec des données réelles.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact et droit applicable">
        <p>
          Pour toute question concernant le pilote :{' '}
          <a href="mailto:saas.qms@gmail.com" className="text-primary hover:underline">saas.qms@gmail.com</a>.
          Le projet est exploité depuis La Possession (97419), La Réunion, France. Les règles impératives
          applicables demeurent réservées ; les présentes conditions ne désignent pas de tribunal exclusif.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
