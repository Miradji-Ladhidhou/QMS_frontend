import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';

const DEFAULT_COLOR = '#1F3864';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', color: DEFAULT_COLOR });
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch {
      setError('Impossible de charger les catégories.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function startCreate() {
    setEditingId('new');
    setForm({ name: '', color: DEFAULT_COLOR });
  }

  function startEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, color: category.color || DEFAULT_COLOR });
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
        const { data } = await api.post('/categories', form);
        setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const { data } = await api.put(`/categories/${editingId}`, form);
        setCategories((prev) => prev.map((category) => (category.id === editingId ? data : category)));
      }
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la catégorie.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ?`)) return;

    try {
      await api.delete(`/categories/${category.id}`);
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
    } catch {
      setError('Impossible de supprimer cette catégorie.');
    }
  }

  function renderForm(onSubmit) {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Catégories de documents</h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus size={16} />
            Nouvelle catégorie
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {editingId === 'new' && (
        <div className="mt-4 rounded-md border border-slate-200 p-4">{renderForm(handleSubmit)}</div>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucune catégorie pour l'instant.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {categories.map((category) =>
            editingId === category.id ? (
              <li key={category.id} className="py-3">
                {renderForm(handleSubmit)}
              </li>
            ) : (
              <li key={category.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color || '#94A3B8' }}
                  />
                  <span className="text-sm font-medium text-slate-800">{category.name}</span>
                </div>
                <div className="flex gap-1">
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
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
