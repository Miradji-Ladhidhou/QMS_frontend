import { BookOpen, ChevronDown } from 'lucide-react';
import { MODULE_QUICK_PROCEDURES } from '../lib/moduleQuickProcedures.js';

export default function ModuleQuickProcedure({ id }) {
  const procedure = MODULE_QUICK_PROCEDURES[id];
  if (!procedure) return null;

  return (
    <details className="mt-3 rounded-xl border border-primary-100 bg-white p-4">
      <summary className="flex min-h-[40px] cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
        <BookOpen size={18} className="shrink-0" />
        <span className="flex-1">{procedure.title}</span>
        <ChevronDown size={16} className="shrink-0" />
      </summary>
      <div className="mt-3 space-y-4 text-sm text-slate-700">
        <p>{procedure.intro}</p>
        <ol className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-primary">
          {procedure.steps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong> {step.detail}
            </li>
          ))}
        </ol>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Application dans le module</p>
          <p className="mt-1">{procedure.inTool}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed">
          <p className="font-semibold text-slate-800">Preuves à conserver</p>
          <p className="mt-1">{procedure.records}</p>
        </div>
      </div>
    </details>
  );
}
