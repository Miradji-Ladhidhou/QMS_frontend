import { ArrowLeft, ChevronRight, Folder, Home, MapPin } from 'lucide-react';

// Fil d'Ariane et boutons de navigation dans l'arborescence des dossiers.
// Permet de voir clairement où on se trouve, de remonter d'un niveau (Retour au dossier parent)
// et d'accéder directement à la racine ou à n'importe quel dossier parent via des boutons lisibles.
export default function FolderBreadcrumb({ breadcrumb = [], onNavigate, rootLabel = 'Tous les dossiers' }) {
  const isInsideFolder = breadcrumb.length > 0;
  // Le dossier parent immédiat pour le bouton "Retour"
  const parentFolder = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;

  return (
    <nav
      aria-label="Navigation dans les dossiers"
      className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5 shadow-xs"
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <MapPin size={13} className="text-primary" />
        Emplacement
      </span>
      <span className="h-5 w-px bg-slate-200" aria-hidden="true" />

      {/* Bouton de retour rapide vers le niveau parent lorsque l'on est dans un dossier */}
      {isInsideFolder && (
        <button
          type="button"
          onClick={() => onNavigate(parentFolder ? parentFolder.id : null)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200"
          title={parentFolder ? `Remonter à « ${parentFolder.name} »` : `Remonter à « ${rootLabel} »`}
        >
          <ArrowLeft size={14} className="text-slate-600" />
          <span className="hidden sm:inline">Dossier parent</span>
          <span className="sm:hidden">Retour</span>
        </button>
      )}

      {isInsideFolder && <span className="h-5 w-px bg-slate-200" aria-hidden="true" />}

      {/* Liste du fil d'Ariane avec boutons bien découpés */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {/* Bouton Racine */}
        <button
          type="button"
          onClick={() => onNavigate(null)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
            breadcrumb.length === 0
              ? 'border border-primary/25 bg-primary/10 font-semibold text-primary shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Home size={13} className={breadcrumb.length === 0 ? 'text-primary' : 'text-slate-400'} />
          <span>{rootLabel}</span>
        </button>

        {/* Chaque ancêtre dans le chemin */}
        {breadcrumb.map((folder, i) => {
          const isCurrent = i === breadcrumb.length - 1;
          return (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onNavigate(folder.id)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                  isCurrent
                    ? 'border border-primary/30 bg-primary/10 font-semibold text-primary shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={folder.name}
              >
                <Folder
                  size={13}
                  className={isCurrent ? 'fill-primary/20 text-primary' : 'text-slate-400'}
                />
                <span className="max-w-[140px] truncate sm:max-w-[200px]">{folder.name}</span>
              </button>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
