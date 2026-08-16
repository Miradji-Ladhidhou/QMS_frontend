import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '../lib/api.js';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [addMemberValue, setAddMemberValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [groupsRes, usersRes] = await Promise.all([api.get('/groups'), api.get('/users')]);
      setGroups(groupsRes.data);
      setUsers(usersRes.data);
    } catch {
      setError('Impossible de charger les groupes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/groups', { name: newName.trim() });
      setGroups((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setCreating(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le groupe.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(group) {
    setEditingId(group.id);
    setEditName(group.name);
  }

  async function handleRename(event, groupId) {
    event.preventDefault();
    if (!editName.trim()) return;

    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/groups/${groupId}`, { name: editName.trim() });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...data } : g)));
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de renommer le groupe.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group) {
    if (!window.confirm(`Supprimer le groupe "${group.name}" ?`)) return;

    try {
      await api.delete(`/groups/${group.id}`);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch {
      setError('Impossible de supprimer ce groupe.');
    }
  }

  async function handleAddMember(groupId) {
    if (!addMemberValue) return;

    setSaving(true);
    setError('');
    try {
      await api.post(`/groups/${groupId}/members`, { user_id: addMemberValue });
      const addedUser = users.find((u) => u.id === addMemberValue);
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, members: [...g.members, addedUser].filter(Boolean) } : g))
      );
      setAddMemberValue('');
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter ce membre.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(groupId, userId) {
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, members: g.members.filter((m) => m.id !== userId) } : g))
      );
    } catch {
      setError('Impossible de retirer ce membre.');
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Groupes</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Utilisés pour accorder l'accès aux catégories de documents restreintes.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouveau groupe</span>
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom du groupe</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="RH, Direction..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName('');
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucun groupe pour l'instant.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {groups.map((group) => {
            const isExpanded = expandedId === group.id;
            const availableUsers = users.filter((u) => !group.members.some((m) => m.id === u.id));

            return (
              <li key={group.id} className="py-3">
                {editingId === group.id ? (
                  <form onSubmit={(e) => handleRename(e, group.id)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : group.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} className="shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="shrink-0 text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-800">{group.name}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {group.members.length} membre{group.members.length > 1 ? 's' : ''}
                      </span>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(group)}
                        aria-label="Renommer"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(group)}
                        aria-label="Supprimer"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    {group.members.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun membre pour l'instant.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.members.map((member) => (
                          <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-slate-700">{member.full_name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(group.id, member.id)}
                              aria-label={`Retirer ${member.full_name}`}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {availableUsers.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <select
                          value={addMemberValue}
                          onChange={(e) => setAddMemberValue(e.target.value)}
                          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Ajouter un membre...</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddMember(group.id)}
                          disabled={!addMemberValue || saving}
                          className="flex shrink-0 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-50 disabled:opacity-50"
                        >
                          <UserPlus size={16} />
                          Ajouter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
