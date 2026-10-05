import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import ResourceSourceBadge from './ResourceSourceBadge.jsx';

const EMPTY_FORM = { label: '', source: '', url: '' };
const FIELD_CLASS = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm';

export default function UsefulLinksSettings() {
  const [catalog, setCatalog] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalog(null);
    setError('');
    setMessage('');
    setEditingIndex(null);
    setForm(EMPTY_FORM);
    api.get('/super-admin/resources')
      .then(({ data }) => {
        if (cancelled) return;
        setCatalog(data);
        setGroupId((current) => data.groups.some((group) => group.id === current) ? current : data.groups[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Impossible de charger le catalogue de liens.');
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const group = catalog?.groups.find((item) => item.id === groupId);

  function resetForm() {
    setEditingIndex(null);
    setForm(EMPTY_FORM);
  }

  async function publish(resources, successMessage) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const groups = catalog.groups.map((item) => item.id === groupId ? { ...item, resources } : item);
      const { data } = await api.put('/super-admin/resources', { groups, updated_at: catalog.updated_at });
      setCatalog(data);
      resetForm();
      setMessage(successMessage);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer les liens utiles.');
    } finally {
      setSaving(false);
    }
  }

  function saveLink(event) {
    event.preventDefault();
    const resources = [...group.resources];
    const resource = { label: form.label.trim(), source: form.source.trim(), url: form.url.trim() };
    if (editingIndex === null) resources.push(resource);
    else resources[editingIndex] = resource;
    publish(resources, editingIndex === null ? 'Lien ajouté et publié.' : 'Lien modifié et publié.');
  }

  function removeLink(index) {
    const resource = group.resources[index];
    if (!window.confirm(`Supprimer le lien « ${resource.label} » pour toutes les entreprises ?`)) return;
    publish(group.resources.filter((_, itemIndex) => itemIndex !== index), 'Lien supprimé du catalogue.');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Catalogue des liens utiles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Les changements sont publiés pour toutes les entreprises dès l’enregistrement. Privilégiez des pages en
          français et des sources fiables ; indiquez l’organisme ou le site source.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Le statut de la source est calculé depuis le domaine de l’adresse, indépendamment du nom saisi.
          Un nouveau domaine sera indiqué « Source non vérifiée » tant qu’il n’est pas référencé.
        </p>
        {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={() => setReloadKey((value) => value + 1)}
          className="mt-3 min-h-[40px] text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          Recharger le catalogue
        </button>
        {!catalog && !error && <p role="status" className="mt-3 text-sm text-slate-500">Chargement...</p>}
        {catalog && (
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Rubrique
            <select
              value={groupId}
              disabled={saving}
              onChange={(event) => {
                setGroupId(event.target.value);
                resetForm();
                setError('');
                setMessage('');
              }}
              className={FIELD_CLASS}
            >
              {catalog.groups.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
        )}
      </div>
      {group && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">{group.title} · {group.resources.length} lien(s)</h3>
            {group.resources.length === 0 && <p className="mt-3 text-sm text-slate-500">Aucun lien dans cette rubrique.</p>}
            <ul className="mt-3 divide-y divide-slate-100">
              {group.resources.map((resource, index) => (
                <li key={resource.url} className="py-3">
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    {resource.label}<ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                  </a>
                  <p className="mt-1 text-xs text-slate-500">{resource.source}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{resource.url}</p>
                  <ResourceSourceBadge url={resource.url} />
                  <div className="mt-2 flex gap-3">
                    <button type="button" disabled={saving} onClick={() => {
                      setEditingIndex(index);
                      setForm({ ...resource });
                      setError('');
                      setMessage('');
                    }} className="inline-flex min-h-[40px] items-center gap-1 text-sm text-primary disabled:opacity-60">
                      <Pencil size={14} /> Modifier
                    </button>
                    <button type="button" disabled={saving} onClick={() => removeLink(index)} className="inline-flex min-h-[40px] items-center gap-1 text-sm text-red-600 disabled:opacity-60">
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <form onSubmit={saveLink} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">{editingIndex === null ? 'Ajouter un lien' : 'Modifier le lien'}</h3>
            <fieldset disabled={saving} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Titre du lien
                <input required maxLength={200} value={form.label} onChange={(event) => setForm((value) => ({ ...value, label: event.target.value }))} className={FIELD_CLASS} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Source / organisme
                <input required maxLength={200} value={form.source} onChange={(event) => setForm((value) => ({ ...value, source: event.target.value }))} className={FIELD_CLASS} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Adresse HTTPS
                <input type="url" required maxLength={2048} pattern="https://.*" placeholder="https://..." value={form.url} onChange={(event) => setForm((value) => ({ ...value, url: event.target.value }))} className={FIELD_CLASS} />
              </label>
              {form.url.trim() && <ResourceSourceBadge url={form.url.trim()} />}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={editingIndex === null && group.resources.length >= 50} className="inline-flex min-h-[40px] items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                  <Plus size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer et publier'}
                </button>
                {editingIndex !== null && <button type="button" onClick={resetForm} className="min-h-[40px] text-sm text-slate-600 underline">Annuler</button>}
              </div>
            </fieldset>
            {group.resources.length >= 50 && <p className="text-xs text-amber-700">Maximum de 50 liens atteint pour cette rubrique.</p>}
          </form>
        </div>
      )}
    </div>
  );
}
