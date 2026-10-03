import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FilePlus2,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutGrid,
  LayoutDashboard,
  MessageSquareWarning,
  PackageX,
  RefreshCw,
  RotateCcw,
  Search,
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
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';

const SECTIONS = [
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

const CHECKLIST = [
  {
    title: 'Vérifier les informations de l’entreprise et les accès',
    description: 'À faire par un administrateur : coordonnées, utilisateurs et rôles.',
    links: [{ to: '/settings', label: 'Paramètres' }],
  },
  {
    title: 'Structurer les services et l’équipe',
    description: 'Reliez les personnes à votre organisation et clarifiez les responsabilités.',
    links: [
      { to: '/services', label: 'Services' },
      { to: '/employees', label: 'Personnel' },
    ],
  },
  {
    title: 'Ajouter les documents et procédures de référence',
    description: 'Centralisez vos documents utiles et soumettez les procédures à validation.',
    links: [
      { to: '/documents', label: 'Documents' },
      { to: '/procedures', label: 'Procédures' },
    ],
  },
  {
    title: 'Publier la politique qualité',
    description: 'Présentez vos engagements qualité et partagez la version en vigueur.',
    links: [{ to: '/quality-policy', label: 'Politique qualité' }],
  },
  {
    title: 'Choisir vos outils de suivi et vos prochaines échéances',
    description: 'Commencez par les formations, audits ou risques pertinents, puis suivez les échéances.',
    links: [
      { to: '/trainings', label: 'Formations' },
      { to: '/audits', label: 'Audits' },
      { to: '/risks', label: 'Risques' },
      { to: '/planning', label: 'Planning' },
    ],
  },
];

const SECTION_GROUPS = [
  {
    title: 'S’orienter et organiser',
    sectionTitles: ['Dashboard', 'Planning', 'Services et organisation', 'Qui voit quoi : catégories et visibilité', 'Les rôles', 'Paramètres (admin)'],
  },
  {
    title: 'Documents et validations',
    sectionTitles: ['Documents', 'Procédures et validation documentaire', 'Mes approbations', 'Politique qualité'],
  },
  {
    title: 'Améliorer et traiter les écarts',
    sectionTitles: [
      'CAPA (actions correctives/préventives)',
      'Réclamations clients',
      'Satisfaction client',
      'QQOQCCP',
      'PDCA',
      'Non-conformités produit/service',
    ],
  },
  {
    title: 'Maîtriser et évaluer',
    sectionTitles: [
      'Formations',
      'KPI',
      'Audits internes',
      'Accidents du travail',
      'Registre des risques',
      'Fournisseurs',
      'Revues de direction',
    ],
  },
];

function AccordionItem({ icon: Icon, title, body, isOpen, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
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
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const storageKey = `gettingStarted:checklist:${tenant?.id ?? currentUser?.tenant_id ?? 'tenant'}:${currentUser?.id ?? 'user'}`;
  const [completed, setCompleted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((id) => Number.isInteger(id) && id >= 0 && id < CHECKLIST.length) : [];
    } catch {
      return [];
    }
  });
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [query, setQuery] = useState('');
  const [openTitle, setOpenTitle] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setCompleted(Array.isArray(saved) ? saved.filter((id) => Number.isInteger(id) && id >= 0 && id < CHECKLIST.length) : []);
    } catch {
      setStorageUnavailable(true);
    }
  }, [storageKey]);

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const filteredGroups = useMemo(
    () =>
      SECTION_GROUPS.map((group) => ({
        ...group,
        sections: group.sectionTitles
          .map((title) => SECTIONS.find((section) => section.title === title))
          .filter((section) => section && section.title.toLocaleLowerCase('fr').includes(normalizedQuery)),
      })).filter((group) => group.sections.length > 0),
    [normalizedQuery],
  );

  function toggleChecklistItem(index) {
    const next = completed.includes(index) ? completed.filter((item) => item !== index) : [...completed, index];
    setCompleted(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageUnavailable(true);
    }
  }

  function resetChecklist() {
    setCompleted([]);
    try {
      localStorage.removeItem(storageKey);
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Prise en main</h1>
      <p className="mt-1 text-sm text-slate-500">
        Votre parcours de démarrage, puis un guide des outils accessible à tous les rôles.
      </p>

      <section aria-labelledby="getting-started-checklist" className="mt-5 rounded-xl border border-primary/20 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <BookOpenCheck size={20} />
              <h2 id="getting-started-checklist" className="text-base font-semibold text-slate-900 sm:text-lg">
                Votre parcours de démarrage
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Suivez les étapes utiles à votre organisation, dans l’ordre qui vous convient.</p>
          </div>
          {completed.length > 0 && (
            <button
              type="button"
              onClick={resetChecklist}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <RotateCcw size={14} />
              Réinitialiser
            </button>
          )}
        </div>

        <div className="mt-4" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              {completed.length} étape{completed.length > 1 ? 's' : ''} sur {CHECKLIST.length} terminée
              {completed.length > 1 ? 's' : ''}
            </span>
            <span>{Math.round((completed.length / CHECKLIST.length) * 100)} %</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(completed.length / CHECKLIST.length) * 100}%` }}
            />
          </div>
        </div>
        {storageUnavailable && (
          <p role="status" className="mt-2 text-xs text-amber-700">
            La progression ne peut pas être enregistrée dans ce navigateur ; elle restera disponible jusqu’à la fermeture de la page.
          </p>
        )}

        <ol className="mt-3 divide-y divide-slate-100">
          {CHECKLIST.map((item, index) => {
            const isComplete = completed.includes(index);
            return (
              <li key={item.title} className="flex gap-3 py-3">
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(index)}
                  aria-pressed={isComplete}
                  aria-label={`${isComplete ? 'Marquer comme non terminée' : 'Marquer comme terminée'} : ${item.title}`}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isComplete ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-transparent hover:border-primary'
                  }`}
                >
                  {isComplete && <Check size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-medium ${isComplete ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {item.links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {link.label}
                        <ArrowRight size={12} />
                      </Link>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-slate-400">Votre progression est enregistrée uniquement dans ce navigateur et pour votre compte.</p>
      </section>

      <section aria-labelledby="getting-started-shortcuts" className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <LayoutGrid size={18} className="text-primary" />
          <h2 id="getting-started-shortcuts" className="text-base font-semibold text-slate-900">Accès rapides</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { to: '/', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/planning', label: 'Planning', icon: CalendarClock },
            { to: '/documents', label: 'Documents', icon: FileText },
            { to: '/my-approvals', label: 'Mes approbations', icon: CheckCircle2 },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="getting-started-directory" className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FilePlus2 size={18} className="text-primary" />
              <h2 id="getting-started-directory" className="text-base font-semibold text-slate-900">Guide des outils</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Choisissez une rubrique pour comprendre à quoi sert chaque outil.</p>
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Rechercher dans le guide</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une rubrique"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Aucune rubrique ne correspond à « {query.trim()} ».</p>
            <button type="button" onClick={() => setQuery('')} className="mt-2 text-sm font-medium text-primary hover:underline">
              Effacer la recherche
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-5">
            {filteredGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h3>
                <div className="space-y-2">
                  {group.sections.map((section) => (
                    <AccordionItem
                      key={section.title}
                      icon={section.icon}
                      title={section.title}
                      body={section.body}
                      isOpen={openTitle === section.title}
                      onToggle={() => setOpenTitle((previous) => (previous === section.title ? null : section.title))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
