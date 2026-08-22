import LegalPageLayout from '../components/LegalPageLayout.jsx';
import LegalSection from '../components/LegalSection.jsx';

export default function LegalTerms() {
  return (
    <LegalPageLayout title="Conditions générales d'utilisation" updatedAt="[à compléter]">
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions générales d'utilisation (« CGU ») régissent l'accès et l'utilisation du
          logiciel QMS SaaS (« le Service »), édité par [Nom de la société], [forme juridique], au capital
          de [montant], immatriculée au RCS de [ville] sous le numéro [SIRET], dont le siège social est
          situé [adresse] (« l'Éditeur »).
        </p>
        <p>
          Toute création de compte implique l'acceptation pleine et entière des présentes CGU par le client
          (« le Client ») et par les utilisateurs qu'il autorise à accéder au Service (« les Utilisateurs »).
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          QMS SaaS est un logiciel de gestion d'un système de management de la qualité : gestion documentaire,
          traitement des non-conformités (CAPA) et des réclamations clients, diagnostic structuré (QQOQCCP),
          suivi des formations, indicateurs qualité (KPI), audits internes, registre des risques, évaluation
          des fournisseurs, revues de direction et planning unifié. Le Service est accessible en ligne, en
          mode multi-locataires, chaque Client disposant d'un espace de données isolé.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte et accès">
        <p>
          L'accès au Service nécessite la création d'un compte associé à une adresse email valide. Le Client
          est responsable de la confidentialité des identifiants de connexion de ses Utilisateurs et de toute
          action réalisée depuis leurs comptes.
        </p>
        <p>
          Le Client gère lui-même les rôles et permissions de ses Utilisateurs au sein de son espace
          (propriétaire, administrateur, manager, membre) et reste seul responsable de l'attribution de ces
          rôles.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations de l'utilisateur">
        <p>
          Le Client s'engage à utiliser le Service conformément à sa destination, à ne pas tenter d'accéder
          aux données d'un autre Client, à ne pas perturber le fonctionnement du Service et à respecter la
          réglementation applicable, notamment en matière de protection des données personnelles.
        </p>
      </LegalSection>

      <LegalSection title="5. Propriété intellectuelle">
        <p>
          Le Service, son code source, ses interfaces et sa documentation sont la propriété exclusive de
          l'Éditeur ou de ses concédants. Aucune disposition des présentes CGU ne saurait être interprétée
          comme une cession de droits de propriété intellectuelle au profit du Client.
        </p>
        <p>
          Les données saisies par le Client dans le Service (documents, fiches CAPA, données de formation,
          indicateurs, analyses) demeurent la propriété du Client.
        </p>
      </LegalSection>

      <LegalSection title="6. Données et confidentialité">
        <p>
          Le traitement des données à caractère personnel dans le cadre du Service est décrit dans la{' '}
          <a href="/legal/confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </a>
          , qui fait partie intégrante des présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilité et maintenance">
        <p>
          L'Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du Service, sans
          garantir un accès ininterrompu. Des opérations de maintenance planifiées peuvent entraîner des
          interruptions temporaires, avec information préalable dans la mesure du possible.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          L'Éditeur ne saurait être tenu responsable des dommages indirects résultant de l'utilisation du
          Service. Le Service étant un outil d'aide à la gestion de la qualité, il appartient au Client de
          vérifier l'exactitude et la conformité des données qu'il y saisit au regard de ses propres
          obligations réglementaires (notamment ISO 9001).
        </p>
      </LegalSection>

      <LegalSection title="9. Résiliation">
        <p>
          Le Client peut à tout moment mettre fin à son abonnement selon les modalités prévues à son contrat.
          Le Client propriétaire de son espace peut également demander la suppression définitive de son
          compte et de l'ensemble de ses données depuis les paramètres de son espace, conformément à la{' '}
          <a href="/legal/confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable et juridiction">
        <p>
          Les présentes CGU sont soumises au droit [pays/juridiction à préciser]. Tout litige relatif à leur
          interprétation ou leur exécution relève de la compétence exclusive des tribunaux de [ville à
          préciser], sauf disposition légale contraire impérative.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>Pour toute question relative aux présentes CGU : [email de contact].</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
