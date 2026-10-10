import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Lock,
  MessageSquareWarning,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Users,
  Users2,
} from 'lucide-react';

const MODULES = [
  {
    icon: FileText,
    title: 'Documents maîtrisés',
    description: "Versions, statuts, workflows d'approbation et piste d'audit complète sur chaque document.",
  },
  {
    icon: ClipboardList,
    title: 'Non-conformités traitées',
    description: "Ouvrez une CAPA, assignez-la, suivez son traitement jusqu'à la vérification d'efficacité.",
  },
  {
    icon: MessageSquareWarning,
    title: 'Réclamations clients',
    description: 'Enregistrez une réclamation, assignez-la, suivez sa résolution jusqu\'à la satisfaction du client.',
  },
  {
    icon: HelpCircle,
    title: 'Diagnostic guidé',
    description: "Structurez un problème en 7 questions, laissez l'IA proposer une synthèse, ouvrez la CAPA en un clic.",
  },
  {
    icon: GraduationCap,
    title: 'Formations suivies',
    description: 'Matrice de compétences et alertes de renouvellement automatiques, par utilisateur.',
  },
  {
    icon: BarChart3,
    title: 'Indicateurs à jour',
    description: 'Importez vos fichiers, calculez vos taux automatiquement, comparez plusieurs séries sur un même graphique.',
  },
  {
    icon: ClipboardCheck,
    title: 'Audits internes',
    description: 'Planifiez un audit, consignez ses constats, transformez-les en CAPA en un clic si nécessaire.',
  },
  {
    icon: ShieldAlert,
    title: 'Registre des risques',
    description: 'Identifiez un risque ou une opportunité, évaluez-le, suivez son traitement dans le temps.',
  },
  {
    icon: Truck,
    title: 'Évaluation fournisseurs',
    description: 'Votre référentiel fournisseurs et leur historique d\'évaluations, avec rappel des échéances.',
  },
  {
    icon: Users2,
    title: 'Revues de direction',
    description: "État des lieux du SMQ capturé automatiquement, actions décidées suivies jusqu'à leur clôture.",
  },
  {
    icon: CalendarClock,
    title: 'Planning unifié',
    description: 'Toutes vos échéances réunies dans un seul agenda, plus vos tâches manuelles.',
  },
];

const DIFFERENTIATORS = [
  {
    icon: Lock,
    title: 'Vos données, cloisonnées',
    description: 'Chaque entreprise cliente dispose de son propre espace, strictement isolé des autres.',
  },
  {
    icon: Eye,
    title: 'Visibilité sur mesure',
    description: 'Ouvert à tous par défaut, restreint à quelques personnes si besoin — ou gardé privé en un clic, sans y mêler un administrateur.',
  },
  {
    icon: Bell,
    title: 'Notifications automatiques',
    description: "Email et alerte dans l'application quand un document doit être revu ou une formation renouvelée.",
  },
  {
    icon: Users,
    title: 'Rôles et permissions',
    description: 'Chacun voit et modifie exactement ce qu\'il doit, du simple membre au propriétaire du compte.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="relative z-10 border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <img
            src="/brand/logo-horizontal.png"
            width={1200}
            height={360}
            className="h-auto w-24 sm:w-48"
            alt="QMS SaaS — Système de management de la qualité"
          />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex" aria-label="Navigation principale">
            <a href="#fonctionnalites" className="transition hover:text-primary">Fonctionnalités</a>
            <a href="#ia-photos" className="transition hover:text-primary">IA & photos</a>
            <a href="#equipe" className="transition hover:text-primary">Pour votre équipe</a>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-1.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Connexion</span>
              <span className="hidden sm:inline">Se connecter</span>
            </Link>
            {/* Pas d'inscription en libre-service : /register est une page statique qui
                explique comment demander l'accès (même principe que TeamOff). */}
            <Link
              to="/register"
              className="group inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg sm:gap-2 sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Accès de test</span>
              <span className="hidden sm:inline">Demander un accès de test</span>
              <ArrowRight size={15} className="hidden transition-transform group-hover:translate-x-0.5 sm:block" />
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-xs font-medium leading-5 text-amber-950 sm:text-sm">
        Projet personnel non commercial · en phase pilote à La Possession (97419).{' '}
        <Link to="/legal/confidentialite" className="font-bold underline underline-offset-2">
          En savoir plus
        </Link>
      </div>

      <main>
        <section className="relative isolate bg-gradient-to-br from-slate-50 via-white to-blue-50/80">
          <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-0 -z-10 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:py-24">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3.5 py-2 text-xs font-bold tracking-[0.12em] text-primary shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LE SMQ QUI FAIT AVANCER VOTRE QUALITÉ
              </span>
              <h1 className="mt-6 max-w-2xl text-[2.65rem] font-extrabold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">
                Votre qualité,
                <span className="block text-primary">enfin sous contrôle.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Documents, audits, non-conformités et actions : rassemblez votre système qualité dans un espace clair, conçu pour le piloter au quotidien.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-primary px-7 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 transition duration-200 hover:-translate-y-1 hover:bg-primary-700 hover:shadow-2xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                >
                  Demander un accès de test
                  <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#fonctionnalites"
                  className="inline-flex min-h-14 items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:bg-white hover:text-primary"
                >
                  Découvrir la plateforme
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-500">Projet personnel non commercial · accès pilote sur demande</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200/80 pt-6 text-sm font-medium text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Tout votre SMQ au même endroit
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={17} className="text-primary" />
                  Données cloisonnées
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-200/70 via-white to-indigo-200/70 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-primary/10 sm:rounded-3xl sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                      <ClipboardCheck size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Espace qualité</p>
                      <p className="mt-0.5 text-xs text-slate-500">Votre activité en un coup d’œil</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    À jour
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Documents</span>
                      <FileText size={16} className="text-primary" />
                    </div>
                    <p className="mt-3 text-xl font-bold text-slate-900">Maîtrisés</p>
                    <p className="mt-1 text-xs text-emerald-700">Versions & approbations</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Actions</span>
                      <ClipboardList size={16} className="text-amber-600" />
                    </div>
                    <p className="mt-3 text-xl font-bold text-slate-900">Suivies</p>
                    <p className="mt-1 text-xs text-slate-500">De l’ouverture à la clôture</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Prochaines échéances</p>
                    <CalendarClock size={17} className="text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                        <ClipboardCheck size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">Audit interne</span>
                      <span className="text-xs font-medium text-slate-500">Planifié</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Check size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">Revue documentaire</span>
                      <span className="text-xs font-medium text-slate-500">À vérifier</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <GraduationCap size={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">Formation qualité</span>
                      <span className="text-xs font-medium text-slate-500">À renouveler</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Un espace par entreprise</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Vos données restent cloisonnées</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ia-photos" className="scroll-mt-8 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-primary">
                <Sparkles size={14} />
                DES NOUVEAUTÉS QUI SERVENT LE TERRAIN
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Moins de saisie. Plus d’action.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                L’intelligence artificielle vous aide à avancer, et vos équipes gardent leurs preuves à portée de main.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="relative isolate overflow-hidden rounded-3xl bg-primary p-7 text-white shadow-xl shadow-primary/15 sm:p-9">
                <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_0_28px_rgba(255,255,255,0.025)]" />
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-100 ring-1 ring-white/15">
                  <Sparkles size={23} />
                </span>
                <p className="mt-7 text-xs font-bold tracking-[0.15em] text-blue-200">L’IA, À VOTRE SERVICE</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  De bonnes pistes pour passer à l’action.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                  Obtenez des propositions pour vos procédures, vos risques, vos plans d’action et vos démarches HACCP. Vous les relisez, les adaptez et gardez la décision.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {['Procédures', 'CAPA & risques', 'HACCP', 'Diagnostic'].map((label) => (
                    <span key={label} className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/90">
                      {label}
                    </span>
                  ))}
                </div>
              </article>

              <article className="relative isolate overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-7 shadow-lg shadow-slate-900/5 sm:p-9">
                <div className="pointer-events-none absolute -bottom-20 -right-10 -z-10 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl" />
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-blue-100">
                  <Camera size={23} />
                </span>
                <p className="mt-7 text-xs font-bold tracking-[0.15em] text-primary">LA QUALITÉ, SUR LE TERRAIN</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Une photo vaut mieux qu’un long compte rendu.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  Photographiez une preuve depuis votre mobile ou ajoutez une image à un dossier. Elle est stockée dans le Drive de votre entreprise et peut accompagner vos exports PDF ou Word.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-800">
                  <ShieldCheck size={15} />
                  Des preuves liées à vos dossiers qualité
                </div>
              </article>
            </div>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              Les fonctions d’assistance IA dépendent des accès configurés pour votre entreprise.
            </p>
          </div>
        </section>

        <section id="fonctionnalites" className="scroll-mt-8 border-y border-slate-200/70 bg-slate-50/80">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold tracking-[0.16em] text-primary">UNE VISION COMPLÈTE</span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Tous vos outils qualité, un seul endroit
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Les processus essentiels de votre SMQ réunis dans un espace simple à piloter.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                    <Icon size={20} />
                  </span>
                  <p className="mt-5 font-semibold text-slate-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="equipe" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-[0.16em] text-primary">CONÇU POUR TRAVAILLER ENSEMBLE</span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Pensé pour une équipe qualité
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {DIFFERENTIATORS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-primary">
          <div className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full border-[1px] border-white/10 bg-white/[0.03] shadow-[0_0_0_40px_rgba(255,255,255,0.025),0_0_0_80px_rgba(255,255,255,0.02)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="text-xs font-bold tracking-[0.16em] text-blue-200">PASSEZ À L’ACTION</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Envie de découvrir le pilote ?
              </h2>
              <p className="mt-4 flex items-center gap-2 text-sm text-white/80">
                <ShieldCheck size={17} className="shrink-0" />
                Projet personnel non commercial, exploité depuis La Possession (97419).
              </p>
            </div>
            <Link
              to="/register"
              className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-white px-7 py-4 text-base font-bold text-primary shadow-xl transition duration-200 hover:-translate-y-1 hover:bg-blue-50 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:w-auto"
            >
              Demander un accès de test
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 QMS SaaS</span>
          <div className="flex gap-4">
            <Link to="/legal/cgu" className="hover:text-slate-600">
              CGU
            </Link>
            <Link to="/legal/confidentialite" className="hover:text-slate-600">
              Confidentialité
            </Link>
            <Link to="/legal/mentions-legales" className="hover:text-slate-600">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
