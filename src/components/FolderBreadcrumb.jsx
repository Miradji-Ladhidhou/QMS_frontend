import { ChevronRight } from 'lucide-react';

// Fil d'Ariane de navigation dans une arborescence de dossiers — extrait de Kpis.jsx (seul
// module à avoir eu des dossiers imbriqués jusqu'ici), réutilisé tel quel par tous les modules
// à dossiers désormais imbriqués. `breadcrumb` = chaîne racine → dossier courant INCLUS (voir
// GET /:id/breadcrumb côté backend) ; le dernier élément (le dossier actuellement ouvert) est
// mis en gras plutôt que redondant avec un libellé "vous êtes ici" séparé. Fait aussi office
// de seule navigation "retour" : cliquer un ancêtre, ou `rootLabel`, y ramène directement —
// pas de bouton dédié.
export default function FolderBreadcrumb({ breadcrumb, onNavigate, rootLabel }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className={`rounded px-1 hover:text-primary hover:underline ${
          breadcrumb.length === 0 ? 'font-medium text-slate-900' : ''
        }`}
      >
        {rootLabel}
      </button>
      {breadcrumb.map((folder, i) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={14} className="shrink-0 text-slate-300" />
          <button
            type="button"
            onClick={() => onNavigate(folder.id)}
            className={`rounded px-1 hover:text-primary hover:underline ${
              i === breadcrumb.length - 1 ? 'font-medium text-slate-900' : ''
            }`}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </div>
  );
}
