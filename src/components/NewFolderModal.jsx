import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';
import { ALWAYS_RESTRICTED_RESOURCE_TYPES } from './CategoryManagerPanel.jsx';

const DEFAULT_COLOR = '#1F3864';

// Création rapide d'un dossier depuis la tuile pointillée "Nouveau dossier" de la page de
// module elle-même — même geste que Kpis.jsx (le seul module à l'avoir eu jusqu'ici), pour ne
// pas obliger à ouvrir "Gérer les dossiers" juste pour créer un premier dossier. `parentId` =
// toujours le dossier actuellement parcouru (jamais choisi ici) — même principe que
// FolderFormModal dans Kpis.jsx. Renommer/supprimer/gérer les permissions restent réservés à
// "Gérer les dossiers" (CategoryManagerPanel.jsx), pas dupliqués ici.
export default function NewFolderModal({ baseUrl, resourceType, parentId, onClose, onCreated }) {
  const alwaysRestricted = ALWAYS_RESTRICTED_RESOURCE_TYPES.includes(resourceType);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isRestricted, setIsRestricted] = useState(alwaysRestricted);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name, color, is_restricted: isRestricted, parent_id: parentId || undefined };
      if (resourceType) payload.resource_type = resourceType;
      const { data } = await api.post(baseUrl, payload);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer le dossier.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau dossier</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-16 rounded-md border border-slate-300"
              />
            </div>
          </div>

          {alwaysRestricted ? (
            <p className="text-xs text-slate-500">
              Chacun ne voit déjà que ce qu'il a créé, ce qui lui est assigné, ou ce qu'on lui a partagé. Ce dossier sert à
              donner l'accès à un groupe de personnes en plus de ça — choisis-les juste après l'avoir créé.
            </p>
          ) : (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Dossier restreint (accès limité aux utilisateurs/groupes autorisés)
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}
