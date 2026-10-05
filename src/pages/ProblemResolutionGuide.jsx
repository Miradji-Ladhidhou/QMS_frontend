import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  MessageSquareWarning,
  PackageX,
  Search,
  ShieldAlert,
  Siren,
  Smile,
  Thermometer,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProblemRecommendations, getRelevanceLabel } from '../lib/problemGuide.js';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';
import { useTenant } from '../lib/useTenant.js';

const MODULE_ICONS = {
  complaints: MessageSquareWarning,
  'customer-satisfaction': Smile,
  'nonconforming-outputs': PackageX,
  capas: Wrench,
  qqoqccp: HelpCircle,
  suppliers: Truck,
  accidents: Siren,
  risks: ShieldAlert,
  trainings: GraduationCap,
  employees: Users,
  procedures: FileCheck,
  documents: FileText,
  planning: CalendarClock,
  kpis: BarChart3,
  pdca: ClipboardList,
  audits: BookOpen,
  haccp: Thermometer,
};

const EXAMPLES = [
  { label: 'Retard de livraison', query: 'Nous avons beaucoup de retards de livraison' },
  { label: 'Réclamation', query: 'J’ai reçu une réclamation client' },
  { label: 'Non-conformité', query: 'Un produit est non conforme' },
  { label: 'Risque', query: 'Nous avons identifié un risque' },
  { label: 'Formation', query: 'Un salarié doit être formé' },
];

export default function ProblemResolutionGuide() {
  const [query, setQuery] = useState('');
  const tenant = useTenant();
  const visibleMenuKeys = useMenuVisibility();
  const hasAccessData = Boolean(tenant) && Array.isArray(visibleMenuKeys);
  const recommendations = hasAccessData
    ? getProblemRecommendations(query, { appModules: tenant.app_modules, visibleMenuKeys })
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lightbulb size={28} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Comment puis-je vous aider ?</h1>
        <p className="mt-2 text-slate-600">
          Décrivez votre problème pour découvrir les modules les plus adaptés.
        </p>
      </header>

      <section aria-label="Rechercher une solution" className="mx-auto max-w-3xl">
        <label htmlFor="problem-search" className="sr-only">Décrivez votre problème</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="shrink-0 text-slate-500" size={22} aria-hidden="true" />
          <input
            id="problem-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Décrivez votre problème ou recherchez un sujet..."
            className="min-h-16 min-w-0 w-full border-0 bg-transparent text-base text-slate-900 outline-none focus:ring-0"
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Exemples de problèmes">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => setQuery(example.query)}
              className="min-h-11 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-primary hover:text-primary"
            >
              {example.label}
            </button>
          ))}
        </div>
      </section>

      {!hasAccessData ? (
        <p role="status" className="text-center text-sm text-slate-600">
          Chargement des modules et de vos accès...
        </p>
      ) : query.trim() && recommendations.length > 0 ? (
        <section aria-live="polite" aria-label="Modules recommandés" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Voici les modules qui peuvent vous aider</h2>
            <p className="mt-1 text-sm text-slate-600">Les résultats tiennent compte des modules accessibles dans votre espace.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {recommendations.map((module) => {
              const Icon = MODULE_ICONS[module.id] || AlertTriangle;
              return (
                <article key={module.id} className="flex flex-col rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{module.label}</h3>
                      <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        Pertinence : {getRelevanceLabel(module.score)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{module.description}</p>
                  <Link
                    to={module.path}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    Ouvrir {module.label}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : query.trim() ? (
        <p aria-live="polite" className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-slate-600">
          Aucun module accessible ne correspond à cette recherche. Essayez avec d’autres mots.
        </p>
      ) : null}
    </div>
  );
}
