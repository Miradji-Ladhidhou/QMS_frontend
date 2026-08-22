import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
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
  Truck,
  Users,
  Users2,
} from 'lucide-react';
import AppLogo from '../components/AppLogo.jsx';

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <AppLogo className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold text-slate-900">
              QMS <span className="font-normal text-slate-400">SaaS</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary sm:px-4"
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:px-4"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              Système de management de la qualité
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Toute votre démarche qualité, enfin réunie.
            </h1>
            <p className="mt-5 text-base text-slate-600 sm:text-lg">
              Documents, non-conformités, réclamations, audits, risques, fournisseurs, formations, indicateurs — sans
              tableurs éparpillés ni relances par email.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Créer un compte gratuit
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Tous vos outils qualité, un seul endroit</h2>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary">
                    <Icon size={20} />
                  </span>
                  <p className="mt-4 font-medium text-slate-900">{title}</p>
                  <p className="mt-1.5 text-sm text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Pensé pour une équipe qualité</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {DIFFERENTIATORS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-100 bg-primary">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 sm:py-16">
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">Prêt à faire le tri dans votre qualité ?</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
                <CheckCircle2 size={16} />
                Aucune carte bancaire requise pour commencer.
              </p>
            </div>
            <Link
              to="/register"
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary-50"
            >
              Créer un compte gratuit
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
