import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
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
      <header className="relative z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-4 sm:flex-row sm:px-8">
          <img
            src="/brand/logo-horizontal.png"
            width={1200}
            height={360}
            className="h-auto w-48 sm:w-52"
            alt="QMS SaaS — Système de management de la qualité"
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Se connecter
            </Link>
            {/* Pas d'inscription en libre-service : /register est une page statique qui
                explique comment demander l'accès (même principe que TeamOff). */}
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              Demander un accès
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
          <div className="absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:py-28">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LE PILOTAGE QUALITÉ, SIMPLIFIÉ
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Toute votre démarche qualité,
                <span className="text-primary"> enfin réunie.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Documents, non-conformités, réclamations, audits, risques, fournisseurs, formations, indicateurs — sans
                tableurs éparpillés ni relances par email.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="group flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary-700"
              >
                Demander un accès
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                Se connecter
              </Link>
            </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Accès sur demande
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={17} className="text-primary" />
                  Données cloisonnées
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-200/50 via-white to-indigo-100/70 blur-xl" />
              <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-6">
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
              </div>
              <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Un espace par entreprise</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Vos données restent cloisonnées</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-slate-50/80">
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

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
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

        <section className="relative overflow-hidden bg-primary">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-14 sm:flex-row sm:items-center sm:px-8 sm:py-20">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Prêt à faire le tri dans votre qualité ?
              </h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                <CheckCircle2 size={16} />
                Accès sur demande — sans engagement.
              </p>
            </div>
            <Link
              to="/register"
              className="group flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-primary-50"
            >
              Demander un accès
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
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
          </div>
        </div>
      </footer>
    </div>
  );
}
