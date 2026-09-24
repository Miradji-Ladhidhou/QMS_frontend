import { useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  MessageSquareWarning,
  PackageX,
  RefreshCw,
  ScrollText,
  Siren,
  Settings,
  Smile,
  ShieldAlert,
  Truck,
  Users,
  Users2,
  Wrench,
  CheckSquare,
} from 'lucide-react';

const SECTIONS = [
  {
    icon: LayoutDashboard,
    title: 'Bien démarrer : le parcours recommandé',
    body: (
      <>
        <p>
          Commencez par renseigner l'<strong>entreprise</strong>, les services, les utilisateurs et les dossiers. Ajoutez ensuite
          vos documents et procédures, puis configurez les formations, indicateurs, audits et risques utiles à votre activité.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Paramétrer l'entreprise, les rôles, les services et les dossiers.</li>
          <li>Créer les documents de référence et faire valider les procédures.</li>
          <li>Enregistrer les formations, les risques, les audits et les indicateurs.</li>
          <li>Suivre les échéances dans le Planning et traiter les actions jusqu'à leur vérification.</li>
        </ol>
      </>
    ),
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    body: (
      <>
        <p>La page d'accueil : un résumé de ce qui vous concerne (CAPA ouvertes, formations à renouveler, audits en cours...).</p>
        <p className="mt-2">
          Un <strong>member</strong> n'y voit que ce qui est à lui. Un <strong>manager</strong> voit son ou ses services. Un{' '}
          <strong>admin</strong> voit tout le tenant, avec un sélecteur pour filtrer par service.
        </p>
      </>
    ),
  },
  {
    icon: CalendarClock,
    title: 'Planning',
    body: (
      <>
        <p>
          Un agenda unique qui regroupe automatiquement toutes vos échéances : CAPA, documents à réviser, formations à
          renouveler, audits, réclamations, risques — plus les <strong>tâches</strong> que vous créez vous-même ici, qui
          n'existent nulle part ailleurs dans l'application.
        </p>
        <p className="mt-2">Vous ne pouvez modifier ou supprimer qu'une tâche que vous avez créée ou qui vous est assignée.</p>
      </>
    ),
  },
  {
    icon: FileText,
    title: 'Documents',
    body: (
      <>
        <p>Vos procédures, modes opératoires, enregistrements... avec un historique de versions et une piste d'audit complète.</p>
        <p className="mt-2">
          Chaque document appartient à un <strong>dossier</strong> (bouton <strong>Gérer les dossiers</strong> en haut de la
          page Documents) : un dossier peut être laissé ouvert à tout le monde, ou <strong>restreint</strong> à des
          personnes/groupes précis.
        </p>
      </>
    ),
  },
  {
    icon: FileCheck,
    title: 'Procédures et validation documentaire',
    body: (
      <>
        <p>
          Rédigez une procédure par sections, ajoutez des tableaux, encadrés, listes et documents associés, puis créez une
          <strong> nouvelle version</strong> lorsque le contenu évolue.
        </p>
        <p className="mt-2">
          Soumettez-la à approbation, suivez son statut et exportez la version en <strong>Word ou PDF</strong>. Les documents
          approuvés restent traçables dans leur historique.
        </p>
      </>
    ),
  },
  {
    icon: CheckSquare,
    title: 'Mes approbations',
    body: (
      <p>
        Retrouvez les documents et versions qui attendent votre décision. Ouvrez le contenu, vérifiez la version proposée,
        ajoutez un commentaire si nécessaire, puis <strong>approuvez ou refusez</strong> la demande.
      </p>
    ),
  },
  {
    icon: ScrollText,
    title: 'Politique qualité',
    body: (
      <p>
        Publiez la politique qualité de l'entreprise, gérez sa version en vigueur et suivez les utilisateurs qui l'ont lue.
        Elle reste accessible depuis l'espace Documents.
      </p>
    ),
  },
  {
    icon: ClipboardList,
    title: 'CAPA (actions correctives/préventives)',
    body: (
      <>
        <p>De l'ouverture d'une non-conformité jusqu'à la vérification d'efficacité, en passant par cause, action et échéance.</p>
        <p className="mt-2">
          Un <strong>member</strong> peut créer une CAPA mais ne peut plus la modifier une fois créée — seul un manager/admin
          la fait ensuite évoluer. Le suivi en commentaire reste toujours ouvert.
        </p>
      </>
    ),
  },
  {
    icon: MessageSquareWarning,
    title: 'Réclamations clients',
    body: (
      <p>
        Enregistrez une réclamation, assignez-la, documentez l'analyse et suivez sa résolution. Demandez ensuite la
        <strong> satisfaction du client</strong> et ouvrez une CAPA si une action systémique est nécessaire.
      </p>
    ),
  },
  {
    icon: Smile,
    title: 'Satisfaction client',
    body: (
      <p>
        Envoyez ou enregistrez un retour client, suivez la note et la méthode utilisée, puis analysez les tendances. Les
        résultats complètent le traitement des réclamations et alimentent la revue de direction.
      </p>
    ),
  },
  {
    icon: HelpCircle,
    title: 'QQOQCCP',
    body: (
      <p>
        Structurez un problème en 7 questions (Qui, Quoi, Où, Quand, Comment, Combien, Pourquoi). Une proposition de
        synthèse et d'actions peut ensuite être revue avant de créer une CAPA.
      </p>
    ),
  },
  {
    icon: RefreshCw,
    title: 'PDCA',
    body: (
      <p>
        Organisez une amélioration en quatre étapes : <strong>Plan</strong>, <strong>Do</strong>, <strong>Check</strong> et
        <strong> Act</strong>. Utilisez-le pour planifier une action, suivre sa réalisation, vérifier son efficacité et
        capitaliser la décision.
      </p>
    ),
  },
  {
    icon: GraduationCap,
    title: 'Formations',
    body: (
      <p>
        Le catalogue de formations et la matrice de compétences de votre équipe (comptes ET personnel sans compte), avec
        alertes automatiques de renouvellement.
      </p>
    ),
  },
  {
    icon: BarChart3,
    title: 'KPI',
    body: (
      <>
        <p>Vos indicateurs de performance : saisie manuelle ou calcul automatique depuis un fichier importé (CSV/Excel).</p>
        <p className="mt-2">Rangez-les en dossiers pour vous y retrouver, et comparez plusieurs séries sur un même graphique.</p>
      </>
    ),
  },
  {
    icon: ClipboardCheck,
    title: 'Audits internes',
    body: (
      <p>
        Planifiez un audit, désignez un auditeur, renseignez le périmètre et la check-list, puis consignez les constats.
        Transformez un écart en CAPA quand nécessaire et conservez le rapport exporté.
      </p>
    ),
  },
  {
    icon: Siren,
    title: 'Accidents du travail',
    body: (
      <p>
        Déclarez un accident, décrivez les faits, les personnes concernées et les mesures immédiates, puis suivez l'analyse
        et les actions jusqu'à la clôture. Les droits d'accès permettent de limiter les informations sensibles.
      </p>
    ),
  },
  {
    icon: PackageX,
    title: 'Non-conformités produit/service',
    body: (
      <p>
        Enregistrez un produit ou service non conforme, son origine, sa disposition et la décision prise. Reliez-le à une
        CAPA lorsque la cause nécessite une action corrective durable.
      </p>
    ),
  },
  {
    icon: ShieldAlert,
    title: 'Registre des risques',
    body: <p>Identifiez un risque ou une opportunité, évaluez-le (probabilité × gravité), suivez son traitement dans le temps.</p>,
  },
  {
    icon: Truck,
    title: 'Fournisseurs',
    body: (
      <p>
        Gérez le référentiel fournisseurs, les contacts, les documents et les évaluations. Les critères pondérés produisent
        une note et une décision, avec rappel de la prochaine échéance.
      </p>
    ),
  },
  {
    icon: Users2,
    title: 'Revues de direction',
    body: (
      <p>
        Préparez une revue de direction avec un état des lieux du SMQ capturé automatiquement à la clôture, et suivez les
        actions décidées.
      </p>
    ),
  },
  {
    icon: Wrench,
    title: 'Services et organisation',
    body: (
      <p>
        Les services structurent les responsabilités, les filtres du Dashboard et les affectations. Utilisez-les pour relier
        les personnes, audits, formations, risques et actions à votre organisation réelle.
      </p>
    ),
  },
  {
    icon: Eye,
    title: 'Qui voit quoi : catégories et visibilité',
    body: (
      <>
        <p>Ce principe est le même partout (Documents, CAPA, Réclamations, QQOQCCP, Fournisseurs, Formations...) :</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Par défaut, tout le monde dans l'entreprise voit tout.</li>
          <li>
            Un admin peut créer un <strong>dossier restreint</strong> (bouton <strong>Gérer les dossiers</strong> en haut de
            chaque page) et choisir qui y a accès — utilisateur par utilisateur ou par groupe.
          </li>
          <li>
            À la création (ou l'édition) d'un élément, vous pouvez aussi choisir <strong>"Uniquement moi"</strong> — personne
            d'autre que vous (et l'admin) ne le verra, sans avoir besoin qu'un admin s'en occupe.
          </li>
          <li>
            Le bouton <strong>Partager</strong> reste utile pour une exception ponctuelle : donner accès à une seule personne
            sur un seul élément, sans toucher à sa catégorie.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Users,
    title: 'Les rôles',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Member</strong> : utilise les outils au quotidien, mais ne pilote pas — pas d'accès à Paramètres, droits de
          modification limités sur plusieurs modules (CAPA, réclamations...).
        </li>
        <li>
          <strong>Manager</strong> : les mêmes outils, avec les droits de gestion (modifier, clôturer, déplacer en masse...).
        </li>
        <li>
          <strong>Admin</strong> : tout ce qui précède, plus Paramètres — utilisateurs, catégories, visibilité du menu,
          informations de l'entreprise.
        </li>
      </ul>
    ),
  },
  {
    icon: Settings,
    title: 'Paramètres (admin)',
    body: (
      <p>
        Réservé aux administrateurs : informations de l'entreprise et logo, catégories (documents et modules), utilisateurs et
        groupes, visibilité du menu par rôle, et réglages propres à certains modules (CAPA, Documents).
      </p>
    ),
  },
];

function AccordionItem({ icon: Icon, title, body, isOpen, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
          <Icon size={18} />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-900 sm:text-base">{title}</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm text-slate-600 sm:px-5">{body}</div>
      )}
    </div>
  );
}

export default function GettingStarted() {
  const [openIndex, setOpenIndex] = useState(0);

  function toggle(index) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Prise en main</h1>
      <p className="mt-1 text-sm text-slate-500">
        Un aperçu rapide de chaque outil. Cette page est visible par tout le monde, quel que soit votre rôle.
      </p>

      <div className="mt-4 space-y-2">
        {SECTIONS.map((section, index) => (
          <AccordionItem
            key={section.title}
            icon={section.icon}
            title={section.title}
            body={section.body}
            isOpen={openIndex === index}
            onToggle={() => toggle(index)}
          />
        ))}
      </div>
    </div>
  );
}
