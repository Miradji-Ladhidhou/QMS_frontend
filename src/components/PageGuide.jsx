import { useState } from 'react';
import { ChevronDown, Info, X } from 'lucide-react';
import { PAGE_GUIDES } from '../lib/pageGuides.jsx';

// Encadré d'aide « à quoi sert cette page ? » affiché sous le titre. Visible par défaut,
// masquable — l'état masqué est retenu par page dans le navigateur (localStorage), jamais
// partagé. `id` correspond à une clé de PAGE_GUIDES ; inconnu → rien n'est rendu. Le détail long
// (`guide.more`) reste replié derrière « En savoir plus » pour ne pas repousser le contenu hors de
// l'écran sur mobile.
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

  const [expanded, setExpanded] = useState(false);

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
        className="mt-2 inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-slate-400 sm:min-h-0 transition-colors hover:text-slate-600"
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
        {guide.more && expanded && <div className="mt-1 space-y-1">{guide.more}</div>}
        {guide.more && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="-ml-1 mt-1 inline-flex min-h-[40px] items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline sm:min-h-0"
          >
            {expanded ? 'Réduire' : 'En savoir plus'}
            <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
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
        className="-m-2.5 shrink-0 rounded p-2.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 sm:-m-1 sm:p-1"
      >
        <X size={15} />
      </button>
    </div>
  );
}
