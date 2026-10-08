import { useState } from 'react';
import { ArrowUpRight, Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';

// Tuile de dossier cliquable — ergonomie renforcée avec icône dossier colorée,
// badge interactif d'ouverture et boutons bien contrastés.
export default function FolderTile({ folder, canManage, onOpen, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-1 flex-col items-start gap-2.5 text-left focus:outline-none"
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            <Folder size={22} className="transition-transform group-hover:scale-110" />
          </div>
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors group-hover:bg-primary/15 group-hover:text-primary">
            <span>Ouvrir</span>
            <ArrowUpRight size={12} />
          </span>
        </div>
        <span className="line-clamp-2 break-words text-sm font-semibold text-slate-900 group-hover:text-primary">
          {folder.name}
        </span>
      </button>

      {canManage && (onRename || onDelete) && (
        <div className="relative mt-2 self-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            aria-label="Actions sur le dossier"
            aria-expanded={menuOpen}
            title="Options du dossier"
            className="flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <MoreVertical size={16} />
            Options
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                {onRename && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRename();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={13} className="text-slate-500" />
                    Renommer
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} className="text-red-500" />
                    Supprimer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
