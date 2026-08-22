import { useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  MessageSquareWarning,
  Settings,
  ShieldAlert,
  Truck,
  Users,
  Users2,
} from 'lucide-react';

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
          Chaque document appartient à une <strong>catégorie</strong> (Paramètres &gt; Catégories documents) : une catégorie
          peut être laissée ouverte à tout le monde, ou <strong>restreinte</strong> à des personnes/groupes précis.
        </p>
      </>
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
    body: <p>Enregistrez une réclamation, assignez-la, suivez sa résolution — même logique de suivi que les CAPA.</p>,
  },
  {
    icon: HelpCircle,
    title: 'QQOQCCP',
    body: (
      <p>
        Structurez un problème en 7 questions (Qui, Quoi, Où, Quand, Comment, Combien, Pourquoi). Une IA peut proposer une
        synthèse et des actions, que vous pouvez ensuite transformer en CAPA en un clic.
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
    body: <p>Planifiez un audit, consignez ses constats, transformez un constat en CAPA quand nécessaire.</p>,
  },
  {
    icon: ShieldAlert,
    title: 'Registre des risques',
    body: <p>Identifiez un risque ou une opportunité, évaluez-le (probabilité × gravité), suivez son traitement dans le temps.</p>,
  },
  {
    icon: Truck,
    title: 'Fournisseurs',
    body: <p>Le référentiel de vos fournisseurs et leur historique d'évaluations, avec rappel de la prochaine échéance.</p>,
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
    icon: Eye,
    title: 'Qui voit quoi : catégories et visibilité',
    body: (
      <>
        <p>Ce principe est le même partout (Documents, CAPA, Réclamations, QQOQCCP, Fournisseurs, Formations...) :</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Par défaut, tout le monde dans l'entreprise voit tout.</li>
          <li>
            Un admin peut créer une <strong>catégorie restreinte</strong> (Paramètres &gt; Catégories) et choisir qui y a
            accès — utilisateur par utilisateur ou par groupe.
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
