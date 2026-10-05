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
  ShieldAlert,
  Siren,
  Smile,
  Thermometer,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRelevanceLabel } from '../lib/problemGuide.js';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';
import { useTenant } from '../lib/useTenant.js';
import { getSectorProblems, getSectorRecommendations, PROBLEM_SECTORS } from '../lib/problemSectorCatalog.js';
import { getSectorProblemGuide } from '../lib/problemSectorGuides.js';

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

export default function ProblemResolutionGuide() {
  const [sectorId, setSectorId] = useState('');
  const [problemId, setProblemId] = useState('');
  const tenant = useTenant();
  const visibleMenuKeys = useMenuVisibility();
  const hasAccessData = Boolean(tenant) && Array.isArray(visibleMenuKeys);
  const problems = getSectorProblems(sectorId);
  const recommendations = hasAccessData
    ? getSectorRecommendations(sectorId, problemId, { appModules: tenant.app_modules, visibleMenuKeys })
    : [];
  const guide = hasAccessData
    ? getSectorProblemGuide(sectorId, problemId, { appModules: tenant.app_modules, visibleMenuKeys })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lightbulb size={28} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Comment puis-je vous aider ?</h1>
        <p className="mt-2 text-slate-600">
          Sélectionnez votre secteur d’activité et votre problème pour découvrir les modules les plus adaptés.
        </p>
      </header>

      <section aria-label="Choisir une situation" className="mx-auto grid max-w-3xl gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="problem-sector" className="mb-2 block text-sm font-semibold text-slate-700">Secteur d’activité</label>
          <select
            id="problem-sector"
            value={sectorId}
            onChange={(event) => { setSectorId(event.target.value); setProblemId(''); }}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900"
          >
            <option value="">Sélectionnez votre secteur</option>
            {PROBLEM_SECTORS.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="problem-type" className="mb-2 block text-sm font-semibold text-slate-700">Type de problème</label>
          <select
            id="problem-type"
            value={problemId}
            disabled={!sectorId}
            onChange={(event) => setProblemId(event.target.value)}
            aria-describedby={!sectorId ? 'problem-type-help' : undefined}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 disabled:bg-slate-100"
          >
            <option value="">Sélectionnez un problème</option>
            {problems.map((problem) => <option key={problem.id} value={problem.id}>{problem.label}</option>)}
          </select>
          {!sectorId && <p id="problem-type-help" className="mt-2 text-sm text-slate-600">Choisissez d’abord un secteur d’activité.</p>}
        </div>
      </section>

      {guide && (
        <section aria-label="Guide personnalisé" aria-live="polite" className="rounded-xl border border-slate-300 bg-white p-5">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen size={22} aria-hidden="true" />
            <h2 className="text-lg font-semibold">Votre guide pour cette situation</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{guide.introduction}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700"><strong>À réunir :</strong> {guide.facts}.</p>
          {guide.notice && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">{guide.notice}</p>}
          {guide.steps.length > 0 && (
            <ol className="mt-4 space-y-3">
              {guide.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                    <Link to={step.path} className="inline-flex min-h-11 items-center py-2 text-sm font-semibold text-primary hover:underline">Ouvrir {step.label}</Link>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {!hasAccessData ? (
        <p role="status" className="text-center text-sm text-slate-600">
          Chargement des modules et de vos accès...
        </p>
      ) : problemId && recommendations.length > 0 ? (
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
      ) : problemId ? (
        <p aria-live="polite" className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-slate-600">
          Aucun module adapté à ce problème n’est accessible dans votre espace. Contactez votre administrateur pour vérifier vos accès.
        </p>
      ) : null}
    </div>
  );
}
