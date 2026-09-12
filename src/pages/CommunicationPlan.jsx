import { useEffect, useMemo, useState } from 'react';
import { Folder, FolderCog, FolderInput, FolderPlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { COMMUNICATION_SCOPE_LABELS } from '../lib/communicationPlanLabels.js';
import CommunicationScopeBadge from '../components/CommunicationScopeBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import FolderTile from '../components/FolderTile.jsx';
import FolderBreadcrumb from '../components/FolderBreadcrumb.jsx';
import FolderPickerModal from '../components/FolderPickerModal.jsx';
import NewFolderModal from '../components/NewFolderModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import PageGuide from '../components/PageGuide.jsx';

const CATEGORIES_BASE_URL = '/module-categories';
const PLAN_RESOURCE_TYPE = 'communication_plan';

const PLAN_SORT_OPTIONS = [
  { key: 'subject', label: 'objet' },
  { key: 'scope', label: 'portée' },
  { key: 'audience', label: 'public' },
];

function getPlanSortValue(item, key) {
  return item[key];
}

// Pas de notion de visibilité personnelle sur ce module (page réservée aux admins) : un simple
// bouton "Dossier" ouvrant FolderPickerModal, sans le bascule "Tout le monde"/"Uniquement moi"
// de CategoryVisibilityField.
function ItemModal({ item, users, onClose, onSaved }) {
  const isNew = !item;
  const [form, setForm] = useState({
    subject: item?.subject || '',
    audience: item?.audience || '',
    scope: item?.scope || 'internal',
    timing: item?.timing || '',
    channel: item?.channel || '',
    responsible_user_id: item?.responsible_user_id || '',
    notes: item?.notes || '',
    category_id: item?.category_id || '',
    category_name: item?.category?.name || '',
    is_active: item?.is_active ?? true,
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      subject: form.subject,
      audience: form.audience,
      scope: form.scope,
      timing: form.timing,
      channel: form.channel,
      responsible_user_id: form.responsible_user_id || (isNew ? undefined : null),
      notes: form.notes || (isNew ? undefined : null),
      category_id: form.category_id || (isNew ? undefined : null),
    };
    if (!isNew) payload.is_active = form.is_active;

    // onSaved() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = isNew
        ? await api.post('/communication-plan', payload)
        : await api.patch(`/communication-plan/${item.id}`, payload);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la ligne.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isNew ? 'Nouvelle ligne du plan' : 'Modifier la ligne'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet — quoi communiquer</label>
            <input
              type="text"
              required
              placeholder="Ex : Politique qualité, Résultats d'audit interne..."
              value={form.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Public — à qui</label>
              <input
                type="text"
                required
                placeholder="Ex : Tout le personnel, Clients..."
                value={form.audience}
                onChange={(e) => updateField('audience', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Portée</label>
              <select
                value={form.scope}
                onChange={(e) => updateField('scope', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(COMMUNICATION_SCOPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence / moment — quand</label>
              <input
                type="text"
                required
                placeholder="Ex : Annuelle, À chaque révision..."
                value={form.timing}
                onChange={(e) => updateField('timing', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Canal — comment</label>
              <input
                type="text"
                required
                placeholder="Ex : Affichage + réunion, E-mail, Intranet..."
                value={form.channel}
                onChange={(e) => updateField('channel', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Responsable — qui communique</label>
            <select
              value={form.responsible_user_id}
              onChange={(e) => updateField('responsible_user_id', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">À désigner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dossier</label>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="flex w-full items-center gap-2 rounded-md border border-slate-300 px-3 py-2.5 text-left text-base text-slate-700 hover:bg-slate-50"
            >
              <Folder size={16} className="shrink-0 text-primary" />
              <span className="truncate">{form.category_name || 'Aucun dossier'}</span>
            </button>
            {isPickerOpen && (
              <FolderPickerModal
                baseUrl={CATEGORIES_BASE_URL}
                resourceType={PLAN_RESOURCE_TYPE}
                initialFolderId={form.category_id || null}
                subtitle="Dossier de rattachement"
                onClose={() => setIsPickerOpen(false)}
                onSelect={(folderId, folderName) => {
                  updateField('category_id', folderId || '');
                  updateField('category_name', folderName || '');
                  setIsPickerOpen(false);
                }}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Précisions (optionnel)</label>
            <AutoTextarea
              rows={2}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {!isNew && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Ligne active
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : isNew ? 'Créer la ligne' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ItemCard({ item, isAdmin, onEdit, onDelete, onMove }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${item.is_active ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{item.subject}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CommunicationScopeBadge scope={item.scope} />
            {!item.is_active && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              aria-label="Modifier"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              aria-label="Supprimer"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Public</dt>
          <dd className="text-slate-800">{item.audience}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Fréquence</dt>
          <dd className="text-slate-800">{item.timing}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Canal</dt>
          <dd className="text-slate-800">{item.channel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Responsable</dt>
          <dd className="text-slate-800">{item.responsible?.full_name || '—'}</dd>
        </div>
      </dl>

      {item.notes && <p className="mt-2 text-xs text-slate-500">{item.notes}</p>}

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(item)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderInput size={12} />
            Déplacer
          </button>
        </div>
      )}
    </div>
  );
}

export default function CommunicationPlan() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalItem, setModalItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: PLAN_RESOURCE_TYPE });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, usersRes] = await Promise.all([api.get('/communication-plan'), api.get('/users')]);
      setItems(itemsRes.data);
      setUsers(usersRes.data);
    } catch {
      setError('Impossible de charger le plan de communication.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleMoveItem(folderId) {
    const item = movingItem;
    setMovingItem(null);
    try {
      const { data } = await api.patch(`/communication-plan/${item.id}`, { category_id: folderId || null });
      setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de changer le dossier de cette ligne.');
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Supprimer définitivement la ligne "${item.subject}" ?`)) return;
    try {
      await api.delete(`/communication-plan/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette ligne.');
    }
  }

  function handleSaved(saved) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved];
    });
    setModalOpen(false);
  }

  function openNew() {
    setModalItem(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setModalItem(item);
    setModalOpen(true);
  }

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (scopeFilter && item.scope !== scopeFilter) return false;
      if (!showInactive && !item.is_active) return false;
      if (!query) return true;
      return (
        item.subject.toLowerCase().includes(query) ||
        item.audience.toLowerCase().includes(query) ||
        item.channel.toLowerCase().includes(query)
      );
    });
  }, [items, searchText, scopeFilter, showInactive]);

  const { sorted, sortKey, direction, setSortKey, toggleSort } = useSort(filteredItems, getPlanSortValue, 'scope', 'asc');

  // sorted reste la liste COMPLÈTE (recherche + filtres + tri) : naviguer dans un dossier ne
  // fait que choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste
  // déjà chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) =
  // category_id null.
  const currentFolderItems = useMemo(
    () => sorted.filter((item) => (item.category_id || null) === currentFolderId),
    [sorted, currentFolderId]
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Plan de communication</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Ajouter une ligne
          </button>
        )}
      </div>

      <PageGuide id="communication-plan" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par objet, public ou canal..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Toutes les portées</option>
          {Object.entries(COMMUNICATION_SCOPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowInactive((prev) => !prev)}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            showInactive ? 'border-slate-300 text-slate-600 hover:bg-slate-50' : 'border-primary bg-primary/5 text-primary'
          }`}
        >
          {showInactive ? 'Masquer les inactives' : 'Afficher les inactives'}
        </button>

        <SortSelect
          options={PLAN_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Tout le plan" />

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsManageCategoriesOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderCog size={16} />
            Gérer les dossiers
          </button>
        )}
      </div>

      {loading || foldersLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          {(folders.length > 0 || isAdmin) && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {folders.map((folder) => (
                <FolderTile key={folder.id} folder={folder} canManage={false} onOpen={() => navigateToFolder(folder.id)} />
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <FolderPlus size={26} />
                  <span className="text-sm font-medium">Nouveau dossier</span>
                </button>
              )}
            </div>
          )}

          {items.length === 0 && folders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-base font-medium text-slate-700">Aucune ligne dans le plan de communication</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openNew}
                  className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                >
                  <Plus size={18} />
                  Ajouter la première ligne
                </button>
              )}
            </div>
          ) : sorted.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">Aucune ligne ne correspond aux filtres.</p>
          ) : currentFolderItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucune ligne directement dans ce dossier.' : 'Aucune ligne sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {currentFolderItems.map((item) => (
                <ItemCard key={item.id} item={item} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} onMove={setMovingItem} />
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && <ItemModal item={modalItem} users={users} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={PLAN_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={PLAN_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingItem && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={PLAN_RESOURCE_TYPE}
          initialFolderId={movingItem.category_id || null}
          title="Déplacer"
          subtitle={movingItem.subject}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingItem(null)}
          onSelect={handleMoveItem}
        />
      )}
    </div>
  );
}
