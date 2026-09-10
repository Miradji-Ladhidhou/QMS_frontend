import { X } from 'lucide-react';
import CategoryManagerPanel from './CategoryManagerPanel.jsx';

// Modale « Gérer les dossiers » ouverte depuis chaque page de module (et depuis Documents) —
// remplace les anciens onglets Paramètres > Catégories. Voir CategoryManagerPanel pour les
// props `baseUrl` / `resourceType`.
export default function ManageCategoriesModal({ baseUrl, resourceType, isAdmin, onClose, onChanged }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Gérer les dossiers</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <CategoryManagerPanel baseUrl={baseUrl} resourceType={resourceType} isAdmin={isAdmin} onChanged={onChanged} />
      </div>
    </div>
  );
}
