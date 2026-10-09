import LegalPageLayout from '../components/LegalPageLayout.jsx';
import LegalSection from '../components/LegalSection.jsx';

export default function LegalNotice() {
  return (
    <LegalPageLayout title="Mentions légales" updatedAt="[à compléter]">
      <LegalSection title="1. Éditeur du site">
        <p>
          QMS SaaS est édité par [dénomination sociale], [forme juridique] au capital de [montant],
          immatriculée au [registre compétent] sous le numéro [numéro], dont le siège social est situé
          [adresse].
        </p>
        <p>Directeur de la publication : [nom et qualité].</p>
      </LegalSection>

      <LegalSection title="2. Contact">
        <p>
          Pour toute question concernant le site ou le service, vous pouvez écrire à{' '}
          <a className="text-primary hover:underline" href="mailto:saas.qms@gmail.com">
            saas.qms@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Hébergement">
        <p>
          Le site et le service sont hébergés par [nom de l’hébergeur], [forme juridique], situé à
          [adresse], joignable à [coordonnées].
        </p>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          Les éléments composant QMS SaaS, notamment son interface, ses textes et ses éléments
          graphiques, sont protégés par les règles applicables en matière de propriété intellectuelle.
          Toute reproduction ou réutilisation non autorisée est interdite.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
