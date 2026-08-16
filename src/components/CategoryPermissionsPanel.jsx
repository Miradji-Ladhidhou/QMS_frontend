import { useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';

const LEVELS = [
  { field: 'can_view', label: 'Voir' },
  { field: 'can_edit', label: 'Modifier' },
  { field: 'can_approve', label: 'Approuver' },
  { field: 'can_delete', label: 'Supprimer' },
];

const DEFAULT_LEVELS = { can_view: true, can_edit: false, can_approve: false, can_delete: false };

export default function CategoryPermissionsPanel({ categoryId }) {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjectType, setSubjectType] = useState('user');
  const [subjectId, setSubjectId] = useState('');
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [permsRes, usersRes, groupsRes] = await Promise.all([
        api.get(`/categories/${categoryId}/permissions`),
        api.get('/users'),
        api.get('/groups'),
      ]);
      setPermissions(permsRes.data);
      setUsers(usersRes.data);
      setGroups(groupsRes.data);
    } catch {
      setError("Impossible de charger les accès de cette catégorie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const subjectOptions = subjectType === 'user' ? users : groups;
  const alreadyAssignedIds = new Set(permissions.filter((p) => p.subject_type === subjectType).map((p) => p.subject_id));
  const availableSubjects = subjectOptions.filter((s) => !alreadyAssignedIds.has(s.id));

  async function handleGrant(event) {
    event.preventDefault();
    if (!subjectId) return;

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(`/categories/${categoryId}/permissions`, {
        subject_type: subjectType,
        subject_id: subjectId,
        ...levels,
      });
      const subject = subjectOptions.find((s) => s.id === subjectId);
      setPermissions((prev) => [...prev, { ...data, subject: { id: subject.id, name: subject.name, full_name: subject.full_name } }]);
      setSubjectId('');
      setLevels(DEFAULT_LEVELS);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'accorder cet accès.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLevel(permission, field) {
    const updated = { ...permission, [field]: !permission[field] };
    setPermissions((prev) => prev.map((p) => (p.id === permission.id ? updated : p)));

    try {
      await api.post(`/categories/${categoryId}/permissions`, {
        subject_type: permission.subject_type,
        subject_id: permission.subject_id,
        can_view: updated.can_view,
        can_edit: updated.can_edit,
        can_approve: updated.can_approve,
        can_delete: updated.can_delete,
      });
    } catch {
      setPermissions((prev) => prev.map((p) => (p.id === permission.id ? permission : p)));
      setError("Impossible de mettre à jour cet accès.");
    }
  }

  async function handleRevoke(permission) {
    try {
      await api.delete(`/categories/${categoryId}/permissions/${permission.id}`);
      setPermissions((prev) => prev.filter((p) => p.id !== permission.id));
    } catch {
      setError('Impossible de révoquer cet accès.');
    }
  }

  function subjectLabel(permission) {
    const name = permission.subject?.full_name || permission.subject?.name;
    if (name) return name;
    return permission.subject_type === 'user' ? 'Utilisateur supprimé' : 'Groupe supprimé';
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-md bg-slate-100" />;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {permissions.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun accès accordé pour l'instant.</p>
      ) : (
        <ul className="space-y-2">
          {permissions.map((permission) => (
            <li key={permission.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{subjectLabel(permission)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {permission.subject_type === 'user' ? 'Utilisateur' : 'Groupe'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(permission)}
                  aria-label="Révoquer l'accès"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {LEVELS.map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={permission[field]}
                      onChange={() => handleToggleLevel(permission, field)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleGrant} className="mt-3 space-y-2 border-t border-slate-200 pt-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={subjectType}
            onChange={(e) => {
              setSubjectType(e.target.value);
              setSubjectId('');
            }}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="user">Utilisateur</option>
            <option value="group">Groupe</option>
          </select>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Sélectionner...</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          {LEVELS.map(({ field, label }) => (
            <label key={field} className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={levels[field]}
                onChange={(e) => setLevels((prev) => ({ ...prev, [field]: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={!subjectId || saving}
          className="flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-50 disabled:opacity-50"
        >
          <UserPlus size={16} />
          Accorder l'accès
        </button>
      </form>
    </div>
  );
}
