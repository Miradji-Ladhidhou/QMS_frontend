import LegalPageLayout from '../components/LegalPageLayout.jsx';
import LegalSection from '../components/LegalSection.jsx';

export default function LegalPrivacy() {
  return (
    <LegalPageLayout title="Politique de confidentialité" updatedAt="[à compléter]">
      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement des données à caractère personnel collectées via QMS SaaS est
          [Nom de la société], [adresse], [email de contact]. Pour toute question relative à vos données
          personnelles, vous pouvez contacter [email du délégué à la protection des données / contact
          RGPD].
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p>À la création d'un compte et lors de l'utilisation du Service, nous collectons :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Données d'identification : nom complet, adresse email, rôle au sein de votre organisation.</li>
          <li>
            Données saisies dans le cadre de l'utilisation du Service : documents qualité, fiches de
            non-conformité (CAPA), données de formation, indicateurs, analyses QQOQCCP — dont vous, ou votre
            organisation, restez seuls responsables du contenu.
          </li>
          <li>Données techniques : journaux de connexion et d'audit nécessaires à la sécurité et à la traçabilité du Service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités et base légale">
        <p>Ces données sont traitées pour les finalités suivantes :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Fourniture du Service et gestion de votre compte (exécution du contrat) ;</li>
          <li>Sécurité, prévention de la fraude et traçabilité réglementaire propre à un système qualité (intérêt légitime) ;</li>
          <li>Communications transactionnelles liées à votre compte : invitations, notifications, réinitialisation de mot de passe (exécution du contrat) ;</li>
          <li>Respect de nos obligations légales, le cas échéant.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Destinataires des données">
        <p>
          Les données sont accessibles aux personnes autorisées au sein de votre organisation, selon les
          rôles que vous configurez, ainsi qu'aux prestataires techniques nécessaires au fonctionnement du
          Service (hébergement de la base de données et des fichiers, envoi des emails transactionnels),
          liés par des obligations de confidentialité contractuelles. Ces données ne sont ni vendues ni
          utilisées à des fins publicitaires.
        </p>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Les données sont conservées pendant toute la durée de votre abonnement, puis supprimées ou
          archivées conformément aux exigences réglementaires applicables à votre secteur. Vous pouvez
          demander la suppression anticipée de vos données à tout moment, voir la section « Vos droits »
          ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title="6. Sécurité">
        <p>
          L'accès à vos données est cloisonné par organisation : chaque espace client est isolé des autres.
          Les accès sont protégés par authentification et les permissions sont restreintes selon le rôle de
          chaque utilisateur. Des mesures techniques raisonnables sont mises en œuvre pour protéger vos
          données contre l'accès non autorisé, la perte ou l'altération.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit
          d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos
          données.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Le propriétaire d'un espace peut exporter l'intégralité des données de son organisation, et en
            demander la suppression définitive, directement depuis les paramètres de son espace
            (Paramètres → Confidentialité).
          </li>
          <li>
            Tout Utilisateur peut modifier ses informations de profil (nom, mot de passe) depuis Paramètres
            → Mon profil.
          </li>
          <li>
            Pour toute autre demande relative à vos droits, ou en cas de réclamation, vous pouvez contacter
            [email de contact] ou introduire une réclamation auprès de l'autorité de contrôle compétente
            (en France, la CNIL — www.cnil.fr).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Cookies et stockage local">
        <p>
          QMS SaaS n'utilise aucun cookie ni traceur publicitaire ou analytique. Le Service utilise
          uniquement le stockage local de votre navigateur (localStorage) pour maintenir votre session de
          connexion — un usage strictement nécessaire au fonctionnement du Service, exempté de consentement
          au titre de la réglementation applicable aux cookies. Ces données sont supprimées lorsque vous vous
          déconnectez ou videz les données de votre navigateur.
        </p>
      </LegalSection>

      <LegalSection title="9. Transferts hors Union européenne">
        <p>
          [À compléter selon la localisation effective de l'hébergement des données et des sous-traitants
          utilisés — préciser les garanties mises en œuvre en cas de transfert hors UE, le cas échéant.]
        </p>
      </LegalSection>

      <LegalSection title="10. Modification de la politique">
        <p>
          Cette politique de confidentialité peut être mise à jour. La date de dernière mise à jour figure en
          haut de cette page.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
