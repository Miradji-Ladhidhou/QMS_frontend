import { useState } from 'react';
import { Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';

// Tuile de dossier cliquable — extraite de Kpis.jsx (seul module à avoir eu des dossiers
// imbriqués jusqu'ici), réutilisée tel quelle par tous les modules à dossiers désormais
// imbriqués. onRename/onDelete restent optionnels (non fournis => pas de menu kebab) pour les
// usages en lecture seule (ex. sélecteur de destination dans FolderPickerModal.jsx).
export default function FolderTile({ folder, canManage, onOpen, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md">
      <button type="button" onClick={onOpen} className="flex w-full flex-col items-start gap-2 text-left">
        <Folder size={26} className="text-primary" />
        <span className="line-clamp-2 break-words pr-6 text-sm font-medium text-slate-900">{folder.name}</span>
      </button>

      {canManage && (onRename || onDelete) && (
        <div className="absolute right-2 top-2">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Actions"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                {onRename && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRename();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} />
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
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
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
