import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { PAGE_GUIDES } from '../lib/pageGuides.jsx';

// Encadré d'aide « à quoi sert cette page ? » affiché sous le titre. Visible par défaut,
// masquable — l'état masqué est retenu par page dans le navigateur (localStorage), jamais
// partagé. `id` correspond à une clé de PAGE_GUIDES ; inconnu → rien n'est rendu.
export default function PageGuide({ id }) {
  const guide = PAGE_GUIDES[id];
  const storageKey = `pageGuide:hidden:${id}`;

  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  if (!guide) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* stockage indisponible : on masque juste pour cette session */
    }
  }

  function show() {
    setHidden(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={show}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
      >
        <Info size={13} />
        Afficher l'aide
      </button>
    );
  }

  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
      <Info size={16} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 [&_strong]:font-medium [&_strong]:text-slate-800">
        {guide.title && <p className="font-medium text-slate-800">{guide.title}</p>}
        <div className="mt-0.5 space-y-1">{guide.body}</div>
        {guide.example && (
          <p className="mt-1.5 border-l-2 border-slate-300 pl-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Exemple — </span>
            {guide.example}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={hide}
        aria-label="Masquer l'aide"
        className="-m-1 shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
      >
        <X size={15} />
      </button>
    </div>
  );
}
