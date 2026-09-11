import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Folder, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import FolderBreadcrumb from './FolderBreadcrumb.jsx';
import CategoryPermissionsPanel from './CategoryPermissionsPanel.jsx';

const DEFAULT_COLOR = '#1F3864';
const DEFAULT_FORM = { name: '', color: DEFAULT_COLOR, is_restricted: false };

// Gestion complète des dossiers (catégories) d'un module, affichée directement dans la page
// concernée via ManageCategoriesModal — remplace les anciens onglets Paramètres > Catégories.
// Un seul composant paramétré : `baseUrl` = '/module-categories' (générique, avec
// `resourceType`) ou '/categories' (Documents). Les deux back-ends partagent exactement les
// mêmes verbes (GET avec parent_id / breadcrumb, POST / PUT / DELETE + /:id/permissions).
// Dossiers imbriqués (arbitrairement profonds, comme Kpis.jsx) : useFolderNavigation gère la
// navigation dans l'arbre, ce panneau n'affiche jamais que le niveau actuellement ouvert —
// "Nouveau dossier" y crée systématiquement un enfant, jamais un choix de parent séparé (même
// principe que FolderFormModal dans Kpis.jsx).
// CAPA et réclamations ont une visibilité cloisonnée par propriétaire (voir
// backend/services/ownershipVisibility.js) : un dossier NON restreint ne rend plus rien
// visible par défaut, contrairement aux autres modules — chacun n'y voit déjà que ce qu'il a
// créé/assigné/partagé. Le choix "ouvert" n'a donc plus aucun effet distinct de "restreint
// sans permission accordée" : on retire la bascule et chaque dossier de ces deux modules est
// systématiquement un groupe de permission, jamais un simple rangement sans conséquence.
export const ALWAYS_RESTRICTED_RESOURCE_TYPES = ['capa', 'complaint'];

export default function CategoryManagerPanel({ baseUrl, resourceType, isAdmin, onChanged }) {
  const alwaysRestricted = ALWAYS_RESTRICTED_RESOURCE_TYPES.includes(resourceType);
  const { currentFolderId, navigateToFolder, breadcrumb, folders: categories, foldersLoading: loading, reloadFolders } =
    useFolderNavigation({ baseUrl, resourceType });
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM, is_restricted: alwaysRestricted });
  const [saving, setSaving] = useState(false);
  const [expandedPermissionsId, setExpandedPermissionsId] = useState(null);

  useEffect(() => {
    setEditingId(null);
    setExpandedPermissionsId(null);
  }, [currentFolderId]);

  function startCreate() {
    setEditingId('new');
    setForm({ ...DEFAULT_FORM, is_restricted: alwaysRestricted });
  }

  function startEdit(category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      color: category.color || DEFAULT_COLOR,
      is_restricted: alwaysRestricted ? true : category.is_restricted || false,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingId === 'new') {
        const payload = { ...form, parent_id: currentFolderId || undefined };
        if (resourceType) payload.resource_type = resourceType;
        await api.post(baseUrl, payload);
      } else {
        await api.put(`${baseUrl}/${editingId}`, form);
      }
      await reloadFolders();
      setEditingId(null);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le dossier.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`Supprimer le dossier "${category.name}" ?`)) return;

    try {
      await api.delete(`${baseUrl}/${category.id}`);
      await reloadFolders();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ce dossier.');
    }
  }

  function renderForm(onSubmit) {
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
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
              checked={form.is_restricted}
              onChange={(e) => setForm((prev) => ({ ...prev, is_restricted: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Dossier restreint (accès limité aux utilisateurs/groupes autorisés)
          </label>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {editingId === 'new' ? 'Créer' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Racine" />

      {isAdmin && editingId === null && (
        <button
          type="button"
          onClick={startCreate}
          className="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus size={16} />
          Nouveau dossier
        </button>
      )}

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {editingId === 'new' && <div className="mt-4 rounded-md border border-slate-200 p-4">{renderForm(handleSubmit)}</div>}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucun dossier ici pour l'instant.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {categories.map((category) =>
            editingId === category.id ? (
              <li key={category.id} className="py-3">
                {renderForm(handleSubmit)}
              </li>
            ) : (
              <li key={category.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigateToFolder(category.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Folder size={16} className="shrink-0 text-primary" />
                    <span className="text-sm font-medium text-slate-800">{category.name}</span>
                    {category.is_restricted && !alwaysRestricted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPermissionsId(expandedPermissionsId === category.id ? null : category.id);
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                      >
                        <Lock size={12} />
                        Restreint
                        {expandedPermissionsId === category.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </button>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        aria-label="Modifier"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        aria-label="Supprimer"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {category.is_restricted && expandedPermissionsId === category.id && (
                  <div className="mt-3">
                    <CategoryPermissionsPanel categoryId={category.id} baseUrl={baseUrl} isAdmin={isAdmin} />
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
